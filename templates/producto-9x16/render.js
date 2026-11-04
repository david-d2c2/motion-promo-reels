// Render de reels 9:16 (plantillas catalogo-9x16 y producto-9x16: el mismo archivo en las dos).
// Uso:
//   node render.js all                 -> renderiza todos los productos de productos.json
//   node render.js mi-producto        -> solo uno
//   node render.js mi-producto --stills 1,4,7,10,12,14   -> fotogramas sueltos para revisar
//   node render.js all --hoja          -> un fotograma por escena (ya construida) de cada producto y hojas de contactos
//                                         del lote en out/hoja_NN.jpg: así se ve de un vistazo si los reels se parecen
// Requisitos: Node 18+, `npm i puppeteer-core`, ffmpeg en el PATH, Python 3 con numpy y scipy (y Pillow para --hoja).
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const ROOT = __dirname;
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'productos.json'), 'utf8'));
const OUT = path.join(ROOT, 'out');
fs.mkdirSync(OUT, { recursive: true });

// Normalización de volumen en dos pasadas (más precisa que una sola en clips cortos): mide y luego corrige a -14 LUFS.
function loudnormFilter(wav) {
  const r = require('child_process').spawnSync('ffmpeg', ['-hide_banner', '-i', wav, '-af', 'loudnorm=I=-14:TP=-1:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = JSON.parse(r.stderr.slice(r.stderr.lastIndexOf('{'), r.stderr.lastIndexOf('}') + 1));
  return `loudnorm=I=-14:TP=-1:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
}

function browserPath() {
  const c = [process.env.CHROME_PATH,
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
  const f = c.find(p => fs.existsSync(p));
  if (!f) throw new Error('No encuentro Chrome/Edge. Define CHROME_PATH.');
  return f;
}

async function renderProduct(browser, p, stills) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920 });
  await page.evaluateOnNewDocument(spec => { window.SPEC = spec; }, { m: DATA.marca, p });
  await page.goto('file://' + path.join(ROOT, 'motor.html'));
  await page.evaluate(async () => { await window.READY; });
  const total = await page.evaluate(() => window.TOTAL);
  const grab = f => page.evaluate(f => { window.renderFrame(f); return document.getElementById('c').toDataURL('image/jpeg', 0.93); }, f);

  if (stills === 'hoja') {
    // un fotograma por escena, cuando ya está montada (0,35 s antes de que acabe)
    const dir = path.join(OUT, 'hoja');
    fs.mkdirSync(dir, { recursive: true });
    const plan = await page.evaluate(() => window.PLAN);
    const nombre = p.modelo || (Array.isArray(p.nombre) ? p.nombre.join(' ') : p.nombre) || p.id;
    const resumen = Object.entries(plan).filter(([k, v]) => typeof v === 'string' && !['temporada', 'orden', 'alin'].includes(k)).map(([, v]) => v).join(' · ');
    const meta = { id: p.id, modelo: nombre, plan: plan.base ? 'v1' : resumen, escenas: [] };
    for (const seg of plan.tiempos) {
      const d = await grab(Math.round((seg.b - 0.35) * 30));
      const name = `${p.id}__${seg.n}.jpg`;
      fs.writeFileSync(path.join(dir, name), Buffer.from(d.split(',')[1], 'base64'));
      meta.escenas.push({ n: seg.n, f: name });
    }
    await page.close();
    return meta;
  }
  if (stills) {
    const dir = path.join(OUT, 'stills');
    fs.mkdirSync(dir, { recursive: true });
    for (const s of stills) {
      const d = await grab(Math.round(s * 30));
      fs.writeFileSync(path.join(dir, `${p.id}_t${s}.jpg`), Buffer.from(d.split(',')[1], 'base64'));
    }
    await page.close();
    return;
  }

  const silent = path.join(OUT, `${p.id}_silent.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', silent], { stdio: ['pipe', 'ignore', 'inherit'] });
  for (let f = 0; f < total; f++) {
    const d = await grab(f);
    if (!ff.stdin.write(Buffer.from(d.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await page.close();

  // audio sincronizado con los mismos cues
  const py = process.platform === 'win32' ? 'python' : 'python3';
  const wav = path.join(OUT, `${p.id}.wav`);
  execFileSync(py, [path.join(ROOT, 'audio.py'), p.id, wav], { stdio: 'inherit' });
  const final = path.join(OUT, `reel_${p.id}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-i', wav,
    '-af', loudnormFilter(wav), '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-shortest', '-movflags', '+faststart', final]);
  fs.unlinkSync(silent); fs.unlinkSync(wav);
  console.log('OK', final);
}

(async () => {
  const [which, flag, list] = process.argv.slice(2);
  const prods = !which || which === 'all' ? DATA.productos : DATA.productos.filter(p => p.id === which);
  if (!prods.length) throw new Error('Producto no encontrado: ' + which);
  const stills = flag === '--stills' ? list.split(',').map(Number) : flag === '--hoja' ? 'hoja' : null;
  const browser = await puppeteer.launch({
    executablePath: browserPath(),
    args: ['--no-sandbox', '--disable-gpu', '--allow-file-access-from-files', '--font-render-hinting=none'],
  });
  const metas = [];
  for (const p of prods) metas.push(await renderProduct(browser, p, stills));
  await browser.close();
  if (stills === 'hoja') {
    const idx = path.join(OUT, 'hoja', 'indice.json');
    fs.writeFileSync(idx, JSON.stringify(metas, null, 2));
    const py = process.platform === 'win32' ? 'python' : 'python3';
    execFileSync(py, [path.join(ROOT, 'hoja.py'), idx, OUT], { stdio: 'inherit' });
  }
})();
