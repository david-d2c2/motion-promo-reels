// Variación de reels (v2). Un único módulo compartido por:
//   - motor.html   (navegador: window.VAR) -> tema de color, línea de tiempo y plan por defecto
//   - variar.js    (Node)                  -> planificador del lote con anti-repetición
//   - extraer.js   (Node)                  -> planifica los productos nuevos tras cada extracción
// audio.py no recalcula nada: lee plan.tiempos y plan.musica de productos.json.
//
// Idea: cada producto lleva un "plan" (orden de escenas, layout de cada escena, transición, tema, entrada del
// texto, variante del gancho y música). El plan se elige con una semilla (id + temporada) y se compara con los
// planes de los productos que se publican justo antes, para que dos reels vecinos no se parezcan.
(function (root) {
  // ---------------------------------------------------------------- catálogo de opciones
  const OPCIONES = {
    orden: ['rango,datos,precio', 'rango,precio,datos', 'datos,rango,precio', 'datos,precio,rango', 'precio,rango,datos', 'precio,datos,rango'],
    hero: ['tarjeta', 'difuso', 'arco'],
    rango: ['pildoras', 'regla', 'rejilla'],
    datos: ['lista', 'numerada', 'apiladas'],
    precio: ['grande', 'sello', 'etiqueta'],
    trans: ['barrido', 'empuje', 'iris', 'diagonal', 'persiana', 'zoom'],
    tema: ['claro', 'oscuro', 'acento'],
    entrada: ['subir', 'mascara', 'letras'],
    alin: ['centro', 'izquierda'],
    prog: [0, 1, 2, 3],
    tono: [-2, 0, 2, 3],
    bpm: [90, 96, 102, 108],
    timbre: ['piano', 'celesta', 'pizzicato'],
    patron: ['corcheas', 'alberti', 'saltos'],
  };
  // Carril tranquilo para categorías sensibles (gag "calma"): nada brusco.
  const CALMA = { trans: ['fundido', 'barrido', 'zoom'], tema: ['claro'], entrada: ['subir', 'mascara'], bpm: [84, 90], timbre: ['piano', 'celesta'], patron: ['corcheas', 'saltos'] };
  // Gags cuyo dibujo está centrado: el texto también va centrado.
  const ALINEABLES = ['texto', 'calma', 'patron'];
  // Cuánto "se nota" cada eje al ver dos reels seguidos. El gancho solo cuenta si la categoría coincide.
  const PESOS = { orden: 2, hero: 3, rango: 1.5, datos: 1.5, precio: 1.5, trans: 2.5, tema: 3, entrada: 1, alin: 1, hook: 3, prog: 1, tono: 0.5, bpm: 0.5, timbre: 1, patron: 0.75 };
  const DUR = { hook: 3.0, hero: 2.8, rango: 3.0, datos: 2.6, precio: 1.8, outro: 2.3 }; // total 15,5 s

  // ---------------------------------------------------------------- utilidades
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

  // ---------------------------------------------------------------- color y contraste (WCAG 2.x)
  const hex2rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
  const rgb2hex = c => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, k) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A.map((v, i) => v + (B[i] - v) * k)); };
  const lum = h => { const [r, g, b] = hex2rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const mejor = (bg, cands) => cands.slice().sort((a, b) => contraste(b, bg) - contraste(a, bg))[0];
  // el primero de la lista (orden de preferencia de marca) que llegue al contraste mínimo; si ninguno, el mejor
  const primero = (bg, cands, min) => cands.find(c => contraste(c, bg) >= min) || mejor(bg, cands);

  const BASE = { fondo: '#F8ECE8', fondo_cierre: '#FBF6F2', tinta: '#0A0A0A', texto: '#2B2B2B', acento: '#8C6A4F', acento_suave: '#B89878' };
  // Tokens semánticos que usa el motor:
  //   bg fondo de escena · fg texto principal · fg2 texto secundario · acc acento (títulos, trazos)
  //   acc2 acento suave (decoración) · onFg texto sobre relleno fg · onAcc texto sobre relleno acc · card marco de foto
  function tema(colores, nombre) {
    const k = Object.assign({}, BASE, colores || {});
    let t;
    if (nombre === 'oscuro') {
      const bg = mix(k.tinta, k.acento, 0.10);
      const acc = primero(bg, [k.acento_suave, mix(k.acento_suave, k.fondo_cierre, 0.4), k.fondo], 3);
      t = { bg, fg: k.fondo_cierre, fg2: mix(k.fondo_cierre, bg, 0.22), acc, acc2: mix(k.acento, k.fondo_cierre, 0.25), onFg: k.tinta };
    } else if (nombre === 'acento') {
      const bg = k.acento, fg = mejor(bg, [k.fondo_cierre, k.tinta]);
      const acc = primero(bg, [k.tinta, k.fondo_cierre, k.fondo].filter(c => c !== fg), 3);
      t = { bg, fg, fg2: mix(fg, bg, 0.15), acc, acc2: mix(fg, bg, 0.45), onFg: bg };
    } else {
      t = { bg: k.fondo, fg: k.tinta, fg2: k.texto, acc: k.acento, acc2: k.acento_suave, onFg: '#FFFFFF' };
    }
    t.nombre = nombre || 'claro';
    t.cierre = k.fondo_cierre;      // el cierre de marca no cambia de tema: es la firma
    t.cierreTexto = k.texto; t.cierreTinta = k.tinta; t.cierreAcc = k.acento;
    t.card = '#FFFFFF';
    t.onAcc = mejor(t.acc, [t.bg, k.fondo_cierre, k.tinta]);
    t.ok = contraste(t.fg, t.bg) >= 4.5 && contraste(t.acc, t.bg) >= 3; // si no llega, el planificador no lo usa
    return t;
  }

  // ---------------------------------------------------------------- línea de tiempo
  function tiempos(orden) {
    const escenas = ['hook', 'hero', ...orden.split(','), 'outro'];
    let a = 0;
    return escenas.map(n => { const s = { n, a: +a.toFixed(2), b: +(a + DUR[n]).toFixed(2) }; a += DUR[n]; return s; });
  }

  // Plan equivalente a la v1 (se usa cuando un producto no trae plan).
  function planBase(p) {
    return { v: 2, base: true, orden: 'rango,datos,precio', hero: 'tarjeta', rango: 'pildoras', datos: 'lista', precio: 'grande',
      trans: 'barrido', tema: 'claro', entrada: 'subir', alin: 'centro', hook: 0,
      musica: { prog: 0, tono: 0, bpm: 96, timbre: 'piano', patron: 'corcheas' }, tiempos: tiempos('rango,datos,precio') };
  }

  // ---------------------------------------------------------------- distancia entre dos planes
  function distancia(a, b) {
    let d = 0;
    for (const k of ['orden', 'hero', 'rango', 'datos', 'precio', 'trans', 'tema', 'entrada', 'alin']) if (a[k] !== b[k]) d += PESOS[k];
    for (const k of ['prog', 'tono', 'bpm', 'timbre', 'patron']) if (a.musica[k] !== b.musica[k]) d += PESOS[k];
    if (a._cat !== b._cat || a.hook !== b.hook) d += PESOS.hook;
    return d;
  }
  const MAXD = Object.values(PESOS).reduce((s, v) => s + v, 0);

  // ---------------------------------------------------------------- planificador del lote
  // productos: en ORDEN DE PUBLICACIÓN. Conserva los planes de la misma temporada salvo opts.rehacer.
  function planificar(productos, colores, cfg = {}, opts = {}) {
    const temporada = String(opts.temporada || cfg.temporada || '1');
    const ventana = cfg.ventana || 12, intentos = cfg.intentos || 400;
    const ops = {};
    for (const k in OPCIONES) ops[k] = (cfg[k] || OPCIONES[k]).slice();
    ops.tema = ops.tema.filter(n => tema(colores, n).ok);
    if (!ops.tema.length) ops.tema = ['claro'];
    const uso = {}; const cuenta = (k, v) => { uso[k] = uso[k] || {}; uso[k][v] = (uso[k][v] || 0) + 1; };
    const hist = [];
    let n = 0;
    // El gancho no se sortea: rota por turnos DENTRO de cada categoría (con un desfase por temporada),
    // así dos productos de la misma categoría no repiten texto aunque se publiquen lejos.
    const turno = {};

    for (const p of productos) {
      const calma = p.gag === 'calma';
      const nHooks = (p.hooks && p.hooks.length) || 1;
      let plan = p.plan;
      const conservar = plan && plan.v === 2 && !plan.base && plan.temporada === temporada && !opts.rehacer;
      if (!conservar) {
        const r = rng(hash(temporada + '|' + p.id));
        // carril tranquilo: opciones de CALMA que la marca no haya excluido (el fundido siempre vale)
        const op = k => {
          if (!(calma && CALMA[k])) return ops[k];
          const f = CALMA[k].filter(v => !cfg[k] || cfg[k].includes(v) || v === 'fundido');
          return f.length ? f : CALMA[k];
        };
        const temasOk = op('tema').filter(t => ops.tema.includes(t));
        let best = null, bestS = -Infinity;
        for (let i = 0; i < intentos; i++) {
          const orden = pick(r, ops.orden);
          const c = {
            v: 2, temporada, orden, hero: pick(r, ops.hero), rango: pick(r, ops.rango), datos: pick(r, ops.datos), precio: pick(r, ops.precio),
            trans: pick(r, op('trans')), tema: pick(r, temasOk.length ? temasOk : ['claro']),
            entrada: pick(r, op('entrada')), alin: ALINEABLES.includes(p.gag) ? pick(r, ops.alin) : 'centro',
            hook: (hash(temporada + '|' + p.categoria) + (turno[p.categoria] || 0)) % nHooks,
            musica: { prog: pick(r, ops.prog), tono: pick(r, ops.tono), bpm: pick(r, op('bpm')), timbre: pick(r, op('timbre')), patron: pick(r, op('patron')) },
            _cat: p.categoria,
          };
          // 1) que se parezca lo menos posible a los vecinos (más peso a los más cercanos)
          const prev = hist.slice(-ventana);
          let minCerca = MAXD, media = 0, wsum = 0;
          prev.forEach((h, j) => { const age = prev.length - j; const d = distancia(c, h); if (age <= 4) minCerca = Math.min(minCerca, d); const w = 1 / age; media += w * d; wsum += w; });
          media = wsum ? media / wsum : MAXD;
          // 2) que cada opción se use de forma equilibrada en todo el lote
          let desequilibrio = 0;
          if (n) for (const k of ['hero', 'rango', 'datos', 'precio', 'trans', 'tema', 'orden']) desequilibrio += ((uso[k] && uso[k][c[k]]) || 0) / n;
          const s = 2 * minCerca + media - 3 * desequilibrio + r() * 0.01;
          if (s > bestS) { bestS = s; best = c; }
        }
        plan = best;
        plan.tiempos = tiempos(plan.orden);
      }
      plan._cat = p.categoria;
      turno[p.categoria] = (turno[p.categoria] || 0) + 1;
      for (const k of ['hero', 'rango', 'datos', 'precio', 'trans', 'tema', 'orden']) cuenta(k, plan[k]);
      hist.push(plan); n++;
      const limpio = Object.assign({}, plan); delete limpio._cat;
      p.plan = limpio;
    }
    return informe(productos, hist);
  }

  // ---------------------------------------------------------------- informe del lote
  function informe(productos, hist) {
    const ejes = ['orden', 'hero', 'rango', 'datos', 'precio', 'trans', 'tema', 'entrada'];
    const reparto = {};
    for (const k of ejes) { reparto[k] = {}; for (const h of hist) reparto[k][h[k]] = (reparto[k][h[k]] || 0) + 1; }
    const firmas = new Set(hist.map(h => ejes.map(k => h[k]).join('|')));
    let minVecino = Infinity, sumaVecino = 0, iguales = 0;
    for (let i = 1; i < hist.length; i++) {
      const d = distancia(hist[i], hist[i - 1]); minVecino = Math.min(minVecino, d); sumaVecino += d;
      if (ejes.every(k => hist[i][k] === hist[i - 1][k])) iguales++;
    }
    return { total: hist.length, combinacionesVisuales: firmas.size, distanciaMinVecinos: hist.length > 1 ? minVecino : null,
      distanciaMediaVecinos: hist.length > 1 ? +(sumaVecino / (hist.length - 1)).toFixed(2) : null, maximo: MAXD, vecinosIguales: iguales, reparto };
  }

  const api = { OPCIONES, CALMA, PESOS, DUR, hash, rng, mix, contraste, tema, tiempos, planBase, distancia, planificar, informe };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.VAR = api;
})(typeof window !== 'undefined' ? window : globalThis);
