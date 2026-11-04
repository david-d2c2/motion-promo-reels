// Planificador de variación (v2): asigna a cada producto un plan de construcción distinto del de sus vecinos.
// El orden de productos.json es el ORDEN DE PUBLICACIÓN: el planificador evita que dos reels seguidos se parezcan.
//
//   node variar.js                       planifica los productos que aún no tienen plan (conserva el resto)
//   node variar.js --temporada 2027-01   temporada nueva: planes nuevos para todo el lote (para republicar)
//   node variar.js --rehacer             rehace todos los planes de la temporada actual
//   node variar.js --informe             solo escribe VARIACION.md, sin tocar los planes
//
// Un producto con "manual": true conserva su plan tal cual (puedes editarlo a mano en productos.json).
const fs = require('fs');
const path = require('path');
const V = require('./variacion');

const ROOT = __dirname;
const FILE = path.join(ROOT, 'productos.json');

function leerCfg() {
  const f = path.join(ROOT, 'config.json');
  return fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, 'utf8')).variacion || {}) : {};
}

function temporadaActual(productos, cfg) {
  const t = {};
  for (const p of productos) if (p.plan && p.plan.temporada) t[p.plan.temporada] = (t[p.plan.temporada] || 0) + 1;
  const masUsada = Object.entries(t).sort((a, b) => b[1] - a[1])[0];
  return (masUsada && masUsada[0]) || cfg.temporada || '1';
}

function escribirInforme(data, inf, temporada) {
  const pct = (v, n) => `${v} (${Math.round(100 * v / n)} %)`;
  const fila = p => {
    const q = p.plan;
    return `| ${p.modelo} | ${p.categoria} | ${q.orden.replace(/,/g, ' → ')} | ${q.hero} | ${q.rango} | ${q.datos} | ${q.precio} | ${q.trans} | ${q.tema} | ${q.entrada} | ${q.hook + 1}/${(p.hooks || [p.hook]).length} | ${q.musica.bpm} BPM · ${q.musica.timbre} |`;
  };
  const rep = Object.entries(inf.reparto).map(([k, o]) => `- **${k}**: ${Object.entries(o).sort((a, b) => b[1] - a[1]).map(([v, n]) => `${v} ${pct(n, inf.total)}`).join(' · ')}`).join('\n');
  const md = `# Variación del lote · temporada ${temporada}

Generado por \`node variar.js\`. El orden de la tabla es el orden de publicación.

- Reels: **${inf.total}** · combinaciones visuales distintas: **${inf.combinacionesVisuales}**
- Distancia entre reels consecutivos (0 = idénticos, ${inf.maximo} = no comparten nada): mínima **${inf.distanciaMinVecinos ?? '—'}**, media **${inf.distanciaMediaVecinos ?? '—'}**
- Parejas consecutivas con la misma construcción visual: **${inf.vecinosIguales}**

## Reparto por eje

${rep}

## Plan de cada reel

| Producto | Categoría | Orden | Producto (escena) | Surtido | Datos | Precio | Transición | Tema | Entrada | Gancho | Música |
|---|---|---|---|---|---|---|---|---|---|---|---|
${data.productos.map(fila).join('\n')}
`;
  fs.writeFileSync(path.join(ROOT, 'VARIACION.md'), md);
}

function main() {
  const args = process.argv.slice(2);
  const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const cfg = leerCfg();
  const i = args.indexOf('--temporada');
  const nueva = i >= 0 ? args[i + 1] : null;
  const temporada = nueva || temporadaActual(data.productos, cfg);
  const soloInforme = args.includes('--informe');

  // los productos "manual" se planifican igual (para contar en el historial) pero se restaura su plan
  const manuales = new Map(data.productos.filter(p => p.manual && p.plan).map(p => [p.id, p.plan]));
  let inf;
  if (soloInforme) {
    const hist = data.productos.map(p => Object.assign({}, p.plan || V.planBase(p), { _cat: p.categoria }));
    inf = V.informe(data.productos, hist);
  } else {
    inf = V.planificar(data.productos, data.marca.colores, cfg, { temporada, rehacer: args.includes('--rehacer') || !!nueva });
    for (const p of data.productos) if (manuales.has(p.id)) p.plan = manuales.get(p.id);
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  }
  escribirInforme(data, inf, temporada);
  console.log(`OK: ${inf.total} planes (temporada ${temporada}) · ${inf.combinacionesVisuales} combinaciones visuales · ` +
    `distancia mínima entre vecinos ${inf.distanciaMinVecinos}/${inf.maximo} · media ${inf.distanciaMediaVecinos} -> VARIACION.md`);
}

if (require.main === module) main();
module.exports = { main };
