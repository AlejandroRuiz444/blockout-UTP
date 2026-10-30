/*
 * Verificaciones de arquitectura (solo Node: leen los archivos fuente).
 * Comprueban la separación por capas, dependencias en un solo sentido, ausencia de motores gráficos/CDN/módulos ES y
 * que index.html carga los módulos en el orden del manifiesto. Ver docs/ARQUITECTURA.md.
 */
(function () {
  if (typeof require !== 'function' || typeof process === 'undefined') return; // en el navegador no hay acceso a archivos
  const fs = require('fs'), path = require('path');
  const { test, assert } = Harness;
  const { MODULES, NAMESPACES, LEVEL } = require('./manifest.js');
  const root = path.join(__dirname, '..');
  const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
  // Se descartan comentarios y cadenas: solo importa lo que el CÓDIGO referencia.
  const code = (rel) => read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1')
    .replace(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g, "''");
  const srcOf = (m) => 'src/' + m + '.js';
  const layerOf = (m) => m.split('/')[0];

  test('arquitectura: la estructura de carpetas src/{core,scene,projection,animation,ui} existe y cada archivo del manifiesto está', () => {
    for (const m of MODULES) assert(fs.existsSync(path.join(root, srcOf(m))), 'falta ' + srcOf(m));
    const onDisk = [];
    for (const dir of ['core', 'scene', 'projection', 'animation', 'ui']) for (const f of fs.readdirSync(path.join(root, 'src', dir))) onDisk.push(dir + '/' + f.replace(/\.js$/, ''));
    assert(onDisk.sort().join() === MODULES.slice().sort().join(), 'archivos sin registrar en el manifiesto: ' + onDisk.filter((x) => !MODULES.includes(x)).join());
  });

  test('arquitectura: todos los scripts (incluido ui/main.js, que solo corre en el navegador) compilan sin errores de sintaxis', () => {
    for (const m of MODULES) {
      try { new Function(read(srcOf(m))); } catch (e) { throw new Error(srcOf(m) + ': ' + e.message); }
    }
  });

  test('arquitectura: las dependencias solo apuntan hacia capas inferiores; escena y proyección no se conocen entre sí', () => {
    const bad = [];
    for (const m of MODULES) {
      const c = code(srcOf(m)), mine = layerOf(m);
      for (const [ns, info] of Object.entries(NAMESPACES)) {
        if (info.file === m || !new RegExp('\\b' + ns + '\\b').test(c)) continue;
        const theirs = info.layer;
        const ok = theirs === mine || LEVEL[theirs] < LEVEL[mine];
        if (!ok) bad.push(m + ' usa ' + ns + ' (' + theirs + ')');
      }
    }
    assert(bad.length === 0, bad.join('; '));
    // reglas explícitas del enunciado: A no sabe de cámara/pantalla; B no sabe de piezas
    assert(!/\b(Camera|Projection|Homography)\b/.test(code('src/scene/scene.js')), 'scene.js conoce la cámara');
    assert(!/\b(Scene|Pieces|PIECE_DEFS|apply_action|create_scene|get_geometry)\b/.test(MODULES.filter((m) => layerOf(m) === 'projection').map((m) => code(srcOf(m))).join('\n')), 'la proyección conoce la escena');
  });

  test('arquitectura: solo la capa ui toca el DOM; el controlador, la animación y el dominio son puros (sin document/window/canvas)', () => {
    const dom = /\b(document|window|canvas|getContext|requestAnimationFrame|performance)\b/;
    for (const m of MODULES) {
      const l = layerOf(m);
      if (l === 'ui' && ['ui/input', 'ui/main', 'ui/homography_panel', 'ui/hud'].includes(m)) continue;   // vistas y cableado del DOM
      assert(!dom.test(code(srcOf(m))), srcOf(m) + ' toca el DOM');
    }
    assert(!/\bdocument\b/.test(code('src/ui/hud.js').replace(/function mount[\s\S]*$/, '')), 'los constructores de texto del HUD no usan el DOM');
  });

  test('arquitectura: sin motores gráficos 3D, sin CSS 3D, sin CDN ni recursos remotos, sin módulos ES', () => {
    const files = MODULES.map(srcOf).concat(['index.html', 'css/style.css', 'tests/index.html']);
    for (const f of files) {
      const src = code(f);
      for (const bad of [/webgl/i, /\bTHREE\b/, /three\.js/i, /matrix3d/i, /translate3d/i, /rotate3d/i, /perspective\s*\(/i, /\bgl\./]) assert(!bad.test(src), f + ' usa ' + bad);
      assert(!/(src|href)\s*=\s*["']https?:/i.test(read(f)) && !/url\(\s*["']?https?:/i.test(read(f)) && !/@import/i.test(read(f)), f + ' referencia un recurso remoto');
      // `code()` descarta las cadenas, y 'webgl' / 'webgl2' / 'experimental-webgl' son justo cadenas de getContext: el único contexto permitido es '2d'
      const sin_comentarios = read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
      assert(!/getContext\(\s*(?!['"]2d['"][\s,)])/.test(sin_comentarios), f + ' pide un contexto de canvas distinto de 2d (WebGL/WebGPU)');
      assert(!/type\s*=\s*["']module["']/i.test(read(f)), f + ' usa <script type="module">');
      if (f.endsWith('.js')) assert(!/^\s*(import|export)\s/m.test(read(f)), f + ' usa módulos ES (bloqueados en file://)');
    }
  });

  test('arquitectura: index.html carga los módulos en el orden del manifiesto con <script src> clásicos y locales', () => {
    const html = read('index.html');
    const srcs = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map((m) => m[1]);
    assert(srcs.join() === MODULES.map(srcOf).join(), 'orden de scripts: ' + srcs.join());
    assert(/<link[^>]+href="css\/style\.css"/.test(html), 'hoja de estilos local');
    const thtml = read('tests/index.html');
    for (const m of MODULES.filter((x) => x !== 'ui/main')) assert(thtml.includes('../src/' + m + '.js'), 'tests/index.html no carga ' + m);
  });

  test('arquitectura: cada módulo expone su API pública documentada', () => {
    const need = {
      Scene: ['create_scene', 'apply_action', 'get_geometry'], Pieces: ['DEFS'], Mesh: ['polycube_edges', 'from_segments'], Container: ['objects'],
      Camera: ['build_camera'], Projection: ['project'], Homography: ['plane_homography', 'between_views', 'dlt', 'run_experiment'],
      Easing: ['smoothstep', 'in_out_cubic', 'out_cubic'], Motion: ['interpolate_rotation', 'rotation_action', 'apply_actions'],
      Victory: ['actions', 'tower_layout'], Demo: ['state_at'], Input: ['map_key'], Render: ['draw_scene'], Hud: ['piece_text', 'mount'],
      Controller: ['create'], HomographyPanel: ['create'],
    };
    for (const [mod, fns] of Object.entries(need)) for (const fn of fns) assert(globalThis[mod][fn] !== undefined, mod + '.' + fn);
    assert(Object.keys(NAMESPACES).every((ns) => globalThis[ns]), 'todos los namespaces del manifiesto están cargados');
  });
})();
