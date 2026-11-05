// Comprobación (v3). Archivo COMÚN a las tres plantillas.
//   node comprobar.js            entorno (Node, ffmpeg, Python, Chrome, dependencias) + datos
//   node comprobar.js --datos    solo los datos (render.js lo hace solo antes de renderizar)
// Cada problema dice DÓNDE está, QUÉ pasa y CÓMO se arregla, para que cualquier persona o modelo pueda corregirlo
// sin adivinar. Sale con código 1 si hay errores; los avisos no paran nada.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = __dirname;
const leer = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const existe = f => fs.existsSync(path.join(ROOT, f));
const PERFIL = (() => { try { return leer('package.json').perfilVariacion || 'catalogo'; } catch { return 'catalogo'; } })();

function nuevo() {
  const errores = [], avisos = [];
  return {
    errores, avisos,
    error: (donde, que, como) => errores.push(`${donde}: ${que}${como ? ' → ' + como : ''}`),
    aviso: (donde, que, como) => avisos.push(`${donde}: ${que}${como ? ' → ' + como : ''}`),
  };
}

function jsonValido(R, f) {
  if (!existe(f)) return null;
  try { return leer(f); } catch (e) {
    R.error(f, `no es JSON válido (${e.message.split('\n')[0]})`, 'revisa comas finales, comillas rectas "..." y llaves; puedes validarlo con: node -e "JSON.parse(require(\'fs\').readFileSync(\'' + f + '\',\'utf8\'))"');
    return undefined;
  }
}

const esTexto = v => typeof v === 'string' && v.trim().length > 0;
const listaTextos = v => Array.isArray(v) && v.every(esTexto);
const HEX = /^#[0-9a-f]{6}$/i;

// ---------------------------------------------------------------- productos (catálogo y producto)
const GAGS = {
  catalogo: ['quitar', 'secuencia', 'cortar', 'elevar', 'ritmo', 'reordenar', 'patron', 'calma', 'texto'],
  producto: ['contador', 'invisible', 'diagonal', 'brillo'],
};

