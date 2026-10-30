/* Verificaciones del controlador de la aplicación (src/ui/controller.js): máquina de estados sin DOM. */
(function () {
  const { test, assert, deepEqual } = Harness;
  const LA = LinAlg, S = Scene, K = Controller, C = Camera;

  const mv = (d) => ({ type: 'piece', action: { type: 'translate', delta: d } });
  const rot = (axis, turns) => ({ type: 'piece', action: { type: 'rotate', axis, turns } });
  const pose = (ctrl, id) => ctrl.state.scene.pieces.find((p) => p.id === id);

  test('controlador: estado inicial = escena por defecto, modo normal y vista sin aviso', () => {
    const ctrl = K.create();
    const v = ctrl.tick(0);
    assert(v.mode === 'normal' && v.scene.pieces.length === 7 && v.caption === '' && v.last.ok === true, JSON.stringify(v.last));
    assert(deepEqual(v.camera_params, C.default_params()), 'cámara por defecto');
  });

  test('controlador: una traslación se ANIMA (pose intermedia con set_pose) y se confirma exacta al terminar', () => {
    const ctrl = K.create();
    ctrl.dispatch(mv([1, 0, 0]), 1000);
    const mid = ctrl.tick(1000 + K.MOVE_MS / 2);
    const x = mid.scene.pieces[0].t[0];
    assert(x > 0 && x < 1, 'a mitad del movimiento x está entre 0 y 1: ' + x);
    assert(deepEqual(pose(ctrl, 'p1').t, [0, 0, 0]), 'el estado lógico no cambia hasta confirmar');
    const end = ctrl.tick(1000 + K.MOVE_MS + 1);
    assert(deepEqual(end.scene.pieces[0].t, [1, 0, 0]) && deepEqual(pose(ctrl, 'p1').t, [1, 0, 0]), 'confirmada en la retícula');
  });

  test('controlador: una rotación se anima con matrices de rotación reales y termina en R entera', () => {
    const ctrl = K.create();
    ctrl.dispatch({ type: 'piece', action: { type: 'select', index: 4 } }, 0);       // tornillo
    ctrl.dispatch(rot('x', 1), 100);
    for (const f of [0.2, 0.5, 0.8]) {
      const R = ctrl.tick(100 + K.ROTATE_MS * f).scene.pieces[4].R;
      assert(LA.isRotation(R, 1e-9) && !R.every((r) => r.every(Number.isInteger)), 'rotación continua en f=' + f);
    }
    ctrl.tick(100 + K.ROTATE_MS + 1);
    const R = pose(ctrl, 'p5').R;
    assert(R.every((r) => r.every(Number.isInteger)) && LA.isRotation(R, 1e-12), 'R entera y ortonormal');
  });

  test('controlador: dos comandos seguidos no pierden el primero (se confirma antes de empezar el segundo)', () => {
    const ctrl = K.create();
    ctrl.dispatch(mv([1, 0, 0]), 0);
    ctrl.dispatch(mv([0, 1, 0]), 50);                     // llega con el primero a medias
    ctrl.tick(50 + K.MOVE_MS + 1);
    assert(deepEqual(pose(ctrl, 'p1').t, [1, 1, 0]), 't = ' + pose(ctrl, 'p1').t);
  });

  test('controlador: una acción rechazada deja un aviso visible (toast) durante TOAST_MS y luego se oculta', () => {
    const ctrl = K.create();
    ctrl.dispatch(mv([-1, 0, 0]), 1000);                  // L está pegada a la pared X = 0
    const v = ctrl.tick(1100);
    assert(v.last.ok === false && /fuera del contenedor/.test(v.last.error), 'rechazada: ' + v.last.error);
    assert(v.caption.startsWith('⚠') && /fuera del contenedor/.test(v.caption), 'aviso: ' + v.caption);
    assert(ctrl.tick(1000 + K.TOAST_MS + 10).caption === '', 'el aviso desaparece');
    assert(deepEqual(pose(ctrl, 'p1').t, [0, 0, 0]), 'la pieza no se movió');
  });

  test('controlador: mover la cámara no cambia la escena lógica; reset la devuelve a la vista inicial', () => {
    const ctrl = K.create();
    const snap = JSON.stringify(ctrl.state.scene);
    ctrl.dispatch({ type: 'camera', delta: { d_azimuth: 1, d_elevation: 0.3, distance_factor: 0.5, d_fov: 0.2 } }, 0);
    assert(ctrl.tick(1).camera_params.azimuth !== C.default_params().azimuth, 'la cámara cambió');
    assert(JSON.stringify(ctrl.state.scene) === snap, 'la escena no cambió');
    ctrl.dispatch({ type: 'camera_reset' }, 2);
    assert(deepEqual(ctrl.tick(3).camera_params, C.default_params()), 'reset');
  });

  test('controlador: victoria — otras poses solo en la visualización, piezas bloqueadas, cámara activa, y al terminar restaura todo', () => {
    const ctrl = K.create();
    const logical = JSON.stringify(ctrl.state.scene);
    ctrl.dispatch({ type: 'app', op: 'victory' }, 0);
    const v = ctrl.tick(3000);
    assert(v.mode === 'victory' && v.caption.length > 10, 'modo y texto: ' + v.caption);
    assert(JSON.stringify(v.scene.pieces) !== JSON.stringify(ctrl.state.scene.pieces), 'la visualización tiene otras poses');
    assert(JSON.stringify(ctrl.state.scene) === logical, 'el estado lógico no cambia');
    ctrl.dispatch(mv([1, 0, 0]), 3100);
    assert(/animación/.test(ctrl.tick(3100).note) && JSON.stringify(ctrl.state.scene) === logical, 'las piezas no se mueven durante la victoria');
    ctrl.dispatch({ type: 'camera', delta: { d_azimuth: 0.4 } }, 3200);
    assert(ctrl.tick(3200).camera_params.azimuth !== C.default_params().azimuth, 'la cámara SÍ se mueve durante la victoria');
    const end = ctrl.tick(Victory.DURATION * 1000 + 10);
    assert(end.mode === 'victory' || end.mode === 'normal', 'transición');
    const after = ctrl.tick(Victory.DURATION * 1000 + 30);
    assert(after.mode === 'normal' && /terminada/.test(after.note) && JSON.stringify(ctrl.state.scene) === logical, 'termina y restaura');
  });

  test('controlador: Esc detiene la victoria; Esc sin animación no hace nada', () => {
    const ctrl = K.create();
    ctrl.dispatch({ type: 'app', op: 'stop' }, 0);
    assert(ctrl.tick(1).mode === 'normal', 'sin efecto');
    ctrl.dispatch({ type: 'app', op: 'victory' }, 10);
    ctrl.dispatch({ type: 'app', op: 'stop' }, 20);
    assert(ctrl.tick(30).mode === 'normal', 'detenida');
  });

  test('controlador: demo — parte de la escena y la cámara iniciales, deja mover la cámara y restaura lo previo al detenerse o terminar', () => {
    const ctrl = K.create();
    ctrl.dispatch(mv([1, 0, 0]), 0); ctrl.tick(500);                                   // el usuario ya movió una pieza
    ctrl.dispatch({ type: 'camera', delta: { d_azimuth: 0.9 } }, 500);
    const userScene = JSON.stringify(ctrl.state.scene), userCam = JSON.stringify(ctrl.state.cam);
    ctrl.dispatch({ type: 'app', op: 'demo' }, 1000);
    assert(ctrl.state.mode === 'demo' && deepEqual(ctrl.state.cam, C.default_params()), 'la demo parte de la cámara inicial');
    const v0 = ctrl.tick(1000);
    assert(deepEqual(v0.scene.pieces, S.create_scene().pieces) && /1\/4/.test(v0.caption), 'y de la escena inicial: ' + v0.caption);
    assert(/2\/4/.test(ctrl.tick(1000 + 8000).caption) && /4\/4/.test(ctrl.tick(1000 + 31000).caption), 'secciones');
    ctrl.dispatch({ type: 'camera', delta: { d_azimuth: 0.5 } }, 9000);
    const expect = Demo.state_at(8.1, S.create_scene(), ctrl.state.cam).camera_params.azimuth;
    assert(Math.abs(ctrl.tick(9100).camera_params.azimuth - expect) < 1e-9, 'la cámara del usuario se suma al guion');
    ctrl.dispatch({ type: 'app', op: 'demo' }, 12000);                                  // M otra vez = detener
    assert(ctrl.state.mode === 'normal' && JSON.stringify(ctrl.state.scene) === userScene && ctrl.state.cam.azimuth !== C.default_params().azimuth, 'restaura escena y cámara previas (al detener)');
    ctrl.dispatch({ type: 'app', op: 'demo' }, 20000);
    const camDuring = JSON.stringify(ctrl.state.saved.cam);
    ctrl.tick(20000 + Demo.DURATION * 1000 + 50);
    assert(ctrl.state.mode === 'normal' && JSON.stringify(ctrl.state.scene) === userScene && JSON.stringify(ctrl.state.cam) === camDuring, 'también al terminar');
    assert(userCam.length > 0, 'cámara del usuario registrada');
  });

  test('controlador: la demo es repetible — dos ejecuciones dan exactamente la misma secuencia de vistas', () => {
    const run = () => {
      const ctrl = K.create(); ctrl.dispatch({ type: 'app', op: 'demo' }, 0);
      return [0, 2500, 7000, 13000, 19000, 25000, 30000, 33000, 35900].map((ms) => { const v = ctrl.tick(ms); return JSON.stringify([v.scene, v.camera_params, v.caption]); }).join('|');
    };
    assert(run() === run(), 'misma secuencia');
  });

  test('controlador: la victoria lanzada durante la demo se rechaza con una nota; comandos inválidos no lanzan', () => {
    const ctrl = K.create();
    ctrl.dispatch({ type: 'app', op: 'demo' }, 0);
    ctrl.dispatch({ type: 'app', op: 'victory' }, 10);
    assert(ctrl.state.mode === 'demo' && /demo ya incluye/.test(ctrl.tick(20).note), 'nota');
    for (const bad of [null, undefined, 5, 'x', {}, { type: 'piece' }, { type: 'piece', action: null }, { type: 'camera' }, { type: 'app', op: 'volar' }, { type: 'nada' }]) ctrl.dispatch(bad, 30);
    const c2 = K.create();
    for (const bad of [null, undefined, 5, {}, { type: 'piece' }, { type: 'piece', action: { type: 'rotate', axis: 'q', turns: 1 } }, { type: 'camera' }]) c2.dispatch(bad, 0);
    assert(c2.tick(1).scene.pieces.length === 7, 'sigue funcionando');
  });
})();
