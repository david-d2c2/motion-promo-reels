// Transforma un producto de la Store API de WooCommerce en la ficha que usa motor.html.
// Toda la lógica de negocio (categorías → gag, frases, atributos, marcas) vive en config.json.
// Funciona en Node (require) y en el navegador (window.buildProduct) para probarlo en la consola de la tienda.
(function (root) {
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const txt = h => (h || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const eur = c => (c / 100).toFixed(2).replace('.', ',') + ' €';
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  // Recorta sin dejar la frase colgando de una preposición o conjunción.
  const DANGLING = /\s(con|de|del|para|y|e|o|a|al|en|sin|el|la|los|las|un|una|que|por|tu|su)$/i;
  function shorten(s, max = 54) {
    s = s.replace(/\.$/, '').trim();
    if (s.length <= max) return s;
    const head = s.slice(0, max);
    const punct = head.search(/[,;:·–][^,;:·–]*$/);
    let cut = head.replace(/\s\S*$/, '');
    if (punct > 20) cut = head.slice(0, punct);
    else {
      const idx = Math.max(...['con', 'para', 'que', 'y'].map(w => cut.lastIndexOf(' ' + w + ' ')));
      if (idx > 20) cut = cut.slice(0, idx);
    }
    while (DANGLING.test(cut)) cut = cut.replace(DANGLING, '');
    return cut.trim();
  }

  function make(cfg) {
    const stripBrands = s => (cfg.marcas_a_quitar || []).reduce((a, b) => a.replace(new RegExp('\\s*\\b' + esc(b) + '\\b', 'gi'), ''), s).replace(/\s{2,}/g, ' ').trim();
    const fill = (t, d) => t.replace(/\{vmin\}/g, d.variantes[0] || '').replace(/\{vmax\}/g, d.variantes[d.variantes.length - 1] || '')
      .replace(/\{rmin\}/g, d.rango[0] || '').replace(/\{rmax\}/g, d.rango[d.rango.length - 1] || '').replace(/\{modelo\}/g, d.modelo);
    // una frase puede ser texto fijo o condicional: {si: regex sobre la descripción | si_variantes: n mínimo, texto, sino}
    const phrase = (f, d) => {
      if (typeof f === 'string') return fill(f, d);
      const ok = f.si_variantes != null ? d.variantes.length >= f.si_variantes : new RegExp(f.si, 'i').test(d.desc);
      return fill(ok ? f.texto : (f.sino || ''), d);
    };

    return function buildProduct(p, opts = {}) {
      const A = cfg.atributos;
      const attr = n => (p.attributes.find(a => a.name.toLowerCase() === (n || '').toLowerCase()) || { terms: [] }).terms.map(t => t.name);
      const rangoRaw = attr(A.rango);
      const num = rangoRaw.every(x => !isNaN(Number(x)));
      const rango = num ? rangoRaw.map(Number).sort((a, b) => a - b) : rangoRaw;
      const variantes = attr(A.variantes).sort();
      const colores = attr(A.colores);
      const material = attr(A.material);
      const cats = p.categories.map(c => c.name);
      const rule = cfg.categorias.find(r => cats.includes(r.nombre)) || cfg.categorias.find(r => r.nombre === '*');
      const desc = txt(p.description), short = txt(p.short_description);

      // datos: viñetas bajo el título configurado -> frases de la descripción corta -> material
      const datos = [];
      const re = new RegExp(esc(cfg.titulo_datos) + '<\\/h\\d>\\s*<ul>([\\s\\S]*?)<\\/ul>', 'i');
      const m = (p.description || '').match(re);
      if (m) for (const li of m[1].match(/<li>[\s\S]*?<\/li>/gi) || []) {
        const t = stripBrands(txt(li));
        if (!/^composici/i.test(t)) datos.push(shorten(cap(t)));
      }
      if (datos.length < 2 && short) {
        for (const part of stripBrands(short).split(/[.:]/).map(x => x.trim()).filter(x => x.length > 8 && !/^(composici|tallas? \d|colores)/i.test(x)).slice(0, 2))
          datos.push(shorten(cap(part)));
      }
      if (material.length) datos.push(shorten('Composición: ' + material.map(x => (x === x.toUpperCase() ? x : x.toLowerCase())).join(', ').replace(/,([^,]*)$/, ' y$1')));

      const tipos = (cfg.palabras_tipo || []).map(esc).join('|');
      let modelo = stripBrands(p.name);
      if (tipos) modelo = modelo.replace(new RegExp('^(' + tipos + ')\\s+', 'i'), '').trim();
      if (!/[a-záéíóúñ]{3,}/i.test(modelo) || /\d/.test(modelo)) modelo = stripBrands(p.name);
      const range = p.prices.price_range;
      const desde = !!range && range.min_amount !== range.max_amount;

      const d = { desc, variantes, rango, modelo };
      const out = {
        id: p.slug,
        woo_id: p.id,
        url: p.permalink,
        modelo,
        categoria: rule.nombre === '*' ? (cats[0] || '') : rule.nombre,
        gag: rule.gag,
        hook: rule.frases.map(f => phrase(f, d)).filter(Boolean),
        rango: rango.length ? rango : [],
        variantes,
        colores,
        datos: [...new Set(datos)].filter(Boolean).slice(0, 3),
        precio: eur(desde ? range.min_amount : p.prices.price),
        desde,
        precio_antes: p.on_sale && !desde ? eur(p.prices.regular_price) : null,
        foto: opts.foto || null,
        foto_url: (p.images[0] || {}).src || null,
        revisar: [],
      };
      if (rule.sensible) out.revisar.push('Tema sensible: revisar el tono antes de publicar');
      if (!m) out.revisar.push(`Sin «${cfg.titulo_datos}»: datos de la descripción corta y atributos`);
      if (!out.foto_url) out.revisar.push('Sin foto');
      if (!out.rango.length) out.revisar.push(`Sin atributo «${A.rango}»`);
      return out;
    };
  }

  if (typeof module !== 'undefined') module.exports = { make };
  else root.makeBuildProduct = make;
})(typeof window !== 'undefined' ? window : globalThis);
