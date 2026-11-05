// Locución (v3). Archivo COMÚN a las tres plantillas. La voz es OPCIONAL: sin locucion.json, o con
// "proveedor": "ninguna", el vídeo sale igual que siempre.
//
// Proveedores:
//   elevenlabs  API de ElevenLabs. Clave en ELEVENLABS_API_KEY o en ~/.config/motion-promo-reels/env (permisos 600).
//   voicebox    Voicebox en local (gratis): http://127.0.0.1:17493, endpoint compatible con OpenAI. "voz" = nombre
//               o id del perfil; el idioma lo pone el perfil (créalo en español).
//   openai      Cualquier servidor compatible con POST /v1/audio/speech ("url"); clave en OPENAI_API_KEY si hace falta.
//   piper       GRATIS y local, sin conexión una vez instalado (v3.2). Se instala SOLO si el usuario dice que sí:
//                 node voz.js --instalar piper es      (o en; ~180 MB del motor + ~60 MB de la voz)
//               Va en su propio entorno de Python dentro de ~/.cache/motion-promo-reels/piper (no toca el Python del
//               sistema; para desinstalar, borra esa carpeta). Piper es GPL-3.0 y se usa como programa aparte.
//   comando     Cualquier programa local (say, espeak, edge-tts…): "comando" con {salida} y, opcional, {texto}.
//               Si no lleva {texto}, el texto entra por la entrada estándar.
//   ninguna     Sin voz.
//
// Qué hace: escribe el guion SOLO con lo que ya sale en pantalla (nada inventado), genera una toma por frase,
// la guarda en caché (no se paga dos veces la misma frase), recorta silencios, coloca cada frase en su escena sin que
// se pisen (acelera un poco o quita las menos importantes si no caben) y deja:
//   out/voz/<id>.json   líneas colocadas [{t, wav, texto, dur}] -> audio.py hace el ducking de música y efectos
//   out/<nombre>.srt    subtítulos de la locución
// Uso directo (prueba sin renderizar):  node voz.js <id-producto | versión A> [--confirmar] [--rehacer 2]
//                                      node voz.js --instalar piper es|en|<voz>    (pide permiso antes)
//                                      node voz.js --voces                         (voces gratis recomendadas)
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = __dirname;
const CACHE = process.env.MPR_CACHE || path.join(os.homedir(), '.cache', 'motion-promo-reels', 'voz');
const ENV = path.join(os.homedir(), '.config', 'motion-promo-reels', 'env');
const DEF = { velocidad: 1, tope_caracteres: 3000, etiqueta: 'Voz generada con IA', idioma: 'es' };

// ---------------------------------------------------------------- piper (voz gratis y local)
const PIPER = process.env.MPR_PIPER_DIR || path.join(os.homedir(), '.cache', 'motion-promo-reels', 'piper');
const PIPER_PY = path.join(PIPER, 'venv', process.platform === 'win32' ? 'Scripts\\python.exe' : 'bin/python');
const PIPER_VOCES = path.join(PIPER, 'voces');
// voces por idioma (las de uso más extendido; hay más en https://huggingface.co/rhasspy/piper-voices)
const VOCES_PIPER = { es: 'es_ES-davefx-medium', en: 'en_US-lessac-medium' };
const pythonDelSistema = () => process.platform === 'win32' ? 'python' : 'python3';
let _piperOk = false; // se comprueba una vez por ejecución (una vez instalado, no deja de estarlo)
const piperListo = () => _piperOk || (_piperOk = fs.existsSync(PIPER_PY) && spawnSync(PIPER_PY, ['-m', 'piper', '--help']).status === 0);
const vozPiper = cfg => cfg.voz || VOCES_PIPER[(cfg.idioma || 'es').slice(0, 2)] || VOCES_PIPER.es;
const modeloPiper = voz => path.join(PIPER_VOCES, voz + '.onnx');

