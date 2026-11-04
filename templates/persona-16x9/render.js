// Render del vídeo de marca personal (16:9).
// Uso:
//   node render.js stills 1.9,3.9,6.6,9.5,14,17.3,20,22,25   -> fotogramas sueltos en stills/ para revisar
//   node render.js video promo.mp4                            -> vídeo final con audio (-14 LUFS)
//   v2, versiones (antes: node variar.js 3 -> versiones.json):
//   node render.js video promo_B.mp4 --version B              -> la versión B
//   node render.js stills 6.6,9.5 --version B                 -> fotogramas de la versión B
//   node render.js hoja                                       -> hoja de contactos de todas las versiones (hoja_01.jpg)
// Requisitos: Node 18+, `npm i puppeteer-core`, ffmpeg en el PATH, Python 3 con numpy y scipy (y Pillow para hoja), Chrome o Edge.
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

// Recuento real de líneas de código (lo usa la escena «ESTE VÍDEO»): todo lo que se ejecuta para hacerlo.
const LOC = ['anim.html', 'render.js', 'audio.py', 'variacion.js'].reduce((a, f) => a + fs.readFileSync(path.join(__dirname, f), 'utf8').split('\n').length, 0);

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

function planDe(version) {
  if (!version) return null;
  const f = path.join(__dirname, 'versiones.json');
  if (!fs.existsSync(f)) throw new Error('No hay versiones.json. Genera las versiones con: node variar.js 3');
  const v = JSON.parse(fs.readFileSync(f, 'utf8')).versiones[version];
  if (!v) throw new Error('No existe la versión ' + version + ' en versiones.json');
  return v;
}

async function abrir(browser, plan) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.evaluateOnNewDocument((l, p) => { window.LOC = l; if (p) window.PLAN = p; }, LOC, plan);
  await page.goto('file://' + path.join(__dirname, 'anim.html'));
  await page.evaluate(async () => { await document.fonts.ready; await window.READY; });
  return page;
}

(async () => {
  const args = process.argv.slice(2);
  const iv = args.indexOf('--version');
  const version = iv >= 0 ? args[iv + 1] : null;
  if (iv >= 0) args.splice(iv, 2);
  const [mode, arg] = args;
  const browser = await puppeteer.launch({
    executablePath: browserPath(),
    args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none', '--allow-file-access-from-files'],
  });
  if (mode === 'hoja') {
    // un fotograma de cada escena para cada versión, en una hoja de contactos (hoja.py)
    const f = path.join(__dirname, 'versiones.json');
    if (!fs.existsSync(f)) throw new Error('No hay versiones.json. Genera las versiones con: node variar.js 3');
    const vs = JSON.parse(fs.readFileSync(f, 'utf8')).versiones;
    const dir = path.join(__dirname, 'out', 'hoja');
    fs.mkdirSync(dir, { recursive: true });
    const marcas = [['terminal', 1.9], ['fuente', 7.2], ['cifras', 10.6], ['metodo', 14.4], ['stack', 17.4], ['frase', 21.8], ['cierre', 25.4]];
    const metas = [];
    for (const [id, plan] of Object.entries(vs)) {
      const page = await abrir(browser, plan);
      const meta = { id, modelo: 'Versión ' + id, plan: ['paleta', 'titulo', 'cifras', 'metodo', 'stack', 'fondo'].map(k => plan[k]).join(' · '), escenas: [] };
      for (const [n, t] of marcas) {
        const d = await page.evaluate(f => { window.renderFrame(f); return document.getElementById('c').toDataURL('image/jpeg', 0.9); }, Math.round(t * 30));
        const name = `${id}__${n}.jpg`;
        fs.writeFileSync(path.join(dir, name), Buffer.from(d.split(',')[1], 'base64'));
        meta.escenas.push({ n, f: name });
      }
      metas.push(meta);
      await page.close();
    }
    fs.writeFileSync(path.join(dir, 'indice.json'), JSON.stringify(metas, null, 2));
    execFileSync(process.platform === 'win32' ? 'python' : 'python3', [path.join(__dirname, 'hoja.py'), path.join(dir, 'indice.json'), path.join(__dirname, 'out')], { stdio: 'inherit' });
    await browser.close();
    return;
  }
  const page = await abrir(browser, planDe(version));
  const total = await page.evaluate(() => window.TOTAL);
  const grab = f => page.evaluate(f => { window.renderFrame(f); return document.getElementById('c').toDataURL('image/jpeg', 0.95); }, f);

  if (mode === 'stills') {
    const dir = path.join(__dirname, 'stills');
    fs.mkdirSync(dir, { recursive: true });
    for (const s of arg.split(',')) {
      const d = await grab(Math.round(parseFloat(s) * 30));
      fs.writeFileSync(path.join(dir, `${version ? version + '_' : ''}t${s}.jpg`), Buffer.from(d.split(',')[1], 'base64'));
    }
  } else {
    const out = path.resolve(arg || 'promo.mp4');
    const silent = out.replace(/\.mp4$/, '_silent.mp4');
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p', silent], { stdio: ['pipe', 'ignore', 'inherit'] });
    for (let f = 0; f < total; f++) {
      const d = await grab(f);
      if (!ff.stdin.write(Buffer.from(d.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 150 === 0) console.log('fotograma', f, '/', total);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    // audio sincronizado (los cues están en audio.py) + mezcla final
    execFileSync(process.platform === 'win32' ? 'python' : 'python3', [path.join(__dirname, 'audio.py'), ...(version ? ['--version', version] : [])], { cwd: __dirname, stdio: 'inherit' });
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-i', path.join(__dirname, 'audio.wav'),
      '-af', loudnormFilter(path.join(__dirname, 'audio.wav')), '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000',
      '-shortest', '-movflags', '+faststart', out]);
    fs.unlinkSync(silent);
    console.log('OK', out);
  }
  await browser.close();
  console.log('Líneas de código:', LOC);
})();
