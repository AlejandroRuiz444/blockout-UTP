/* Verificaciones del HUD (src/ui/hud.js): constructores de texto puros. */
(function () {
  const { test, assert } = Harness;
  const S = Scene, C = Camera, P = Projection, H = Hud;

  const scene = S.create_scene();
  const camera = C.build_camera(C.default_params());
  const prims = P.project(S.get_geometry(scene), camera, camera.viewport);

  test('hud: piece_text describe la pieza activa (nombre, pivote, R, t y celdas)', () => {
    const t = H.piece_text(scene);
    assert(/Tricubo L/.test(t) && /p1/.test(t) && /pivote local p = \(1\.5, 0\.5, 0\.5\)/.test(t) && /R \(local→mundo/.test(t) && /celdas ocupadas: \(0,0,0\) \(1,0,0\) \(1,1,0\)/.test(t), t);
    assert(H.piece_text({ pieces: [], active: null }) === 'Sin pieza activa', 'sin pieza activa');
    const moving = S.apply_action(scene, { type: 'set_pose', id: 'p1', R: LinAlg.axisAngle([1, 1, 0], 0.3), t: [0.2, 0, 0] });
    assert(/pose continua/.test(H.piece_text(moving)), 'pose continua durante la animación');
  });

  test('hud: camera_text y matrices_text muestran K, [R|t] y M con la fórmula de la cadena de proyección', () => {
    const c = H.camera_text(camera);
    assert(/acimut = -50\.0°/.test(c) && /elevación = 25\.0°/.test(c) && /FOV vertical = 45\.0°/.test(c) && /plano cercano z_c ≥ 0\.1/.test(c), c);
    const m = H.matrices_text(camera, scene.pieces[0]);
    assert(/λ·\[u v 1\]ᵀ = K · \[R \| t\] · M/.test(m) && /K \(3×3\)/.test(m) && /\[R \| t\] \(3×4/.test(m) && /M de p1 \(4×4/.test(m), m);
    assert(!/-0\.000|NaN|undefined/.test(m), 'sin -0.000 ni NaN: ' + m);
    assert(!/M de/.test(H.matrices_text(camera, null)), 'sin pieza no hay M');
  });

  test('hud: status_text distingue nota, acción rechazada y acción correcta, e incluye los contadores del recorte', () => {
    let s = H.status_text({ last: { ok: true, action: 'translate' }, note: null }, prims);
    assert(s.cls === 'ok' && /Última acción: translate → OK/.test(s.text) && /dibujadas/.test(s.text) && /recortadas contra el plano cercano/.test(s.text), s.text);
    s = H.status_text({ last: { ok: false, action: 'rotate', error: 'rotación bloqueada: fuera del contenedor' }, note: null }, prims);
    assert(s.cls === 'err' && /rechazada: rotación bloqueada/.test(s.text), s.text);
    s = H.status_text({ last: { ok: false, action: 'x', error: 'y' }, note: 'Hola' }, prims);
    assert(s.cls === '' && s.text.startsWith('Hola'), 'la nota tiene prioridad');
    s = H.status_text({ last: {}, note: null }, { stats: prims.stats, error: 'cámara inválida' });
    assert(/ERROR: cámara inválida/.test(s.text), 'error de proyección');
  });

  test('hud: matrix_text formatea sin -0 y con el ancho pedido', () => {
    assert(/-0\.001/.test(H.matrix_text([[-6e-4]], 3)), 'un valor que no redondea a cero conserva su signo');
    const t = H.matrix_text([[1, -1e-12, -4e-4], [0, 1, 0]], 3);
    assert(t.split('\n').length === 2 && !/-0\.000/.test(t) && /1\.000/.test(t), t);
  });
})();