function descargarVozPiper(voz, log = console.log) {
  if (fs.existsSync(modeloPiper(voz))) return;
  log(`  Descargando la voz ${voz} (unos 60 MB, solo la primera vez)…`);
  fs.mkdirSync(PIPER_VOCES, { recursive: true });
  const r = spawnSync(PIPER_PY, ['-m', 'piper.download_voices', voz, '--data-dir', PIPER_VOCES], { encoding: 'utf8' });
  if (r.status !== 0 || !fs.existsSync(modeloPiper(voz))) {
    const red = /URLError|Tunnel|resolve|timed out|Connection/i.test(r.stderr || '');
    throw new Error(`No se pudo descargar la voz ${voz}${red ? ' (sin conexión con huggingface.co)' : ''}. ` +
      `Comprueba el nombre en https://huggingface.co/rhasspy/piper-voices o descárgala a mano: ` +
      `"${PIPER_PY}" -m piper.download_voices ${voz} --data-dir "${PIPER_VOCES}"`);
  }
}

// Instala Piper en su propio entorno y descarga la voz. NO se ejecuta nunca sin que el usuario lo haya aceptado.
function instalarPiper(arg = 'es', log = console.log) {
  const voz = VOCES_PIPER[arg] || arg;
  if (!/^[a-z]{2}_[A-Z]{2}-[a-z0-9_]+-(x_low|low|medium|high)$/.test(voz)) throw new Error(`"${arg}" no es un idioma (es, en) ni un nombre de voz de Piper (p. ej. es_ES-davefx-medium).`);
  if (!piperListo()) {
    log(`Instalando Piper en ${path.join(PIPER, 'venv')} (unos 180 MB, aislado del Python del sistema)…`);
    fs.mkdirSync(PIPER, { recursive: true });
    let r = spawnSync(pythonDelSistema(), ['-m', 'venv', path.join(PIPER, 'venv')], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error('No se pudo crear el entorno de Python: ' + (r.stderr || '').slice(-300) + '\n(En Debian/Ubuntu: sudo apt install python3-venv)');
    r = spawnSync(PIPER_PY, ['-m', 'pip', 'install', '--quiet', '--disable-pip-version-check', 'piper-tts'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (r.status !== 0 || !piperListo()) throw new Error('No se pudo instalar piper-tts: ' + (r.stderr || '').slice(-400));
  } else log('Piper ya estaba instalado.');
  descargarVozPiper(voz, log);
  // deja locucion.json listo (conserva el resto de ajustes)
  const f = path.join(ROOT, 'locucion.json');
  const cfg = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
  Object.assign(cfg, { proveedor: 'piper', voz, idioma: voz.slice(0, 2) });
  if (!('etiqueta' in cfg)) cfg.etiqueta = DEF.etiqueta;
  fs.writeFileSync(f, JSON.stringify(cfg, null, 2) + '\n');
  log(`Listo: voz ${voz}. locucion.json usa ahora "proveedor": "piper".`);
  log('Licencias: Piper es GPL-3.0 (se usa como programa aparte). Cada voz tiene su propia licencia en su ficha (MODEL_CARD) de https://huggingface.co/rhasspy/piper-voices: revísala antes de un uso comercial.');
  log(`Para desinstalar: borra ${PIPER}`);
}

// ---------------------------------------------------------------- configuración y secretos
function leerConfig() {
  const f = path.join(ROOT, 'locucion.json');
  if (!fs.existsSync(f)) return null;
  const c = Object.assign({}, DEF, JSON.parse(fs.readFileSync(f, 'utf8')));
  if (!c.proveedor || c.proveedor === 'ninguna') return null;
  return c;
}

function secreto(nombre) {
  if (process.env[nombre]) return process.env[nombre];
  if (!fs.existsSync(ENV)) return null;
  try {
    const modo = fs.statSync(ENV).mode & 0o077;
    if (modo && process.platform !== 'win32') console.warn(`Aviso: ${ENV} lo pueden leer otros usuarios. Ejecuta: chmod 600 ${ENV}`);
  } catch { /* sin permisos que mirar */ }
  for (const l of fs.readFileSync(ENV, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && m[1] === nombre) return m[2].replace(/^["']|["']$/g, '');
  }
  return null;
}

// ---------------------------------------------------------------- texto que se dice (no el que se ve)
// Precios, dominios y símbolos se escriben como se leen. Las cifras se dejan: los motores las leen bien en español.
function hablado(s) {
  return String(s)
    .replace(/(\d+),00\s?€/g, '$1 euros')
    .replace(/(\d+),(\d{2})\s?€/g, '$1 euros con $2')
    .replace(/(\d+)\s?€/g, '$1 euros')
    .replace(/\b([a-z0-9-]+)\.(com|es|net|org|shop|store|io|co|eu|cat)\b/gi, '$1 punto $2')
    .replace(/%/g, ' por ciento')
    .replace(/\s*[·•|→←↑↓✓✕]\s*/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}
const conPunto = s => (/[.!?…]$/.test(s.trim()) ? s.trim() : s.trim() + '.');

// ---------------------------------------------------------------- guion por defecto (solo datos que están en pantalla)
// prioridad: 1 se queda siempre; las de número mayor se quitan primero si no caben
function guionProducto(p, marca, plan, perfil) {
  if (p.locucion === false) return [];
  const T = {};
  for (const s of (plan && plan.tiempos) || []) T[s.n] = s.a;
  const at = (n, d, v1) => (n in T ? T[n] : v1) + d;
  if (Array.isArray(p.locucion)) { // guion escrito a mano: [{escena, texto, hablado?, prioridad?}]
    return p.locucion.map((l, i) => ({ id: i + 1, t: at(l.escena || 'hook', l.desfase ?? 0.25, 0), texto: l.texto, hablado: hablado(l.hablado || l.texto), prioridad: l.prioridad || i + 1 }));
  }
  const hookTxt = (Array.isArray(p.hooks) && plan && p.hooks[Math.min(plan.hook || 0, p.hooks.length - 1)]) || p.hook || [];
  const nombre = p.modelo || (Array.isArray(p.nombre) ? p.nombre.join(' ') : p.nombre) || '';
  const precio = p.precio ? `${p.desde ? 'Desde ' : ''}${p.precio}${perfil === 'producto' && p.unidad ? ', ' + p.unidad : ''}` : '';
  const L = [
    { t: at('hook', 0.25, 0), texto: hookTxt.map(conPunto).join(' '), prioridad: 1 },
    { t: at('hero', 0.35, 3.0), texto: conPunto(nombre), prioridad: 4 },
    { t: at('precio', 0.25, 11.4), texto: conPunto(precio), prioridad: 2 },
    { t: at('outro', 0.5, 13.2), texto: conPunto(marca.web || ''), prioridad: 3 },
  ].filter(l => l.texto && l.texto !== '.');
  return L.map((l, i) => Object.assign(l, { id: i + 1, hablado: hablado(l.texto) }));
}

// persona: las líneas viven en locucion.json ("lineas": [{t, texto, hablado?}]) porque la historia es fija
function guionPersona(cfg) {
  return (cfg.lineas || []).map((l, i) => ({ id: i + 1, t: l.t, texto: l.texto, hablado: hablado(l.hablado || l.texto), prioridad: l.prioridad || i + 1 }));
}

// ---------------------------------------------------------------- proveedores
async function pedir(url, opciones, que) {
  let r;
  try { r = await fetch(url, opciones); } catch (e) {
    throw new Error(`${que}: no responde ${new URL(url).origin} (${e.cause ? e.cause.code || e.cause.message : e.message}). ¿Está en marcha y la URL es correcta?`);
  }
  if (!r.ok) {
    const cuerpo = await r.text().catch(() => '');
    let det = cuerpo.slice(0, 300);
    try { const j = JSON.parse(cuerpo); det = (j.detail && (j.detail.message || j.detail)) || (j.error && j.error.message) || det; } catch { /* texto */ }
    throw new Error(`${que} respondió ${r.status}: ${typeof det === 'string' ? det : JSON.stringify(det)}`);
  }
  return Buffer.from(await r.arrayBuffer());
}

async function sintetizar(cfg, linea, vecinas, semilla, destinoCrudo) {
  const prov = cfg.proveedor;
  if (prov === 'elevenlabs') {
    const clave = secreto('ELEVENLABS_API_KEY');
    if (!clave) throw new Error(`Falta la clave de ElevenLabs: define ELEVENLABS_API_KEY o escríbela en ${ENV} (ELEVENLABS_API_KEY=...) con chmod 600.`);
    if (!cfg.voz) throw new Error('locucion.json: falta "voz" (el voice_id de ElevenLabs).');
    const base = process.env.ELEVENLABS_URL || cfg.url || 'https://api.elevenlabs.io';
    const modelo = cfg.modelo || 'eleven_multilingual_v2';
    const cuerpo = { text: linea.hablado, model_id: modelo, seed: semilla };
    const ajustes = Object.assign({}, cfg.ajustes || {});
    if (cfg.velocidad && cfg.velocidad !== 1) ajustes.speed = cfg.velocidad;
    if (Object.keys(ajustes).length) cuerpo.voice_settings = ajustes;
    if (vecinas.anterior) cuerpo.previous_text = vecinas.anterior; // entonación con hilo entre frases
    if (vecinas.siguiente) cuerpo.next_text = vecinas.siguiente;
    if (cfg.idioma && !/multilingual_v2/.test(modelo)) cuerpo.language_code = cfg.idioma;
    const audio = await pedir(`${base}/v1/text-to-speech/${encodeURIComponent(cfg.voz)}?output_format=mp3_44100_128`, {
      method: 'POST', headers: { 'xi-api-key': clave, 'content-type': 'application/json', accept: 'audio/mpeg' }, body: JSON.stringify(cuerpo),
    }, 'ElevenLabs');
    fs.writeFileSync(destinoCrudo + '.mp3', audio);
    return destinoCrudo + '.mp3';
  }
  if (prov === 'voicebox' || prov === 'openai') {
    const base = (cfg.url || (prov === 'voicebox' ? 'http://127.0.0.1:17493' : 'https://api.openai.com')).replace(/\/$/, '');
    const headers = { 'content-type': 'application/json' };
    const clave = prov === 'openai' ? secreto('OPENAI_API_KEY') : null;
    if (clave) headers.authorization = 'Bearer ' + clave;
    const cuerpo = { model: cfg.modelo || (prov === 'voicebox' ? 'tts-1' : 'gpt-4o-mini-tts'), input: linea.hablado, response_format: 'wav', speed: cfg.velocidad || 1 };
    if (cfg.voz) cuerpo.voice = cfg.voz;
    if (cfg.instrucciones) cuerpo.instructions = cfg.instrucciones;
    const audio = await pedir(`${base}/v1/audio/speech`, { method: 'POST', headers, body: JSON.stringify(cuerpo) }, prov === 'voicebox' ? 'Voicebox' : 'El servidor de voz');
    fs.writeFileSync(destinoCrudo + '.wav', audio);
    return destinoCrudo + '.wav';
  }
  if (prov === 'piper') {
    if (!piperListo()) throw new Error('Piper no está instalado. Pregunta al usuario si quiere instalarlo (unos 240 MB, gratis y sin conexión después) y, si dice que sí: node voz.js --instalar piper ' + (cfg.idioma || 'es'));
    const voz = vozPiper(cfg);
    descargarVozPiper(voz);
    const salida = destinoCrudo + '.wav';
    const args = ['-m', 'piper', '-m', voz, '--data-dir', PIPER_VOCES, '-f', salida];
    if (cfg.velocidad && cfg.velocidad !== 1) args.push('--length-scale', String(+(1 / cfg.velocidad).toFixed(3)));
    const r = spawnSync(PIPER_PY, args, { input: linea.hablado.replace(/\s+/g, ' ') + '\n', encoding: 'utf8' });
    if (r.status !== 0 || !fs.existsSync(salida)) throw new Error(`Piper falló (${r.status}): ${(r.stderr || '').slice(-300)}`);
    return salida;
  }
  if (prov === 'comando') {
    if (!cfg.comando || !cfg.comando.includes('{salida}')) throw new Error('locucion.json: "comando" tiene que incluir {salida} (dónde escribe el audio).');
    const salida = destinoCrudo + '.' + (cfg.extension || 'wav');
    const q = s => "'" + String(s).replace(/'/g, "'\\''") + "'";
    const cmd = cfg.comando.replace(/\{salida\}/g, q(salida)).replace(/\{texto\}/g, q(linea.hablado));
    const r = spawnSync(process.platform === 'win32' ? 'cmd' : 'sh', process.platform === 'win32' ? ['/c', cmd] : ['-c', cmd],
      { input: cfg.comando.includes('{texto}') ? undefined : linea.hablado, encoding: 'utf8' });
    if (r.status !== 0 || !fs.existsSync(salida)) throw new Error(`El comando de voz falló (${r.status}): ${(r.stderr || '').slice(0, 300)}`);
    return salida;
  }
  throw new Error(`locucion.json: proveedor desconocido "${prov}". Usa piper, elevenlabs, voicebox, openai, comando o ninguna.`);
}

// ---------------------------------------------------------------- audio: a WAV 48 kHz mono sin silencios en los bordes
function aWav(entrada, salida, tempo = 1) {
  const recorte = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse';
  const af = tempo !== 1 ? `${recorte},atempo=${tempo.toFixed(3)}` : recorte;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', entrada, '-af', af, '-ac', '1', '-ar', '48000', '-c:a', 'pcm_s16le', '-f', 'wav', salida]);
  return duracion(salida);
}
const duracion = f => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }));

const clave = (cfg, texto, toma) => crypto.createHash('sha1')
  .update(JSON.stringify([cfg.proveedor, cfg.proveedor === 'piper' ? vozPiper(cfg) : (cfg.voz || ''), cfg.modelo || '', cfg.velocidad || 1, cfg.ajustes || null, cfg.instrucciones || '', cfg.comando || '', texto, toma])).digest('hex').slice(0, 20);

// ---------------------------------------------------------------- colocar sin que se pisen
function colocar(L, dur, fin) {
  const limite = dur - fin;
  const prueba = (ls, f) => {
    let fin0 = 0;
    return ls.map(l => { const t = Math.max(l.t, fin0 + 0.12); const d = l.dur / f; fin0 = t + d; return Object.assign({}, l, { t: +t.toFixed(3), dur: +d.toFixed(3) }); });
  };
  let ls = L.slice().sort((a, b) => a.t - b.t), f = 1, quitadas = [];
  for (;;) {
    let r = prueba(ls, f);
    if (!r.length || r[r.length - 1].t + r[r.length - 1].dur <= limite) return { lineas: r, tempo: f, quitadas };
    const sobra = r[r.length - 1].t + r[r.length - 1].dur - limite;
    const habla = r.reduce((s, l) => s + l.dur, 0);
    const nf = Math.min(1.15, f * (habla / Math.max(0.1, habla - sobra)));
    if (nf > f + 1e-3 && f < 1.15) { f = nf; continue; } // primero, hasta un 15 % más rápido
    const peor = ls.reduce((a, b) => (b.prioridad > a.prioridad ? b : a)); // si no, fuera la menos importante
    quitadas.push(peor.texto);
    ls = ls.filter(l => l !== peor);
    f = 1;
  }
}

function srt(lineas, ruta) {
  const ts = s => { const ms = Math.round(s * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, ss = Math.floor(ms / 1000) % 60, r = ms % 1000; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')},${String(r).padStart(3, '0')}`; };
  fs.writeFileSync(ruta, lineas.map((l, i) => `${i + 1}\n${ts(l.t)} --> ${ts(l.t + l.dur)}\n${l.texto}\n`).join('\n'));
}

// ---------------------------------------------------------------- todo junto
// id: id del producto o versión; L: guion; dur: duración del vídeo. Devuelve la ruta del JSON de líneas o null.
async function preparar({ id, L, dur, fin = 0.35, cfg = leerConfig(), confirmar = false, rehacer = [], outDir = path.join(ROOT, 'out'), log = console.log }) {
  if (!cfg || !L.length) return null;
  fs.mkdirSync(CACHE, { recursive: true });
  const dir = path.join(outDir, 'voz', id);
  fs.mkdirSync(dir, { recursive: true });
  const tomas = L.map(l => {
    const toma = rehacer.includes(l.id) ? Date.now() % 100000 : 0;
    return Object.assign(l, { clave: clave(cfg, l.hablado, toma), toma });
  });
  const pendientes = tomas.filter(l => !fs.existsSync(path.join(CACHE, l.clave + '.wav')));
  const caracteres = pendientes.reduce((n, l) => n + l.hablado.length, 0);
  if (cfg.proveedor === 'elevenlabs' && caracteres > cfg.tope_caracteres && !confirmar) {
    throw new Error(`La locución de "${id}" gastaría ${caracteres} caracteres de ElevenLabs y el tope es ${cfg.tope_caracteres} ` +
      `("tope_caracteres" en locucion.json). Vuelve a lanzar con --confirmar si es correcto.`);
  }
  for (const [i, l] of tomas.entries()) {
    const final = path.join(CACHE, l.clave + '.wav');
    if (fs.existsSync(final)) continue;
    const crudo = path.join(CACHE, l.clave + '.crudo');
    const semilla = parseInt(l.clave.slice(0, 8), 16) % 4000000000;
    const f = await sintetizar(cfg, l, { anterior: tomas[i - 1] && tomas[i - 1].hablado, siguiente: tomas[i + 1] && tomas[i + 1].hablado }, semilla, crudo);
    aWav(f, final + '.tmp.wav');
    fs.renameSync(final + '.tmp.wav', final); // nunca queda en caché una toma a medias
    fs.rmSync(f, { force: true });
    if (cfg.proveedor === 'elevenlabs') fs.appendFileSync(path.join(CACHE, 'gasto.jsonl'), JSON.stringify({ fecha: new Date().toISOString(), id, linea: l.id, caracteres: l.hablado.length }) + '\n');
    log(`  voz: «${l.texto}» generada`);
  }
  for (const l of tomas) l.dur = duracion(path.join(CACHE, l.clave + '.wav'));
  const { lineas, tempo, quitadas } = colocar(tomas, dur, fin);
  for (const [i, l] of lineas.entries()) {
    const nombre = `${String(i + 1).padStart(2, '0')}.wav`;
    const src = path.join(CACHE, l.clave + '.wav');
    if (tempo !== 1) aWav(src, path.join(dir, nombre), tempo); else fs.copyFileSync(src, path.join(dir, nombre));
    l.wav = path.join(id, nombre);
  }
  const avisos = [];
  if (tempo > 1.001) avisos.push(`la voz va un ${Math.round((tempo - 1) * 100)} % más rápida para caber`);
  if (quitadas.length) avisos.push('no cabían y se han quitado: ' + quitadas.map(q => `«${q}»`).join(', '));
  for (const l of lineas) if (l.t - L.find(x => x.id === l.id).t > 1.8) avisos.push(`«${l.texto}» empieza ${(l.t - L.find(x => x.id === l.id).t).toFixed(1)} s tarde respecto a su escena`);
  const json = path.join(outDir, 'voz', id + '.json');
  fs.writeFileSync(json, JSON.stringify(lineas.map(l => ({ t: l.t, wav: l.wav, texto: l.texto, dur: l.dur })), null, 2));
  return { json, lineas, avisos, etiqueta: cfg.etiqueta };
}

module.exports = { leerConfig, guionProducto, guionPersona, preparar, srt, hablado, colocar, secreto, instalarPiper, piperListo, vozPiper, modeloPiper, VOCES_PIPER, PIPER };

// ---------------------------------------------------------------- prueba directa
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    if (args.includes('--instalar')) {
      const que = args[args.indexOf('--instalar') + 1];
      if (que !== 'piper') throw new Error('Solo se instala piper: node voz.js --instalar piper es|en|<voz>');
      return instalarPiper(args[args.indexOf('--instalar') + 2] || 'es');
    }
    if (args.includes('--voces')) {
      console.log('Voces gratis y locales (Piper), sin conexión una vez instaladas:');
      for (const [l, v] of Object.entries(VOCES_PIPER)) console.log(`  ${l}: ${v}${fs.existsSync(modeloPiper(v)) ? '  (descargada)' : ''}`);
      console.log('  Más voces e idiomas: https://huggingface.co/rhasspy/piper-voices  ->  node voz.js --instalar piper <nombre>');
      console.log(`Piper ${piperListo() ? 'instalado' : 'NO instalado'} (${PIPER}).`);
      return;
    }
    const id = args.find(a => !a.startsWith('--'));
    const cfg = leerConfig();
    if (!cfg) { console.log('Sin locución: no hay locucion.json o "proveedor" es "ninguna".'); return; }
    const ir = args.indexOf('--rehacer');
    const rehacer = ir >= 0 ? args[ir + 1].split(',').map(Number) : [];
    let L, dur;
    if (fs.existsSync(path.join(ROOT, 'productos.json'))) {
      const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'productos.json'), 'utf8'));
      const p = D.productos.find(x => x.id === id);
      if (!p) throw new Error('Producto no encontrado: ' + id);
      const perfil = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).perfilVariacion;
      L = guionProducto(p, D.marca, p.plan, perfil); dur = 15.5;
    } else { L = guionPersona(cfg); dur = 27; }
    const r = await preparar({ id: id || 'persona', L, dur, cfg, confirmar: args.includes('--confirmar'), rehacer });
    for (const l of r.lineas) console.log(`${l.t.toFixed(2)} s  ${l.dur.toFixed(2)} s  ${l.texto}`);
    for (const a of r.avisos) console.log('Aviso:', a);
  })().catch(e => { console.error(e.message); process.exit(1); });
}