function comprobarProductos(R, D) {
  if (!D) return;
  if (!D.marca) R.error('productos.json', 'falta el bloque "marca"', 'copia el de la plantilla y cambia los valores');
  else {
    if (!esTexto(D.marca.nombre)) R.error('productos.json → marca', 'falta "nombre"');
    if (!esTexto(D.marca.web)) R.error('productos.json → marca', 'falta "web"', 'el dominio que sale en la píldora del cierre, p. ej. "tutienda.com"');
    for (const [k, v] of Object.entries(D.marca.colores || {})) if (!HEX.test(v)) R.error('productos.json → marca.colores.' + k, `"${v}" no es un color #RRGGBB`, 'usa seis cifras hexadecimales, p. ej. "#8C6A4F"');
  }
  if (!Array.isArray(D.productos) || !D.productos.length) { R.error('productos.json', 'no hay "productos"', 'añade al menos uno (mira el ejemplo de la plantilla)'); return; }
  const ids = new Set();
  D.productos.forEach((p, i) => {
    const w = `productos.json → productos[${i}]${p && p.id ? ` ("${p.id}")` : ''}`;
    if (!p || typeof p !== 'object') return R.error(w, 'no es un objeto');
    if (!esTexto(p.id) || !/^[a-z0-9-]+$/.test(p.id)) R.error(w, '"id" falta o no es válido', 'solo minúsculas, números y guiones; se usa para el nombre del vídeo');
    else if (ids.has(p.id)) R.error(w, `"id" repetido`, 'cada producto necesita un id distinto'); else ids.add(p.id);
    if (!esTexto(p.precio) || !/\d/.test(p.precio)) R.error(w, '"precio" falta o no lleva cifras', 'texto tal cual sale en la ficha, p. ej. "39,90 €"');
    if (!listaTextos(p.hook) || !p.hook.length) R.error(w, '"hook" tiene que ser una lista de 1 a 3 frases', 'p. ej. ["Este reel va al bies.", "Como esta cinta.", "Ni una línea recta."]');
    else {
      if (p.hook.length > 3) R.aviso(w, `"hook" tiene ${p.hook.length} frases y solo se muestran 3`);
      p.hook.forEach(h => { if (h.length > 40) R.aviso(w, `la frase «${h}» tiene ${h.length} caracteres: saldrá con letra pequeña`, 'mejor 34 o menos'); });
    }
    if (p.hooks !== undefined && !(Array.isArray(p.hooks) && p.hooks.every(listaTextos))) R.error(w, '"hooks" tiene que ser una lista de listas de frases', 'p. ej. [["Frase 1.", "Frase 2."], ["Otra 1.", "Otra 2."]]');
    if (!Array.isArray(p.datos) || !p.datos.length) R.error(w, '"datos" tiene que ser una lista de 1 a 3 frases de la ficha');
    else p.datos.forEach(d => { if (!esTexto(d)) R.error(w, 'un dato está vacío'); else if (d.length > 60) R.aviso(w, `el dato «${d.slice(0, 30)}…» es largo (${d.length})`, 'recórtalo a ~54 caracteres sin cambiar lo que dice'); });
    const gags = GAGS[PERFIL] || [];
    if (!esTexto(p.gag)) R.error(w, 'falta "gag"', `uno de: ${gags.join(', ')}`);
    else if (gags.length && !gags.includes(p.gag)) R.aviso(w, `el gag "${p.gag}" no tiene animación propia en el motor`, `se verá como texto; disponibles: ${gags.join(', ')}`);
    if (p.foto && !existe(p.foto)) R.error(w, `"foto" apunta a ${p.foto}, que no existe`, 'pon la ruta correcta (relativa a esta carpeta) o null para dibujar el marcador');
    if (PERFIL === 'catalogo') {
      if (!esTexto(p.modelo)) R.error(w, 'falta "modelo" (el nombre visible)');
      for (const k of ['rango', 'variantes', 'colores']) if (!Array.isArray(p[k])) R.error(w, `"${k}" tiene que ser una lista (puede estar vacía: [])`);
      if (!esTexto(p.categoria)) R.aviso(w, 'falta "categoria"');
    } else {
      if (!listaTextos(p.nombre) || !p.nombre.length || p.nombre.length > 2) R.error(w, '"nombre" tiene que ser una lista de 1 o 2 textos', 'p. ej. ["Funda", "transparente"] (la segunda va en cursiva)');
      if (!Number.isInteger(p.colores) || p.colores < 1) R.error(w, '"colores" tiene que ser un número entero (el número real de colores)');
      if (!['circulo', 'barra', 'diagonal', 'satinado'].includes(p.muestra)) R.error(w, `"muestra" no válida (${p.muestra})`, 'circulo, barra, diagonal o satinado');
      for (const k of ['linea_colores', 'guino_final']) if (!esTexto(p[k])) R.aviso(w, `falta "${k}"`);
    }
    if (p.plan) comprobarPlan(R, w + ' → plan', p.plan, PERFIL === 'producto' ? 'producto' : 'catalogo');
    if (p.locucion !== undefined && p.locucion !== false && !(Array.isArray(p.locucion) && p.locucion.every(l => l && esTexto(l.texto))))
      R.error(w, '"locucion" tiene que ser false o una lista de {escena, texto}', 'p. ej. [{"escena": "hook", "texto": "..."}, {"escena": "precio", "texto": "Desde 9,90 €"}]');
  });
}

// ---------------------------------------------------------------- planes y variación
function comprobarPlan(R, w, plan, perfil) {
  let VAR;
  try { VAR = require('./variacion'); } catch { return; }
  if (plan.v !== 2) return R.error(w, 'versión de plan desconocida', 'bórralo y ejecuta node variar.js');
  const VP = VAR.perfil(perfil);
  for (const k of VP.P.visuales) if (plan[k] !== undefined && !VP.OPCIONES[k].includes(plan[k])) R.error(w, `"${k}": "${plan[k]}" no existe`, `opciones: ${VP.OPCIONES[k].join(', ')}`);
  const m = plan.musica || {};
  if (m.estilo && !VAR.ESTILOS[m.estilo]) R.error(w, `estilo de música "${m.estilo}" no existe`, `estilos: ${Object.keys(VAR.ESTILOS).join(', ')}`);
  if (m.sfx && !VAR.SFX.includes(m.sfx)) R.error(w, `paquete de efectos "${m.sfx}" no existe`, `paquetes: ${VAR.SFX.join(', ')}`);
  if (!m.estilo) R.aviso(w, 'plan sin estilo de música (de la v2)', 'ejecuta node variar.js: le añade música sin tocar lo visual');
  if (plan.tiempos) {
    const tot = plan.tiempos[plan.tiempos.length - 1].b;
    if (Math.abs(tot - 15.5) > 0.01) R.error(w, `la línea de tiempo dura ${tot} s y tiene que durar 15,5`, 'bórrala y ejecuta node variar.js --rehacer');
  }
}

