/* Verificaciones del modo demostración (src/animation/demo.js). */
(function () {
  const { test, assert, approx, approxMat, deepEqual } = Harness;
  const LA = LinAlg, S = Scene, D = Demo, C = Camera, P = Projection;

  const base = S.create_scene();
  const cam0 = C.default_params();

  test('demo: el guion es determinista — mismo instante, mismo estado (escena y cámara)', () => {
    for (const t of [0, 2.9, 3.5, 6.9, 10, 16.5, 19, 23, 26, 29.1, 31.7, 35, D.DURATION]) {
      assert(JSON.stringify(D.state_at(t, base, cam0)) === JSON.stringify(D.state_at(t, base, cam0)), 'repetible en t=' + t);
    }
    assert(JSON.stringify(base) === JSON.stringify(S.create_scene()), 'la escena inicial no se modificó');
  });

  test('demo: dura lo que la victoria más 28 s de preludio y muestra en orden escena, transformaciones, cámara y victoria', () => {
    assert(D.DURATION === D.VICTORY_START + Victory.DURATION, 'duración = inicio de victoria + Victory.DURATION');
    const labels = [1, 8, 20, 30].map((t) => D.state_at(t, base, cam0).label);
    assert(labels.join('|') === '1/4 · Escena principal|2/4 · Transformaciones de piezas|3/4 · Cámara móvil|4/4 · Animación de victoria', labels.join('|'));
    assert(D.state_at(1, base, cam0).scene.pieces.every((p, i) => deepEqual(p, base.pieces[i])), 'en la sección 1 la escena está intacta');
    assert(!D.state_at(8, base, cam0).scene.pieces.every((p, i) => deepEqual(p, base.pieces[i])), 'en la sección 2 hay piezas transformadas');
    assert(D.state_at(30, base, cam0).victory_t > 0 && D.state_at(20, base, cam0).victory_t === 0, 'victoria solo en la sección 4');
  });

  test('demo: todos los pasos de pieza son acciones VÁLIDAS sobre la escena inicial (ninguna es rechazada)', () => {
    let sc = base;
    for (const st of D.PIECE_STEPS) {
      sc = S.apply_action(sc, D.commit_action(st));
      assert(sc.last.ok, st.caption + ': ' + sc.last.error);
    }
  });

  test('demo: posiciones finales del guion deterministas (valores esperados calculados a mano)', () => {
    const expected = {
      p1: { R: LA.identity(3), t: [1, 1, 2] },
      p5: { R: [[0, 0, 1], [1, 0, 0], [0, 1, 0]], t: [3, 3, 2] },            // Rz(90°)·Rx(90°)
      p6: { R: [[0, 0, 1], [0, 1, 0], [-1, 0, 0]], t: [2, 2, 3] },           // Ry(90°) y traslación (2,2,0)
      p7: { R: [[0, 0, 1], [1, 0, 0], [0, 1, 0]], t: [2, 2, 8] },            // Ry(90°)·Rz(90°)
    };
    for (const t of [D.VICTORY_START, D.DURATION]) {
      const sc = D.state_at(t, base, cam0).scene;     // en VICTORY_START empieza la victoria (τ = 0); en DURATION ya terminó
      for (const id of Object.keys(expected)) {
        const p = sc.pieces.find((q) => q.id === id);
        approxMat(p.R, expected[id].R, 1e-12, id + ' R en t=' + t);
        approxMat(p.t, expected[id].t, 1e-12, id + ' t en t=' + t);
      }
      for (const id of ['p2', 'p3', 'p4']) assert(deepEqual(sc.pieces.find((q) => q.id === id), base.pieces.find((q) => q.id === id)), id + ' sin tocar');
      assert(sc.active === 'p7', 'pieza activa final');
    }
  });

  test('demo: durante la victoria la escena se ensambla en torre (pose 3D) y al terminar vuelve a las poses del guion', () => {
    const before = D.state_at(D.VICTORY_START, base, cam0).scene;
    const tower = D.state_at(D.VICTORY_START + 2.8, base, cam0).scene;
    const l = Victory.tower_layout(before);
    tower.pieces.forEach((p, i) => approxMat(p.t, l[i].t, 1e-9, 'torre en la demo ' + p.id));
    assert(deepEqual(D.state_at(D.DURATION, base, cam0).scene.pieces, before.pieces), 'tras la victoria vuelven las poses previas');
  });

  test('demo: las poses intermedias son rígidas (R ortonormal) y la geometría proyectada es finita en todo el guion', () => {
    for (let t = 0; t <= D.DURATION; t += 0.37) {
      const st = D.state_at(t, base, cam0);
      assert(st.scene.pieces.every((p) => LA.isRotation(p.R, 1e-9) && LA.allFinite(p.t)), 'rígida en t=' + t);
      const cam = C.build_camera(st.camera_params);
      const out = P.project(S.get_geometry(st.scene), cam, cam.viewport);
      assert(out.error === null && out.lines.every((l) => LA.allFinite([l.x1, l.y1, l.x2, l.y2])), 'proyección finita en t=' + t);
      assert(cam.sanitized.length === 0, 'parámetros de cámara dentro de rango en t=' + t + ': ' + cam.sanitized);
    }
  });

  test('demo: la cámara del guion parte de la inicial, vuelve a ella tras cada tramo y respeta la cámara del usuario', () => {
    approx(D.state_at(0, base, cam0).camera_params.azimuth, cam0.azimuth, 0);
    approx(D.state_at(0, base, cam0).camera_params.distance, cam0.distance, 0);
    assert(Math.abs(D.state_at(18.8, base, cam0).camera_params.azimuth - cam0.azimuth) > 1, 'la órbita se mueve');
    assert(D.state_at(23.3, base, cam0).camera_params.distance < cam0.distance * 0.7, 'zoom');
    assert(D.state_at(26.3, base, cam0).camera_params.fov_y > cam0.fov_y + 0.3, 'FOV');
    for (const t of [21.8, 24.8, 27.8]) {
      const p = D.state_at(t, base, cam0).camera_params;
      approx(p.distance, cam0.distance, 1e-9, 'distancia en t=' + t); approx(p.fov_y, cam0.fov_y, 1e-9, 'fov en t=' + t);
      approx(Math.sin(p.azimuth), Math.sin(cam0.azimuth), 1e-9, 'acimut mod 2π en t=' + t);
    }
    const user = C.adjust(cam0, { d_azimuth: 0.5, distance_factor: 1.2 });   // el usuario movió la cámara durante la demo
    const a = D.state_at(19, base, cam0).camera_params, b = D.state_at(19, base, user).camera_params;
    approx(b.azimuth - a.azimuth, 0.5, 1e-9, 'el desplazamiento del usuario se suma');
    approx(b.distance / a.distance, 1.2, 1e-9, 'y la distancia se escala');
  });

  test('demo: entradas inválidas no lanzan (t NaN, fuera de rango, cámara inválida)', () => {
    for (const t of [NaN, -5, 1e9, undefined, 'x']) {
      const s = D.state_at(t, base, cam0);
      assert(s.scene && s.camera_params && typeof s.label === 'string', 't = ' + t);
    }
    assert(D.state_at(5, base, null).camera_params.distance > 0, 'cámara inválida -> valores por defecto');
    assert(D.state_at(5, null, cam0).scene === null, 'escena inválida se devuelve tal cual');
    assert(D.state_at(1e9, base, cam0).done === true && D.state_at(NaN, base, cam0).done === false, 'done (t ≥ DURATION se recorta; no finito -> 0)');
  });
})();
