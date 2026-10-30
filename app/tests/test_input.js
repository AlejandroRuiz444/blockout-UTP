/* Verificaciones del mapeo entrada -> acciones (input.js). */
(function () {
  const { test, assert, deepEqual } = Harness;
  const I = Input, S = Scene;

  test('entrada: flechas trasladan en X/Y; Shift+↑/↓ y PgUp/PgDn en Z', () => {
    assert(deepEqual(I.map_key('ArrowLeft', false).action, { type: 'translate', delta: [-1, 0, 0] }), '←');
    assert(deepEqual(I.map_key('ArrowUp', false).action.delta, [0, 1, 0]), '↑');
    assert(deepEqual(I.map_key('ArrowUp', true).action.delta, [0, 0, 1]), 'Shift+↑');
    assert(deepEqual(I.map_key('PageDown', false).action.delta, [0, 0, -1]), 'PgDn');
  });

  test('entrada: Q/A, W/S, E/D rotan ±90° alrededor de X, Y, Z; Tab/Shift+Tab y 1–7 seleccionan', () => {
    assert(deepEqual(I.map_key('KeyQ').action, { type: 'rotate', axis: 'x', turns: 1 }) && I.map_key('KeyA').action.turns === -1, 'X');
    assert(I.map_key('KeyW').action.axis === 'y' && I.map_key('KeyE').action.axis === 'z' && I.map_key('KeyD').action.turns === -1, 'Y, Z');
    assert(I.map_key('Tab', false).action.type === 'select_next' && I.map_key('Tab', true).action.type === 'select_prev', 'Tab');
    assert(deepEqual(I.map_key('Digit3').action, { type: 'select', index: 2 }), 'Digit3');
  });

  test('entrada: cámara (J/L/I/K órbita, −/= distancia, [/] FOV, R reset) y app (V, M, H, Esc)', () => {
    assert(I.map_key('KeyJ').delta.d_azimuth < 0 && I.map_key('KeyL').delta.d_azimuth > 0, 'acimut');
    assert(I.map_key('KeyI').delta.d_elevation > 0 && I.map_key('KeyK').delta.d_elevation < 0, 'elevación');
    assert(I.map_key('Minus').delta.distance_factor > 1 && I.map_key('Equal').delta.distance_factor < 1, 'distancia');
    assert(I.map_key('BracketLeft').delta.d_fov < 0 && I.map_key('BracketRight').delta.d_fov > 0, 'fov');
    assert(I.map_key('KeyR').type === 'camera_reset', 'reset');
    assert(['victory', 'demo', 'homography', 'stop'].join() === ['KeyV', 'KeyM', 'KeyH', 'Escape'].map((k) => I.map_key(k).op).join(), 'app');
  });

  test('entrada: teclas no asignadas o valores raros devuelven null sin lanzar', () => {
    for (const c of ['KeyZ', 'F5', '', undefined, null, 5, 'toString', '__proto__', 'Digit0']) assert(I.map_key(c, false) === null, String(c));
  });

  test('entrada: todo comando de pieza es una acción que apply_action sabe interpretar (nunca "tipo desconocido")', () => {
    const sc = S.create_scene();
    for (const code of Object.keys(I.KEYS).concat(['Digit1', 'Digit7'])) {
      const cmd = I.map_key(code, false);
      if (cmd.type !== 'piece') continue;
      const out = S.apply_action(sc, cmd.action);
      assert(!/desconocido|inválida/.test(out.last.error || ''), code + ': ' + out.last.error);
    }
  });

  test('entrada: attach conecta teclado, arrastre y rueda; detach los desconecta', () => {
    const mk = () => { const h = {}; return { h, addEventListener: (t, f) => { h[t] = f; }, removeEventListener: (t) => { delete h[t]; } }; };
    const win = mk(), cv = mk();
    const got = [];
    const detach = I.attach(win, cv, (c) => got.push(c));
    win.h.keydown({ code: 'KeyE', shiftKey: false, target: { tagName: 'BODY' }, preventDefault() {} });
    win.h.keydown({ code: 'KeyE', shiftKey: false, target: { tagName: 'INPUT' }, preventDefault() {} });    // foco en un campo: se ignora
    win.h.keydown({ code: 'KeyE', ctrlKey: true, target: {}, preventDefault() {} });                          // Ctrl+E: se ignora
    cv.h.pointerdown({ clientX: 100, clientY: 100 });
    cv.h.pointermove({ clientX: 110, clientY: 95 });
    cv.h.pointerup({});
    cv.h.pointermove({ clientX: 150, clientY: 150 });                                                         // sin botón: se ignora
    cv.h.wheel({ deltaY: 100, preventDefault() {} });
    assert(got.length === 3, 'comandos: ' + got.length);
    assert(got[0].action.axis === 'z', 'tecla');
    assert(got[1].delta.d_azimuth < 0 && got[1].delta.d_elevation < 0, 'arrastre a la derecha y arriba: ' + JSON.stringify(got[1]));
    assert(got[2].delta.distance_factor > 1, 'rueda hacia abajo aleja');
    detach();
    assert(Object.keys(win.h).length === 0 && Object.keys(cv.h).length === 0, 'desconectado');
  });
})();
