/* Verificaciones de cámara y proyección (camera.js, projection.js) + ejemplo dorado de INTERFACES.md. */
(function () {
  const { test, assert, approx, approxMat, deepEqual } = Harness;
  const LA = LinAlg, C = Camera, P = Projection, S = Scene;

  // ---- Ejemplo dorado (idéntico al de docs/INTERFACES.md §8) ----
  const GOLD_PARAMS = { azimuth: -Math.PI / 2, elevation: Math.PI / 6, distance: 10, target: [0, 0, 0], fov_y: Math.PI / 2, near: 0.1, viewport: { width: 640, height: 480 } };
  const GOLD = {
    C: [0, -5 * Math.sqrt(3), 5],
    R: [[1, 0, 0], [0, -0.5, -Math.sqrt(3) / 2], [0, Math.sqrt(3) / 2, -0.5]],
    t: [0, 0, 10],
    K: [[240, 0, 320], [0, 240, 240], [0, 0, 1]],
    X_local: [1, 0, 1],            // vértice local de la pieza O4
    M: [[0, -1, 0, 2], [1, 0, 0, 1], [0, 0, 1, 0], [0, 0, 0, 1]],
    X_world: [2, 2, 1],
    X_cam: [2, -1 - Math.sqrt(3) / 2, Math.sqrt(3) + 9.5],
    u: 362.734849, v: 200.127843, z: 11.232051,
  };

  test('dorado: cámara az=−90°, el=30°, d=10, fov=90°, 640×480 -> C, R, t, K esperados a mano', () => {
    const cam = C.build_camera(GOLD_PARAMS);
    approxMat(cam.C, GOLD.C, 1e-12, 'C');
    approxMat(cam.R, GOLD.R, 1e-12, 'R');
    approxMat(cam.t, GOLD.t, 1e-12, 't');
    approxMat(cam.K, GOLD.K, 1e-9, 'K');
    assert(cam.sanitized.length === 0, 'sin correcciones');
  });

  test('dorado: M(O4, R=Rz(90°), t=(1,1,0)) manda el vértice local (1,0,1) a (2,2,1)', () => {
    const piece = { type: 'O4', R: [[0, -1, 0], [1, 0, 0], [0, 0, 1]], t: [1, 1, 0] };
    approxMat(S.model_matrix(piece), GOLD.M, 1e-12, 'M');
    approxMat(LA.mulPoint4(S.model_matrix(piece), GOLD.X_local), GOLD.X_world.concat([1]), 1e-12, 'X_mundo');
  });

  test('dorado: (u, v) = (362.734849, 200.127843), z_c = 11.232051, y P·M·X da lo mismo', () => {
    const cam = C.build_camera(GOLD_PARAMS);
    const r = P.project_point(GOLD.X_world, cam);
    assert(r.ok, 'ok');
    approxMat(r.X_cam, GOLD.X_cam, 1e-9, 'X_cam');
    approx(r.z_cam, GOLD.z, 1e-6, 'z_c');
    approx(r.u, GOLD.u, 1e-6, 'u');
    approx(r.v, GOLD.v, 1e-6, 'v');
    // forma compacta λ[u v 1]ᵀ = P·M·[X Y Z 1]ᵀ
    const h = LA.mulVec(cam.P, LA.mulVec(GOLD.M, GOLD.X_local.concat([1])));
    approx(h[2], r.z_cam, 1e-9, 'λ = z_c');
    approx(h[0] / h[2], r.u, 1e-9, 'u vía P');
    approx(h[1] / h[2], r.v, 1e-9, 'v vía P');
  });

  test('cámara: R ortonormal con det = +1, t = −R·C, P = K·[R|t] y el objetivo cae en el punto principal', () => {
    for (const az of [-3, -1, 0, 0.7, 2.5]) for (const el of [-1.2, 0, 0.5, 1.4]) {
      const cam = C.build_camera({ azimuth: az, elevation: el, distance: 17, target: [2.5, 2.5, 6], fov_y: 0.8, viewport: { width: 800, height: 600 } });
      assert(LA.isRotation(cam.R, 1e-12), 'R');
      const RC = LA.mulVec(cam.R, cam.C);
      approxMat(cam.t, RC.map((x) => -x), 1e-12, 't = −R·C');
      const Rt = cam.R.map((row, i) => row.concat([cam.t[i]]));
      approxMat(cam.P, LA.matMul(cam.K, Rt), 1e-9, 'P = K[R|t]');
      const p = P.project_point([2.5, 2.5, 6], cam);
      approx(p.u, 400, 1e-9, 'u objetivo'); approx(p.v, 300, 1e-9, 'v objetivo'); approx(p.z_cam, 17, 1e-9, 'distancia');
    }
  });

  test('cámara: u crece hacia la derecha, v crece hacia abajo (z del mundo hacia arriba), fy > 0', () => {
    const cam = C.build_camera({ azimuth: 0.3, elevation: 0.4, distance: 20, target: [0, 0, 0], viewport: { width: 640, height: 480 } });
    assert(cam.K[0][0] > 0 && cam.K[1][1] > 0, 'fx, fy > 0');
    const c = P.project_point([0, 0, 0], cam), up = P.project_point([0, 0, 1], cam);
    assert(up.v < c.v, 'subir en Z debe reducir v (v hacia abajo)');
    const right = LA.vadd([0, 0, 0], cam.R[0]); // x_c expresado en el mundo = fila 0 de R
    assert(P.project_point(right, cam).u > c.u, 'mover hacia la derecha de la cámara aumenta u');
  });

  test('cámara: la focal sale del FOV: f = (alto/2)/tan(fov/2), cx, cy en el centro; fov mayor -> focal menor', () => {
    const a = C.build_camera({ fov_y: Math.PI / 2, viewport: { width: 1000, height: 500 } });
    approx(a.K[1][1], 250, 1e-9); approx(a.K[0][0], 250, 1e-9); approx(a.K[0][2], 500, 0); approx(a.K[1][2], 250, 0);
    const b = C.build_camera({ fov_y: Math.PI / 3, viewport: { width: 1000, height: 500 } });
    assert(b.K[1][1] > a.K[1][1], 'FOV menor -> focal mayor');
    approx(C.fov_from_focal(C.focal_from_fov(0.9, 480), 480), 0.9, 1e-12);
  });

  test('cámara: parámetros NaN/Infinity/fuera de rango no lanzan; se sustituyen/recortan y se anotan en sanitized', () => {
    const cam = C.build_camera({ azimuth: NaN, elevation: Math.PI / 2, distance: -5, target: [0, NaN, 0], fov_y: Infinity, near: 0, viewport: { width: 0, height: 'x' } });
    assert(LA.isRotation(cam.R, 1e-9) && LA.allFinite([cam.K, cam.R, cam.t, cam.P, cam.C]), 'cámara finita y válida');
    for (const k of ['azimuth', 'elevation', 'distance', 'target', 'fov_y', 'near']) assert(cam.sanitized.includes(k), 'falta ' + k);
    for (const bad of [undefined, null, 5, 'a', []]) assert(LA.isRotation(C.build_camera(bad).R, 1e-9), 'entrada no objeto');
    const top = C.build_camera({ elevation: Math.PI / 2 }); // casi cenital: look-at sin degenerar
    assert(LA.isRotation(top.R, 1e-9), 'cenital');
  });

  test('cámara: look-at con eye = target no lanza y se corrige; con eye paralelo a "arriba" usa el vector alternativo', () => {
    const cam = C.build_camera({ eye: [1, 1, 1], target: [1, 1, 1] });
    assert(LA.isRotation(cam.R, 1e-9) && cam.sanitized.includes('eye'), 'eye == target');
    const L = C.look_at([0, 0, 5], [0, 0, 0], [0, 0, 1]);
    assert(LA.isRotation(L.R, 1e-12), 'mirando hacia abajo (f ∥ up)');
    assert(C.look_at([1, 2, 3], [1, 2, 3]) === null, 'look_at degenerado -> null');
  });

  test('cámara: adjust cambia solo los parámetros de cámara y respeta los límites', () => {
    let p = C.default_params();
    for (let i = 0; i < 200; i++) p = C.adjust(p, { d_elevation: 0.1, distance_factor: 0.9, d_fov: -0.1 });
    assert(p.elevation <= C.LIMITS.elevation[1] + 1e-12, 'elevación'); assert(p.distance >= 0.5, 'distancia'); assert(p.fov_y >= C.LIMITS.fov_y[0] - 1e-12, 'fov');
    const q = C.adjust(p, { d_azimuth: NaN, distance_factor: -3 });
    assert(deepEqual(q, p), 'deltas inválidos se ignoran');
  });

  test('proyección: punto en el plano de la cámara (z_c = 0) o detrás -> ok:false, sin NaN ni excepción', () => {
    const cam = C.build_camera(GOLD_PARAMS);
    const onPlane = LA.vadd(cam.C, LA.vscale(cam.R[0], 3));               // z_c = 0 exactamente
    const behind = LA.vsub(cam.C, LA.vscale(cam.R[2], 4));                // z_c = −4
    for (const X of [onPlane, behind, cam.C]) {
      const r = P.project_point(X, cam);
      assert(r.ok === false && r.reason === 'behind_near', 'reason: ' + r.reason);
      assert(r.u === undefined && r.v === undefined, 'no debe devolver u,v');
    }
    for (const X of [[NaN, 0, 0], [0, Infinity, 0], [0, 0, -Infinity], null, undefined, [1, 2], 'x']) {
      const r = P.project_point(X, cam);
      assert(r.ok === false && r.reason === 'invalid', JSON.stringify(X));
    }
    assert(P.project_point([0, 0, 0], { K: 1 }).ok === false, 'cámara inválida');
  });

  test('recorte: segmento que cruza el plano cercano se recorta (no se descarta) en z_c = near', () => {
    let c = P.clip_segment_near([1, 0, 2], [1, 0, -2], 0.1);
    assert(c && c.clipped, 'recortado');
    approxMat(c.B, [1, 0, 0.1], 1e-12, 'punto de corte');
    c = P.clip_segment_near([0, 0, 2], [4, 2, -2], 0.5);          // extremo exterior = B
    approxMat(c.B, [1.5, 0.75, 0.5], 1e-12, 'B recortado');
    approxMat(c.A, [0, 0, 2], 0, 'A intacto');
    c = P.clip_segment_near([4, 2, -2], [0, 0, 2], 0.5);          // mismo segmento invertido
    approxMat(c.A, [1.5, 0.75, 0.5], 1e-12, 'A recortado');
    assert(P.clip_segment_near([0, 0, -1], [3, 3, 0.05], 0.1) === null, 'ambos por detrás de near -> null');
    assert(P.clip_segment_near([0, 0, 0.1], [1, 1, 5], 0.1).clipped === false, 'z = near cuenta como dentro');
  });

  test('recorte: project() conserva la parte visible de una arista que cruza el plano cercano', () => {
    const cam = C.build_camera(GOLD_PARAMS);
    const f = cam.R[2], r = cam.R[0];
    const A = LA.vadd(LA.vadd(cam.C, LA.vscale(f, 5)), LA.vscale(r, 1));   // z_c = 5
    const B = LA.vadd(LA.vsub(cam.C, LA.vscale(f, 5)), LA.vscale(r, 3));   // z_c = −5
    const out = P.project({ objects: [{ id: 'seg', role: 'piece', vertices: [A, B], edges: [[0, 1]] }] }, cam, { width: 640, height: 480 });
    assert(out.error === null && out.lines.length === 1 && out.stats.clipped_near === 1, JSON.stringify(out.stats));
    const l = out.lines[0];
    assert(LA.allFinite([l.x1, l.y1, l.x2, l.y2, l.z1, l.z2]), 'finitos');
    approx(l.z2, cam.near, 1e-12, 'extremo recortado en z_c = near');
    // el corte esperado: s = (near − 5)/(−10); x_c = 1 + s·2
    const s = (cam.near - 5) / (-10), xc = 1 + s * 2;
    const px = P.camera_to_pixel([xc, 0, cam.near], cam.K);
    assert(px.u > 640, 'sin recorte de viewport u se saldría de pantalla');
    assert(l.x2 >= 0 && l.x2 <= 640 && l.y2 >= 0 && l.y2 <= 480, 'el recorte 2D la deja dentro del viewport');
  });

  test('recorte: aristas totalmente detrás de la cámara se cuentan, no se dibujan; NaN/Infinity se descartan sin excepción', () => {
    const cam = C.build_camera(GOLD_PARAMS);
    const f = cam.R[2];
    const behind = [LA.vsub(cam.C, LA.vscale(f, 3)), LA.vsub(cam.C, LA.vscale(f, 6))];
    const ahead = [LA.vadd(cam.C, LA.vscale(f, 3)), LA.vadd(cam.C, LA.vscale(f, 6))];
    const geom = { objects: [
      { id: 'a', role: 'piece', vertices: behind, edges: [[0, 1]] },
      { id: 'b', role: 'piece', vertices: ahead.concat([[NaN, 0, 0], [0, Infinity, 0], [0, 0, -Infinity]]), edges: [[0, 1], [0, 2], [3, 1], [4, 4], [0, 99], [-1, 0]] },
      { id: 'c', role: 'piece' }, null, 7,
    ] };
    const out = P.project(geom, cam, { width: 640, height: 480 });
    assert(out.stats.culled_behind === 1, 'culled ' + out.stats.culled_behind);
    assert(out.stats.invalid === 5, 'invalid ' + out.stats.invalid);
    assert(out.stats.objects_skipped === 3, 'objetos omitidos ' + out.stats.objects_skipped);
    assert(out.lines.length === 1, 'solo la arista válida');
    for (const l of out.lines) assert(LA.allFinite([l.x1, l.y1, l.x2, l.y2]), 'finito');
  });

  test('recorte: entradas inválidas de project() devuelven primitivas vacías con error explícito', () => {
    const cam = C.build_camera(GOLD_PARAMS), g = S.get_geometry(S.create_scene());
    assert(P.project(g, null, { width: 10, height: 10 }).error === 'cámara inválida', 'cámara');
    assert(P.project(g, cam, { width: 0, height: 10 }).error === 'viewport inválido', 'viewport');
    assert(P.project(g, cam, { width: NaN, height: 10 }).error === 'viewport inválido', 'viewport NaN');
    assert(P.project(null, cam, { width: 10, height: 10 }).error === 'geometría inválida', 'geometría');
    const nanCam = JSON.parse(JSON.stringify(cam)); nanCam.K[0][0] = NaN;
    assert(P.project(g, nanCam, { width: 640, height: 480 }).error === 'cámara inválida', 'K con NaN');
  });

  test('recorte: Liang–Barsky deja los segmentos dentro de [0,w]×[0,h] y descarta los de fuera', () => {
    const r = P.clip_segment_viewport(-100, 50, 300, 50, 200, 100);
    approxMat(r, [0, 50, 200, 50], 1e-9);
    assert(P.clip_segment_viewport(-10, -10, -5, 300, 200, 100) === null, 'fuera');
    approxMat(P.clip_segment_viewport(10, 10, 20, 20, 200, 100), [10, 10, 20, 20], 0);
    approxMat(P.clip_segment_viewport(0, 0, 400, 200, 200, 100), [0, 0, 200, 100], 1e-9);
  });

  test('proyección: con la cámara DENTRO del contenedor (distancia mínima) todo es finito y está en el viewport', () => {
    const g = S.get_geometry(S.create_scene());
    for (const az of [0, 1, 2, 3, 4, 5]) for (const d of [0.5, 1, 3]) {
      const cam = C.build_camera({ azimuth: az, elevation: 0.2, distance: d, viewport: { width: 640, height: 480 } });
      const out = P.project(g, cam, { width: 640, height: 480 });
      assert(out.error === null && out.lines.length > 0, 'hay líneas');
      for (const l of out.lines) {
        assert(LA.allFinite([l.x1, l.y1, l.x2, l.y2, l.z1, l.z2]), 'finito');
        assert(l.x1 >= -1e-6 && l.x1 <= 640 + 1e-6 && l.y1 >= -1e-6 && l.y1 <= 480 + 1e-6 && l.x2 >= -1e-6 && l.x2 <= 640 + 1e-6 && l.y2 >= -1e-6 && l.y2 <= 480 + 1e-6, 'dentro');
        assert(l.z1 >= cam.near - 1e-9 && l.z2 >= cam.near - 1e-9, 'profundidades ≥ near');
      }
    }
  });

  test('proyección: barrido aleatorio (semilla fija) de cámaras y aristas nunca produce NaN ni sale del viewport', () => {
    let seed = 12345;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let n = 0; n < 300; n++) {
      const cam = C.build_camera({ azimuth: rnd() * 12 - 6, elevation: rnd() * 3 - 1.5, distance: rnd() * 40, target: [rnd() * 8, rnd() * 8, rnd() * 14], fov_y: rnd() * 2.5, viewport: { width: 100 + rnd() * 900, height: 100 + rnd() * 700 } });
      const vs = []; for (let i = 0; i < 12; i++) vs.push([rnd() * 60 - 30, rnd() * 60 - 30, rnd() * 60 - 30]);
      const edges = []; for (let i = 0; i < 30; i++) edges.push([Math.floor(rnd() * 12), Math.floor(rnd() * 12)]);
      const vp = cam.viewport;
      const out = P.project({ objects: [{ id: 'r', role: 'piece', vertices: vs, edges }] }, cam, vp);
      assert(out.error === null, 'sin error');
      for (const l of out.lines) {
        assert(LA.allFinite([l.x1, l.y1, l.x2, l.y2]), 'finito en caso ' + n);
        for (const [x, y] of [[l.x1, l.y1], [l.x2, l.y2]]) assert(x >= -1e-6 && x <= vp.width + 1e-6 && y >= -1e-6 && y <= vp.height + 1e-6, 'dentro del viewport en caso ' + n);
      }
    }
  });

  test('cámara móvil: mover/orbitar/zoom/FOV de la cámara no altera get_geometry (coordenadas del mundo)', () => {
    let sc = S.create_scene();
    sc = S.apply_action(sc, { type: 'rotate', axis: 'z', turns: 1 });
    const before = JSON.stringify(S.get_geometry(sc)), sceneBefore = JSON.stringify(sc);
    let params = C.default_params();
    for (let i = 0; i < 40; i++) {
      params = C.adjust(params, { d_azimuth: 0.4, d_elevation: (i % 2 ? 1 : -1) * 0.2, distance_factor: i % 3 ? 0.9 : 1.2, d_fov: 0.03 });
      const cam = C.build_camera(params);
      P.project(S.get_geometry(sc), cam, cam.viewport);
      assert(JSON.stringify(S.get_geometry(sc)) === before, 'la geometría cambió en el paso ' + i);
    }
    assert(JSON.stringify(sc) === sceneBefore, 'la escena cambió');
    const g = S.get_geometry(sc); const g2 = JSON.stringify(g);
    P.project(g, C.build_camera(params), { width: 960, height: 640 });
    assert(JSON.stringify(g) === g2, 'project() no debe modificar la geometría de entrada');
  });

  test('cámara móvil: al cambiar la cámara cambian las proyecciones 2D pero no los vértices 3D', () => {
    const g = S.get_geometry(S.create_scene());
    const a = P.project(g, C.build_camera(C.default_params()), { width: 960, height: 640 });
    const b = P.project(g, C.build_camera(C.adjust(C.default_params(), { d_azimuth: 0.5 })), { width: 960, height: 640 });
    assert(!deepEqual(a.lines, b.lines), 'las líneas 2D deben cambiar');
  });
})();
