// Descarga el catálogo de una tienda WooCommerce y genera productos.json + fotos en img/ + REVISAR.md.
// Uso:  node extraer.js              (todo el catálogo)
//       node extraer.js --sin-fotos  (solo datos)
// Muchos hostings bloquean las ráfagas: se espera entre peticiones y se usa un User-Agent de navegador.
const fs = require('fs');
const path = require('path');
const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const buildProduct = require('./catalogo').make(CFG);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(url, binary = false) {
  let last = '';
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: binary ? 'image/*' : 'application/json' } });
      if (r.ok) return binary ? Buffer.from(await r.arrayBuffer()) : r.json();
      last = `HTTP ${r.status}`;
    } catch (e) { last = e.cause ? e.cause.code || e.cause.message : e.message; }
    await sleep(4000);
  }
  throw new Error(`No se pudo descargar ${url} (${last}). Revisa "tienda.base" en config.json y que la tienda tenga la Store API de WooCommerce activa.`);
}

(async () => {
  if (/tutienda\.com/.test(CFG.tienda.base)) {
    console.error('config.json todavía apunta a la tienda de ejemplo (tutienda.com). Pon la URL de tu tienda en "tienda.base".');
    process.exit(1);
  }
  const sinFotos = process.argv.includes('--sin-fotos');
  const base = CFG.tienda.base.replace(/\/$/, '');
  const all = [];
  for (let page = 1; ; page++) {
    const batch = await get(`${base}/wp-json/wc/store/v1/products?per_page=100&page=${page}`);
    all.push(...batch);
    if (batch.length < 100) break;
    await sleep(3000);
  }
  fs.mkdirSync(path.join(__dirname, 'img'), { recursive: true });
  const productos = [];
  for (const p of all) {
    const prod = buildProduct(p);
    if (prod.foto_url && !sinFotos) {
      const ext = path.extname(new URL(prod.foto_url).pathname) || '.jpg';
      const rel = `img/${prod.id}${ext}`;
      const abs = path.join(__dirname, rel);
      if (!fs.existsSync(abs)) { fs.writeFileSync(abs, await get(prod.foto_url, true)); await sleep(1500); }
      prod.foto = rel;
    }
    productos.push(prod);
  }
  // Conserva ediciones manuales: un producto con "manual": true no se sobrescribe.
  // v2: conserva también el plan de variación de cada producto ya planificado (los precios cambian; el reel, no).
  const file = path.join(__dirname, 'productos.json');
  if (fs.existsSync(file)) {
    const prev = JSON.parse(fs.readFileSync(file, 'utf8')).productos || [];
    for (const old of prev) {
      const i = productos.findIndex(x => x.id === old.id);
      if (i < 0) continue;
      if (old.manual) productos[i] = old;
      else if (old.plan) productos[i].plan = old.plan;
    }
  }
  const t = CFG.tienda;
  const marca = { nombre: t.nombre, web: t.web, envio: t.envio, logo: t.logo, nota_cierre: t.nota_cierre, precio_nota: t.precio_nota,
    cinta_remate: t.cinta_remate, colores: t.colores_marca, etiquetas: CFG.etiquetas, ia: CFG.ia,
    titulo_datos: CFG.titulo_datos, textos: t.textos || {} };
  fs.writeFileSync(file, JSON.stringify({ _fecha: new Date().toISOString().slice(0, 10), marca, productos }, null, 2));
  const rev = productos.filter(p => p.revisar.length);
  fs.writeFileSync(path.join(__dirname, 'REVISAR.md'),
    `# Productos que conviene revisar antes de publicar (${rev.length} de ${productos.length})\n\n` +
    rev.map(p => `- **${p.modelo}** (\`${p.id}\`): ${p.revisar.join('; ')}`).join('\n') + '\n');
  const porGag = productos.reduce((a, p) => (a[p.gag] = (a[p.gag] || 0) + 1, a), {});
  console.log(`OK: ${productos.length} productos -> productos.json · ${rev.length} a revisar -> REVISAR.md`);
  console.log('Reparto por gag:', porGag);
  // v2: planifica la construcción de los reels nuevos sin tocar los ya planificados -> VARIACION.md
  require('./variar').main();
})().catch(e => { console.error(e.message); process.exit(1); });
