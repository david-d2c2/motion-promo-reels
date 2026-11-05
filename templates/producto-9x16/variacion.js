// Variación de vídeos (v2). Núcleo COMÚN a las tres plantillas: el mismo archivo vive en
// catalogo-9x16/, producto-9x16/ y persona-16x9/ (si lo cambias en una, cópialo a las otras).
// Cada plantilla elige su perfil:  VAR.perfil('catalogo' | 'producto' | 'persona').
//
// Lo usan:
//   - el motor (navegador: window.VAR)  -> tema de color, línea de tiempo y plan por defecto (= v1)
//   - variar.js (Node)                   -> planificador con anti-repetición
//   - extraer.js (Node, catálogo)        -> planifica los productos nuevos tras cada extracción
// audio.py no recalcula nada: lee plan.tiempos y plan.musica del JSON que escribe variar.js.
//
// Idea: cada vídeo lleva un "plan" (orden de escenas, layout de cada escena, transición, tema, entrada del texto,
// variante del gancho y música), elegido con una semilla (id + temporada) y comparado con los planes de los vídeos
// que se publican justo antes, para que dos vídeos vecinos no se parezcan.
(function (root) {
  const TRANS = ['barrido', 'empuje', 'iris', 'diagonal', 'persiana', 'zoom'];
  // v3: estilos de música de sonido.py (nombre -> rango de tempo). La comprobación de sincronía exige que coincidan.
  const ESTILOS = { piano: [88, 104], pizzicato: [104, 120], electro: [120, 128], lofi: [76, 90], funk: [98, 112], synthwave: [96, 112],
    acustico: [92, 108], cinematico: [80, 96], ambiente: [70, 84], house: [118, 124] };
  const CALMA_EST = ['ambiente', 'piano', 'acustico'];
  const SFX = ['digital', 'organico', 'cinematico', 'minimo', 'juguete'];
  const TODOS = Object.keys(ESTILOS);
  const ENTRADA = ['subir', 'mascara', 'letras'];
  const perms = xs => xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms(xs.filter((_, j) => j !== i)).map(r => [x, ...r]));
  const ordenes = medios => perms(medios).map(p => p.join(','));

  // ---------------------------------------------------------------- perfiles
  const PERFILES = {
    catalogo: {
      opciones: {
        orden: ordenes(['rango', 'datos', 'precio']),
        hero: ['tarjeta', 'difuso', 'arco'], rango: ['pildoras', 'regla', 'rejilla'], datos: ['lista', 'numerada', 'apiladas'], precio: ['grande', 'sello', 'etiqueta'],
        trans: TRANS, tema: ['claro', 'oscuro', 'acento'], entrada: ENTRADA, alin: ['centro', 'izquierda'],
        estilo: TODOS, sfx: SFX, prog: [0, 1, 2, 3], tono: [-2, -1, 0, 1, 2, 3],
      },
      visuales: ['orden', 'hero', 'rango', 'datos', 'precio', 'trans', 'tema', 'entrada', 'alin'],
      reparto: ['orden', 'hero', 'rango', 'datos', 'precio', 'trans', 'tema'],
      pesos: { orden: 2, hero: 3, rango: 1.5, datos: 1.5, precio: 1.5, trans: 2.5, tema: 3, entrada: 1, alin: 1, hook: 3, estilo: 3.5, sfx: 1.5, prog: 1, tono: 0.5 },
      dur: { hook: 3.0, hero: 2.8, rango: 3.0, datos: 2.6, precio: 1.8, outro: 2.3 }, inicio: ['hook', 'hero'], fin: ['outro'],
      calma: { trans: ['fundido', 'barrido', 'zoom'], tema: ['claro'], entrada: ['subir', 'mascara'], estilo: CALMA_EST, sfx: ['minimo', 'organico'] },
      alineables: ['texto', 'calma', 'patron'],
      base: { orden: 'rango,datos,precio', hero: 'tarjeta', rango: 'pildoras', datos: 'lista', precio: 'grande', trans: 'barrido', tema: 'claro', entrada: 'subir', alin: 'centro',
        musica: { estilo: 'piano', sfx: 'digital', prog: 0, tono: 0, bpm: 96 } },
      colores: { fondo: '#F8ECE8', fondo_cierre: '#FBF6F2', tinta: '#0A0A0A', texto: '#2B2B2B', acento: '#8C6A4F', acento_suave: '#B89878' },
    },
    producto: {
      opciones: {
        orden: ordenes(['colores', 'datos', 'precio']),
        hero: ['tarjeta', 'abajo', 'polaroid'], colores: ['contador', 'fila', 'abanico'], datos: ['lista', 'numerada', 'etiquetas'], precio: ['grande', 'sello', 'etiqueta'],
        trans: TRANS, tema: ['claro', 'oscuro', 'acento'], entrada: ENTRADA,
        estilo: TODOS, sfx: SFX, prog: [0, 1, 2, 3], tono: [-2, -1, 0, 1, 2, 3],
      },
      visuales: ['orden', 'hero', 'colores', 'datos', 'precio', 'trans', 'tema', 'entrada'],
      reparto: ['orden', 'hero', 'colores', 'datos', 'precio', 'trans', 'tema'],
      pesos: { orden: 2, hero: 3, colores: 1.5, datos: 1.5, precio: 1.5, trans: 2.5, tema: 3, entrada: 1, hook: 2, estilo: 3.5, sfx: 1.5, prog: 1, tono: 0.5 },
      dur: { hook: 3.0, hero: 2.6, colores: 3.0, datos: 2.8, precio: 1.8, outro: 2.3 }, inicio: ['hook', 'hero'], fin: ['outro'],
      calma: { trans: ['fundido', 'barrido', 'zoom'], tema: ['claro'], entrada: ['subir', 'mascara'], estilo: CALMA_EST, sfx: ['minimo', 'organico'] },
      alineables: [],
      base: { orden: 'colores,datos,precio', hero: 'tarjeta', colores: 'contador', datos: 'lista', precio: 'grande', trans: 'barrido', tema: 'claro', entrada: 'subir',
        musica: { estilo: 'pizzicato', sfx: 'digital', prog: 0, tono: 0, bpm: 112 } },
      colores: { fondo: '#F6F0E4', fondo_cierre: '#14213D', tinta: '#14213D', texto: '#5B5648', acento: '#9A6B1E', acento_suave: '#E4B968' },
    },
    persona: {
      // la historia no se reordena (el gag depende del orden): varían el aspecto y las escenas de datos
      opciones: {
        paleta: ['neon', 'tinta', 'lima'], titulo: ['golpe', 'mascara', 'maquina'], cifras: ['columnas', 'foco', 'rejilla'],
        metodo: ['letras', 'linea', 'escalera'], stack: ['marquesina', 'cuadricula'], fondo: ['reticula', 'puntos', 'limpio'],
        estilo: TODOS.filter(e => e !== 'ambiente'), sfx: ['digital', 'cinematico', 'minimo', 'juguete'], prog: [0, 1, 2, 3], tono: [-2, -1, 0, 1, 2],
      },
      visuales: ['paleta', 'titulo', 'cifras', 'metodo', 'stack', 'fondo'],
      reparto: ['paleta', 'titulo', 'cifras', 'metodo', 'stack', 'fondo'],
      pesos: { paleta: 4, titulo: 1.5, cifras: 2, metodo: 2, stack: 1.5, fondo: 1, estilo: 3.5, sfx: 1.5, prog: 1, tono: 0.5 },
      base: { paleta: 'neon', titulo: 'golpe', cifras: 'columnas', metodo: 'letras', stack: 'marquesina', fondo: 'reticula', musica: { estilo: 'electro', sfx: 'digital', prog: 0, tono: 0, bpm: 128 } },
    },
  };

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

  // Tokens semánticos que usan los motores 9:16:
  //   bg fondo de escena · fg texto principal · fg2 texto secundario · acc acento (títulos, trazos)
  //   acc2 acento suave (decoración) · onFg texto sobre relleno fg · onAcc texto sobre relleno acc · card marco de foto
  function tema(base, colores, nombre) {
    const k = Object.assign({}, base, colores || {});
    let t;
    if (nombre === 'oscuro') {
      const bg = mix(k.tinta, k.acento, 0.10);
      const fg = primero(bg, [k.fondo_cierre, k.fondo, '#FFFFFF'], 7); // el claro de la marca que cumpla, no el blanco por defecto
      const acc = primero(bg, [k.acento_suave, mix(k.acento_suave, fg, 0.4), k.fondo], 3);
      t = { bg, fg, fg2: mix(fg, bg, 0.22), acc, acc2: mix(k.acento, fg, 0.25), onFg: k.tinta };
    } else if (nombre === 'acento') {
      const bg = k.acento, fg = primero(bg, [k.fondo_cierre, k.fondo, k.tinta], 4.5);
      const acc = primero(bg, [k.tinta, k.fondo_cierre, k.fondo].filter(c => c !== fg), 3);
      t = { bg, fg, fg2: mix(fg, bg, 0.15), acc, acc2: mix(fg, bg, 0.45), onFg: bg };
    } else {
      t = { bg: k.fondo, fg: k.tinta, fg2: k.texto, acc: k.acento, acc2: k.acento_suave, onFg: '#FFFFFF' };
    }
    t.nombre = nombre || 'claro';
    t.cierre = k.fondo_cierre;      // el cierre de marca no cambia de tema: es la firma
    t.cierreTexto = k.texto; t.cierreTinta = k.tinta; t.cierreAcc = k.acento;
    t.card = '#FFFFFF';
    t.onAcc = mejor(t.acc, [t.bg, k.fondo_cierre, k.tinta, '#FFFFFF']);
    t.ok = contraste(t.fg, t.bg) >= 4.5 && contraste(t.acc, t.bg) >= 3; // si no llega, el planificador no lo usa
    return t;
  }

  // ---------------------------------------------------------------- un perfil listo para usar
  function perfil(nombre) {
    const P = PERFILES[nombre];
    if (!P) throw new Error('Perfil desconocido: ' + nombre);
    const MUS = ['estilo', 'sfx', 'prog', 'tono'];
    const MAXD = Object.values(P.pesos).reduce((s, v) => s + v, 0);

    function tiempos(orden) {
      if (!P.dur) return null;
      const escenas = [...P.inicio, ...orden.split(','), ...P.fin];
      let a = 0;
      return escenas.map(n => { const s = { n, a: +a.toFixed(2), b: +(a + P.dur[n]).toFixed(2) }; a += P.dur[n]; return s; });
    }
    // plan equivalente a la v1 (se usa cuando un vídeo no trae plan)
    function planBase() {
      const b = JSON.parse(JSON.stringify(P.base));
      return Object.assign({ v: 2, base: true, hook: 0 }, b, P.dur ? { tiempos: tiempos(b.orden) } : {});
    }
    function distancia(a, b) {
      let d = 0;
      for (const k of P.visuales) if (a[k] !== b[k]) d += P.pesos[k] || 0;
      for (const k of MUS) if ((a.musica || {})[k] !== (b.musica || {})[k]) d += P.pesos[k] || 0;
      if ('hook' in P.pesos && (a._cat !== b._cat || a.hook !== b.hook)) d += P.pesos.hook;
      return d;
    }

    // items en ORDEN DE PUBLICACIÓN ({id, categoria?, gag?, hooks?, plan?}). Conserva los planes de la misma
    // temporada salvo opts.rehacer. cfg: bloque "variacion" (restricciones de la marca, ventana, temporada).
    function planificar(items, colores, cfg = {}, opts = {}) {
      const temporada = String(opts.temporada || cfg.temporada || '1');
      const ventana = cfg.ventana || 12, intentos = cfg.intentos || 400;
      const ops = {};
      for (const k in P.opciones) ops[k] = (cfg[k] || P.opciones[k]).slice();
      if (ops.tema) { ops.tema = ops.tema.filter(n => tema(P.colores, colores, n).ok); if (!ops.tema.length) ops.tema = ['claro']; }
      const uso = {}; const cuenta = (k, v) => { uso[k] = uso[k] || {}; uso[k][v] = (uso[k][v] || 0) + 1; };
      const hist = [];
      const turno = {}; // el gancho rota por turnos DENTRO de cada categoría (con desfase por temporada)
      let n = 0;
      for (const it of items) {
        const calma = it.gag === 'calma' && P.calma;
        const nHooks = (it.hooks && it.hooks.length) || 1, cat = it.categoria || it.id;
        let plan = it.plan;
        const conservar = plan && plan.v === 2 && !plan.base && plan.temporada === temporada && !opts.rehacer;
        // v3: un plan conservado de la v2 no tiene estilo de música -> se planifica SOLO la música y lo visual se queda
        const soloMusica = conservar && !(plan.musica && plan.musica.estilo);
        if (!conservar || soloMusica) {
          const r = rng(hash(temporada + '|' + it.id));
          const op = k => { // carril tranquilo: opciones de "calma" que la marca no haya excluido (el fundido siempre vale)
            if (!(calma && P.calma[k])) return ops[k];
            const f = P.calma[k].filter(v => !cfg[k] || cfg[k].includes(v) || v === 'fundido');
            return f.length ? f : P.calma[k];
          };
          const temasOk = ops.tema ? op('tema').filter(t => ops.tema.includes(t)) : null;
          let best = null, bestS = -Infinity;
          for (let i = 0; i < intentos; i++) {
            const c = soloMusica ? Object.assign({}, plan) : { v: 2, temporada };
            if (!soloMusica) for (const k of P.visuales) {
              if (k === 'tema') c.tema = pick(r, temasOk.length ? temasOk : ['claro']);
              else if (k === 'alin') c.alin = P.alineables.includes(it.gag) ? pick(r, ops.alin) : 'centro';
              else c[k] = pick(r, op(k));
            }
            c.musica = {}; for (const k of MUS) c.musica[k] = pick(r, op(k));
            // el tempo sale del rango del estilo (pares); la semilla compone la melodía y elige batería y rellenos
            const [b0, b1] = ESTILOS[c.musica.estilo] || [96, 96];
            c.musica.bpm = b0 + 2 * Math.floor(r() * ((b1 - b0) / 2 + 1));
            c.musica.semilla = Math.floor(r() * 1e6);
            if (!soloMusica) c.hook = (hash(temporada + '|' + cat) + (turno[cat] || 0)) % nHooks;
            c._cat = cat;
            // 1) que se parezca lo menos posible a los vecinos (más peso a los más cercanos)
            const prev = hist.slice(-ventana);
            let minCerca = MAXD, media = 0, wsum = 0;
            prev.forEach((h, j) => { const age = prev.length - j; const d = distancia(c, h); if (age <= 4) minCerca = Math.min(minCerca, d); const w = 1 / age; media += w * d; wsum += w; });
            media = wsum ? media / wsum : MAXD;
            // 2) que cada opción se use de forma equilibrada en todo el lote
            let deseq = 0;
            if (n) for (const k of P.reparto) deseq += ((uso[k] && uso[k][c[k]]) || 0) / n;
            if (n) for (const k of ['estilo', 'sfx']) deseq += 1.5 * ((uso[k] && uso[k][c.musica[k]]) || 0) / n; // la música, tan repartida como lo visual
            const s = 2 * minCerca + media - 3 * deseq + r() * 0.01;
            if (s > bestS) { bestS = s; best = c; }
          }
          plan = best;
          if (P.dur && !soloMusica) plan.tiempos = tiempos(plan.orden);
        }
        plan._cat = cat;
        turno[cat] = (turno[cat] || 0) + 1;
        for (const k of P.reparto) cuenta(k, plan[k]);
        if (plan.musica) for (const k of ['estilo', 'sfx']) cuenta(k, plan.musica[k]);
        hist.push(plan); n++;
        const limpio = Object.assign({}, plan); delete limpio._cat;
        it.plan = limpio;
      }
      return informe(hist);
    }

    function informe(hist) {
      const ejes = P.visuales.filter(k => k !== 'alin');
      const reparto = {};
      for (const k of ejes) { reparto[k] = {}; for (const h of hist) reparto[k][h[k]] = (reparto[k][h[k]] || 0) + 1; }
      for (const k of ['estilo', 'sfx']) { reparto['música: ' + k] = {}; for (const h of hist) { const v = (h.musica || {})[k] || '—'; reparto['música: ' + k][v] = (reparto['música: ' + k][v] || 0) + 1; } }
      let musIguales = 0;
      for (let i = 1; i < hist.length; i++) if ((hist[i].musica || {}).estilo && (hist[i].musica || {}).estilo === (hist[i - 1].musica || {}).estilo) musIguales++;
      const firmas = new Set(hist.map(h => ejes.map(k => h[k]).join('|')));
      let minVecino = Infinity, suma = 0, iguales = 0;
      for (let i = 1; i < hist.length; i++) {
        const d = distancia(hist[i], hist[i - 1]); minVecino = Math.min(minVecino, d); suma += d;
        if (ejes.every(k => hist[i][k] === hist[i - 1][k])) iguales++;
      }
      return { total: hist.length, combinacionesVisuales: firmas.size, distanciaMinVecinos: hist.length > 1 ? minVecino : null,
        distanciaMediaVecinos: hist.length > 1 ? +(suma / (hist.length - 1)).toFixed(2) : null, maximo: MAXD, vecinosIguales: iguales, musicaVecinaIgual: musIguales, reparto };
    }

    return { nombre, P, OPCIONES: P.opciones, DUR: P.dur, MUSICA: MUS,
      tema: (colores, n) => tema(P.colores || {}, colores, n), tiempos, planBase, distancia, planificar,
      informe: items => informe(items.map(it => Object.assign({}, it.plan || planBase(), { _cat: it.categoria || it.id }))) };
  }

  const api = { PERFILES, perfil, hash, rng, mix, contraste, lum, ESTILOS, SFX, CALMA_EST };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.VAR = api;
})(typeof window !== 'undefined' ? window : globalThis);
