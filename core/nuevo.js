#!/usr/bin/env node
// Crea un proyecto de vídeo a partir de una plantilla, o actualiza el motor de uno que ya existe.
//
//   node core/nuevo.js catalogo  ruta/al/proyecto     -> plantilla + motor común, listo para npm install
//   node core/nuevo.js producto  ruta/al/proyecto
//   node core/nuevo.js persona   ruta/al/proyecto
//   node core/nuevo.js --actualizar ruta/al/proyecto  -> sustituye SOLO los archivos del motor común
//   node core/nuevo.js --actualizar ruta --forzar     -> también los que hayas editado a mano
//   node core/nuevo.js --dev                          -> copia el motor dentro de templates/ (para trabajar en el repo)
//
// Desde v3.3 los scripts comunes viven una sola vez en core/ (comun/ para las tres plantillas, 9x16/ para las
// dos verticales). Cada proyecto recibe su propia copia: así sigue funcionando aunque muevas la carpeta o
// actualices la skill, y motor.html puede cargar variacion.js con una ruta relativa.
// En el proyecto queda .motor.json con la versión y una huella de cada archivo del motor; --actualizar la usa
// para no pisar archivos que hayas cambiado tú (te avisa y los deja como están).
// Tus datos (productos.json, config.json, locucion.json, versiones.json, anim.html, img/, out/…) no se tocan nunca.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CORE = __dirname;
const SKILL = path.resolve(CORE, '..');
const VERSION = fs.readFileSync(path.join(CORE, 'VERSION'), 'utf8').trim();
const PLANTILLAS = {
  catalogo: { dir: 'catalogo-9x16', grupos: ['comun', '9x16'] },
  producto: { dir: 'producto-9x16', grupos: ['comun', '9x16'] },
  persona: { dir: 'persona-16x9', grupos: ['comun'] },
};
const NO_COPIAR = new Set(['node_modules', 'out', 'stills', '__pycache__', 'VARIACION.md', 'REVISAR.md', '.motor.json']);

const huella = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 16);
const motor = nombre => PLANTILLAS[nombre].grupos.flatMap(g =>
  fs.readdirSync(path.join(CORE, g)).filter(f => !f.startsWith('.') && fs.statSync(path.join(CORE, g, f)).isFile()).map(f => ({ f, src: path.join(CORE, g, f) })));

function plantilla(arg) {
  const k = Object.keys(PLANTILLAS).find(n => n === arg || PLANTILLAS[n].dir === arg);
  if (!k) fallo(`Plantilla desconocida: ${arg || '(ninguna)'}. Usa catalogo, producto o persona.`);
  return k;
}
function fallo(msg) { console.error(msg); process.exit(1); }

function escribirMarca(dest, nombre, archivos) {
  const prev = leerMarca(dest) || {};
  const m = { version: VERSION, plantilla: nombre, archivos: Object.assign({}, prev.archivos) };
  for (const f of archivos) m.archivos[f] = huella(path.join(dest, f));
  fs.writeFileSync(path.join(dest, '.motor.json'), JSON.stringify(m, null, 2) + '\n');
}
function leerMarca(dest) {
  try { return JSON.parse(fs.readFileSync(path.join(dest, '.motor.json'), 'utf8')); } catch { return null; }
}

function crear(nombre, dest) {
  dest = path.resolve(dest);
  if (fs.existsSync(dest) && fs.readdirSync(dest).length) fallo(`${dest} ya existe y no está vacía. Elige otra carpeta (o usa --actualizar para un proyecto que ya tienes).`);
  const src = path.join(SKILL, 'templates', PLANTILLAS[nombre].dir);
  fs.cpSync(src, dest, { recursive: true, filter: s => !NO_COPIAR.has(path.basename(s)) });
  const archivos = motor(nombre);
  for (const { f, src: s } of archivos) fs.copyFileSync(s, path.join(dest, f));
  escribirMarca(dest, nombre, archivos.map(a => a.f));
  console.log(`OK: proyecto «${nombre}» (motor v${VERSION}) en ${dest}`);
  console.log(`Siguiente: cd "${dest}" && npm install`);
}

function actualizar(dest, forzar) {
  dest = path.resolve(dest);
  let pkg; try { pkg = JSON.parse(fs.readFileSync(path.join(dest, 'package.json'), 'utf8')); } catch { fallo(`${dest} no parece un proyecto de esta skill (no hay package.json).`); }
  const marca = leerMarca(dest);
  if (!marca && !pkg.perfilVariacion) fallo(`${dest} es un proyecto de v1 (su package.json no declara "perfilVariacion"): su motor.html y su audio.py
son anteriores al motor común y no se pueden actualizar pieza a pieza. Crea un proyecto nuevo en otra carpeta
(node core/nuevo.js catalogo|producto|persona <carpeta-nueva>) y pasa tus datos: productos.json, config.json, img/.
No se ha tocado nada.`);
  const nombre = (marca && marca.plantilla) || plantilla(pkg.perfilVariacion);
  const cambiados = [], iguales = [], respetados = [];
  for (const { f, src } of motor(nombre)) {
    const d = path.join(dest, f);
    if (fs.existsSync(d)) {
      if (huella(d) === huella(src)) { iguales.push(f); continue; }
      // sin .motor.json (proyectos de v3.2 o anteriores) no sabemos si lo editaste: se actualiza, como hacía copiar a mano
      const editado = marca && marca.archivos && marca.archivos[f] && marca.archivos[f] !== huella(d);
      if (editado && !forzar) { respetados.push(f); continue; }
    }
    fs.copyFileSync(src, d); cambiados.push(f);
  }
  escribirMarca(dest, nombre, [...cambiados, ...iguales]);
  console.log(`Motor de «${nombre}» en ${dest}: v${(marca && marca.version) || '≤3.2'} -> v${VERSION}`);
  console.log(`  actualizados: ${cambiados.join(', ') || 'ninguno'}`);
  if (respetados.length) console.log(`  SIN TOCAR porque los has editado: ${respetados.join(', ')} (repite con --forzar para sustituirlos)`);
  console.log('Tus datos no se han tocado. Si venías de v2 o anterior: node variar.js --rehacer');
}

function dev() {
  for (const nombre of Object.keys(PLANTILLAS)) {
    const dest = path.join(SKILL, 'templates', PLANTILLAS[nombre].dir);
    for (const { f, src } of motor(nombre)) fs.copyFileSync(src, path.join(dest, f));
  }
  console.log('OK: motor copiado en templates/* (son copias ignoradas por git: edita siempre core/)');
}

const a = process.argv.slice(2);
if (!a.length || a.includes('-h') || a.includes('--help')) {
  console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 9).map(l => l.replace(/^\/\/ ?/, '')).join('\n'));
} else if (a[0] === '--actualizar') {
  if (!a[1]) fallo('Falta la carpeta del proyecto: node core/nuevo.js --actualizar ruta/al/proyecto');
  actualizar(a[1], a.includes('--forzar'));
} else if (a[0] === '--dev') dev();
else {
  if (!a[1]) fallo(`Falta la carpeta de destino: node core/nuevo.js ${a[0]} ruta/al/proyecto`);
  crear(plantilla(a[0]), a[1]);
}