function comprobarVariacion(R) {
  let VAR;
  try { VAR = require('./variacion'); } catch { return; }
  const VP = VAR.perfil(PERFIL);
  const fuentes = [];
  const vj = jsonValido(R, 'variacion.json'); if (vj) fuentes.push(['variacion.json', vj]);
  const cj = existe('config.json') && jsonValido(R, 'config.json'); if (cj && cj.variacion) fuentes.push(['config.json → variacion', cj.variacion]);
  const pj = existe('productos.json') && jsonValido(R, 'productos.json'); if (pj && pj.variacion) fuentes.push(['productos.json → variacion', pj.variacion]);
  for (const [w, v] of fuentes) {
    for (const [k, val] of Object.entries(v)) {
      if (['temporada', 'ventana', 'intentos', '_comentario'].includes(k)) continue;
      const ops = VP.OPCIONES[k] || (k === 'paleta' ? null : undefined);
      if (ops === undefined) { R.aviso(w, `la clave "${k}" no se usa en esta plantilla`, `claves: ${Object.keys(VP.OPCIONES).join(', ')}`); continue; }
      if (!Array.isArray(val) || !val.length) { R.error(w, `"${k}" tiene que ser una lista con al menos una opción`); continue; }
      if (ops) for (const x of val) {
        if (ops.includes(x) || (k === 'estilo' && VAR.ESTILOS[x])) continue;
        if (k === 'paleta' && existe('anim.html') && new RegExp('paletas\\s*:[\\s\\S]*?\\b' + x + '\\s*:').test(fs.readFileSync(path.join(ROOT, 'anim.html'), 'utf8'))) continue; // paleta propia en CFG.paletas
        R.error(w, `"${k}": "${x}" no existe`, k === 'paleta' ? `opciones: ${ops.join(', ')}, o una propia en CFG.paletas de anim.html` : `opciones: ${ops.join(', ')}`);
      }
    }
  }
}

// ---------------------------------------------------------------- locución
function comprobarLocucion(R, conRed) {
  const L = jsonValido(R, 'locucion.json');
  if (!L) return;
  const p = L.proveedor;
  const PROV = ['piper', 'elevenlabs', 'voicebox', 'openai', 'comando', 'ninguna'];
  if (!PROV.includes(p)) return R.error('locucion.json', `"proveedor": "${p}" no existe`, PROV.join(', '));
  if (p === 'ninguna') return;
  if (p === 'elevenlabs') {
    if (!esTexto(L.voz)) R.error('locucion.json', 'falta "voz" (voice_id de ElevenLabs)', 'cópialo de la web de ElevenLabs (Voices → ID)');
    const { secreto } = require('./voz');
    if (!secreto('ELEVENLABS_API_KEY')) R.error('locucion.json', 'no encuentro la clave de ElevenLabs', 'define ELEVENLABS_API_KEY o escribe ELEVENLABS_API_KEY=... en ~/.config/motion-promo-reels/env (chmod 600). Nunca en el repo.');
  }
  if (p === 'piper') {
    const V = require('./voz');
    if (!V.piperListo()) R.error('locucion.json', 'Piper no está instalado', `pregunta al usuario si lo quiere (gratis, sin conexión después, ~240 MB) y, si dice que sí: node voz.js --instalar piper ${L.idioma || 'es'}`);
    else if (!fs.existsSync(V.modeloPiper(V.vozPiper(L)))) R.aviso('locucion.json', `la voz ${V.vozPiper(L)} aún no está descargada`, 'se descargará sola la primera vez (~60 MB, necesita conexión)');
  }
  if (p === 'voicebox' && !esTexto(L.voz)) R.aviso('locucion.json', 'sin "voz": Voicebox usará su voz por defecto', 'pon el nombre del perfil (créalo en español)');
  if (p === 'comando' && !(esTexto(L.comando) && L.comando.includes('{salida}'))) R.error('locucion.json', '"comando" tiene que incluir {salida}', 'p. ej. "piper --model es_ES.onnx --output_file {salida}"');
  if (L.velocidad !== undefined && !(L.velocidad >= 0.7 && L.velocidad <= 1.3)) R.aviso('locucion.json', `velocidad ${L.velocidad} fuera de lo habitual`, 'entre 0,9 y 1,15 suena natural');
  if (PERFIL === 'persona' && !(Array.isArray(L.lineas) && L.lineas.every(l => typeof l.t === 'number' && esTexto(l.texto)))) R.error('locucion.json', '"lineas" tiene que ser una lista de {t, texto}', 't = segundo en el que empieza');
  if (conRed && p === 'voicebox') {
    const url = (L.url || 'http://127.0.0.1:17493').replace(/\/$/, '');
    const r = spawnSync(process.execPath, ['-e', `fetch(${JSON.stringify(url + '/profiles')},{signal:AbortSignal.timeout(3000)}).then(r=>process.exit(r.ok?0:2)).catch(()=>process.exit(1))`]);
    if (r.status !== 0) R.aviso('locucion.json', `Voicebox no responde en ${url}`, 'abre la app de Voicebox antes de renderizar (o usa --sin-voz)');
  }
}

