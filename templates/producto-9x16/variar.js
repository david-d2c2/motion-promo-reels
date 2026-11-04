// Planificador de variación (v2). Archivo COMÚN a las tres plantillas; cada una declara su perfil en package.json
// ("perfilVariacion": "catalogo" | "producto" | "persona").
//
// Catálogo y producto (planes en productos.json; el orden del archivo es el ORDEN DE PUBLICACIÓN):
//   node variar.js                       planifica los productos que aún no tienen plan (conserva el resto)
//   node variar.js --temporada 2027-01   temporada nueva: planes nuevos para todo el lote (para republicar)
//   node variar.js --rehacer             rehace todos los planes de la temporada actual
//   node variar.js --informe             solo escribe VARIACION.md, sin tocar los planes
//   Un producto con "manual": true conserva su plan tal cual (puedes editarlo a mano).
//
// Persona (versiones del mismo vídeo en versiones.json):
//   node variar.js 3                     versiones A, B y C, lo más distintas posible entre sí
//   node variar.js 3 --temporada 2027-01 otras tres versiones distintas
//   Luego: node render.js video promo_B.mp4 --version B
const fs = require('fs');
const path = require('path');
const V = require('./variacion');

const ROOT = __dirname;
const PERFIL = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).perfilVariacion || 'catalogo';
const VP = V.perfil(PERFIL);

// restricciones de la marca: variacion.json (cualquier plantilla) > bloque "variacion" de config.json o productos.json
function leerCfg() {
  const v = path.join(ROOT, 'variacion.json');
  if (fs.existsSync(v)) return JSON.parse(fs.readFileSync(v, 'utf8'));
  const f = path.join(ROOT, 'config.json');
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8')).variacion || {};
  const g = path.join(ROOT, 'productos.json');
  if (fs.existsSync(g)) return JSON.parse(fs.readFileSync(g, 'utf8')).variacion || {};
  return {};
}

function temporadaActual(items, cfg) {
  const t = {};
  for (const p of items) if (p.plan && p.plan.temporada) t[p.plan.temporada] = (t[p.plan.temporada] || 0) + 1;
  const masUsada = Object.entries(t).sort((a, b) => b[1] - a[1])[0];
  return (masUsada && masUsada[0]) || cfg.temporada || '1';
}

function escribirInforme(items, inf, temporada, nombreDe) {
  const pct = (v, n) => `${v} (${Math.round(100 * v / n)} %)`;
  const ejes = VP.P.visuales.filter(k => k !== 'alin');
  const cab = ['Vídeo', ...ejes, ...('hook' in VP.P.pesos ? ['gancho'] : []), 'música'];
  const fila = p => {
    const q = p.plan, mu = q.musica || {};
    const celdas = [nombreDe(p), ...ejes.map(k => k === 'orden' ? q.orden.replace(/,/g, ' → ') : q[k])];
    if ('hook' in VP.P.pesos) celdas.push(`${q.hook + 1}/${(p.hooks || [p.hook]).length}`);
    celdas.push(VP.MUSICA.map(k => k === 'bpm' ? mu.bpm + ' BPM' : k === 'prog' ? 'prog ' + mu.prog : k === 'tono' ? 'tono ' + (mu.tono > 0 ? '+' : '') + mu.tono : mu[k]).join(' · '));
    return '| ' + celdas.join(' | ') + ' |';
  };
  const rep = Object.entries(inf.reparto).map(([k, o]) => `- **${k}**: ${Object.entries(o).sort((a, b) => b[1] - a[1]).map(([v, n]) => `${v} ${pct(n, inf.total)}`).join(' · ')}`).join('\n');
  const md = `# Variación · ${PERFIL} · temporada ${temporada}

Generado por \`node variar.js\`. ${PERFIL === 'persona' ? 'Cada fila es una versión del mismo vídeo.' : 'El orden de la tabla es el orden de publicación.'}

- Vídeos: **${inf.total}** · combinaciones visuales distintas: **${inf.combinacionesVisuales}**
- Distancia entre vídeos consecutivos (0 = idénticos, ${inf.maximo} = no comparten nada): mínima **${inf.distanciaMinVecinos ?? '—'}**, media **${inf.distanciaMediaVecinos ?? '—'}**
- Parejas consecutivas con la misma construcción visual: **${inf.vecinosIguales}**

## Reparto por eje

${rep}

## Plan de cada vídeo

| ${cab.join(' | ')} |
|${cab.map(() => '---').join('|')}|
${items.map(fila).join('\n')}
`;
  fs.writeFileSync(path.join(ROOT, 'VARIACION.md'), md);
}

function mainPersona(args, cfg) {
  const n = Math.max(1, Math.min(26, parseInt(args.find(a => /^\d+$/.test(a)) || '3', 10)));
  const i = args.indexOf('--temporada');
  const temporada = i >= 0 ? args[i + 1] : (cfg.temporada || '1');
  const items = Array.from({ length: n }, (_, k) => ({ id: String.fromCharCode(65 + k) }));
  // con pocas versiones, todas se comparan con todas: la ventana cubre el lote entero
  const inf = VP.planificar(items, null, Object.assign({ ventana: n }, cfg), { temporada, rehacer: true });
  const out = { _comentario: 'Versiones del vídeo generadas por node variar.js. Renderiza una con: node render.js video promo_A.mp4 --version A', temporada, versiones: {} };
  for (const it of items) out.versiones[it.id] = it.plan;
  fs.writeFileSync(path.join(ROOT, 'versiones.json'), JSON.stringify(out, null, 2));
  escribirInforme(items, inf, temporada, it => 'Versión ' + it.id);
  console.log(`OK: ${n} versiones (temporada ${temporada}) -> versiones.json · distancia mínima ${inf.distanciaMinVecinos}/${inf.maximo} -> VARIACION.md`);
}

function main() {
  const args = process.argv.slice(2);
  const cfg = leerCfg();
  if (PERFIL === 'persona') return mainPersona(args, cfg);
  const FILE = path.join(ROOT, 'productos.json');
  const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const i = args.indexOf('--temporada');
  const nueva = i >= 0 ? args[i + 1] : null;
  const temporada = nueva || temporadaActual(data.productos, cfg);
  const nombreDe = p => p.modelo || (Array.isArray(p.nombre) ? p.nombre.join(' ') : p.nombre) || p.id;
  let inf;
  if (args.includes('--informe')) inf = VP.informe(data.productos);
  else {
    // los productos "manual" se planifican igual (cuentan en el historial) pero se restaura su plan
    const manuales = new Map(data.productos.filter(p => p.manual && p.plan).map(p => [p.id, p.plan]));
    inf = VP.planificar(data.productos, (data.marca || {}).colores, cfg, { temporada, rehacer: args.includes('--rehacer') || !!nueva });
    for (const p of data.productos) if (manuales.has(p.id)) p.plan = manuales.get(p.id);
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
  }
  escribirInforme(data.productos, inf, temporada, nombreDe);
  console.log(`OK: ${inf.total} planes (${PERFIL}, temporada ${temporada}) · ${inf.combinacionesVisuales} combinaciones visuales · ` +
    `distancia mínima entre vecinos ${inf.distanciaMinVecinos}/${inf.maximo} · media ${inf.distanciaMediaVecinos} -> VARIACION.md`);
}

if (require.main === module) main();
module.exports = { main };