// ---------------------------------------------------------------- persona
function comprobarPersona(R) {
  const v = jsonValido(R, 'versiones.json');
  if (v && v.versiones) for (const [k, plan] of Object.entries(v.versiones)) {
    let VAR; try { VAR = require('./variacion'); } catch { return; }
    const VP = VAR.perfil('persona');
    for (const e of VP.P.visuales) if (plan[e] !== undefined && !VP.OPCIONES[e].includes(plan[e]) && e !== 'paleta') R.error(`versiones.json → ${k}`, `"${e}": "${plan[e]}" no existe`, VP.OPCIONES[e].join(', '));
  }
  const html = fs.readFileSync(path.join(ROOT, 'anim.html'), 'utf8');
  const cfg = html.slice(html.indexOf('const CFG = {'), html.indexOf('const UI = Object.assign'));
  if (/alexejemplo|Alex Ejemplo/.test(cfg)) R.aviso('anim.html → CFG', 'todavía tiene los datos de ejemplo (Alex Ejemplo)', 'cambia nombre, web, homónimos, cifras… por los reales de la persona');
}

// ---------------------------------------------------------------- entorno
function comprobarEntorno(R) {
  const v = process.versions.node.split('.').map(Number);
  if (v[0] < 18) R.error('Node', `versión ${process.versions.node}`, 'instala Node 18 o superior');
  for (const b of ['ffmpeg', 'ffprobe']) if (spawnSync(b, ['-version']).status !== 0) R.error(b, 'no está en el PATH', 'instálalo (ffmpeg.org; macOS: brew install ffmpeg; Windows: winget install ffmpeg)');
  const py = process.platform === 'win32' ? 'python' : 'python3';
  const r = spawnSync(py, ['-c', 'import numpy, scipy; print("ok")'], { encoding: 'utf8' });
  if (r.status !== 0) R.error(py, 'falta Python 3 con numpy y scipy', `pip install numpy scipy`);
  if (spawnSync(py, ['-c', 'import PIL']).status !== 0) R.aviso(py, 'falta Pillow (solo para las hojas de contactos)', 'pip install pillow');
  if (!fs.existsSync(path.join(ROOT, 'node_modules', 'puppeteer-core'))) R.error('npm', 'faltan las dependencias', 'ejecuta npm install en esta carpeta');
  const chrome = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean).find(p => fs.existsSync(p));
  if (!chrome) R.error('Chrome', 'no encuentro Chrome ni Edge', 'instálalo o define CHROME_PATH con la ruta del ejecutable');
  // los estilos de música de sonido.py y de variacion.js tienen que coincidir
  const s = spawnSync(py, [path.join(ROOT, 'sonido.py'), '--estilos'], { encoding: 'utf8' });
  if (s.status === 0) {
    const py_ = Object.keys(JSON.parse(s.stdout)).sort().join(','), js = Object.keys(require('./variacion').ESTILOS).sort().join(',');
    if (py_ !== js) R.error('sonido.py / variacion.js', 'los estilos de música no coinciden', 'el motor de este proyecto está mezclado: node <carpeta de la skill>/core/nuevo.js --actualizar .');
  }
}

function informar(R, titulo) {
  for (const e of R.errores) console.log('ERROR  ' + e);
  for (const a of R.avisos) console.log('aviso  ' + a);
  console.log(R.errores.length ? `\n${titulo}: ${R.errores.length} error(es). Corrígelos y vuelve a ejecutar.` : `${titulo}: OK${R.avisos.length ? ` (${R.avisos.length} aviso/s)` : ''}`);
}

function comprobarDatos({ salir = false, conRed = false } = {}) {
  const R = nuevo();
  if (PERFIL === 'persona') comprobarPersona(R);
  else {
    if (PERFIL === 'catalogo') jsonValido(R, 'config.json');
    comprobarProductos(R, jsonValido(R, 'productos.json'));
  }
  comprobarVariacion(R);
  comprobarLocucion(R, conRed);
  if (salir && R.errores.length) { informar(R, 'Datos'); process.exit(1); }
  for (const a of R.avisos) if (salir) console.log('aviso  ' + a);
  return R;
}

module.exports = { comprobarDatos };

if (require.main === module) {
  const R = comprobarDatos({ conRed: true });
  if (!process.argv.includes('--datos')) comprobarEntorno(R);
  informar(R, process.argv.includes('--datos') ? 'Datos' : 'Comprobación');
  process.exit(R.errores.length ? 1 : 0);
}
