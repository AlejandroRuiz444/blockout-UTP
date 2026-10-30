/* Verificaciones del experimento de homografía (homography.js). */
(function () {
  const { test, assert, approx, approxMat, deepEqual } = Harness;
  const LA = LinAlg, H = Homography, C = Camera, P = Projection;

  const report = H.run_experiment();

  test('homografía: dimensiones — P es 3×4, M es 4×4 y H es 3×3 (proyección ≠ homografía)', () => {
    assert(report.error === null, 'experimento: ' + report.error);
    assert(deepEqual(LA.dims(report.cam1.P), [3, 4]), 'P 3×4');
    assert(deepEqual(LA.dims(Scene.model_matrix({ type: 'L3', R: LA.identity(3), t: [0, 0, 0] })), [4, 4]), 'M 4×4');
    assert(deepEqual(LA.dims(report.H21), [3, 3]) && deepEqual(LA.dims(report.H1), [3, 3]), 'H 3×3');
    assert(deepEqual(LA.dims(report.cam1.K), [3, 3]), 'K 3×3');
  });

  test('homografía: para Z = 0, H_i = K[r1 r2 t] = columnas 1, 2 y 4 de P_i', () => {
    assert(report.H_vs_P_columns_diff < 1e-9, 'diferencia ' + report.H_vs_P_columns_diff);
    const cam = report.cam2;
    approxMat(H.plane_homography(cam, 0), cam.P.map((row) => [row[0], row[1], row[3]]), 1e-9);
  });

  test('homografía: plano genérico Z = z0 -> H·[X Y 1] ∝ P·[X Y z0 1]', () => {
    const cam = report.cam1;
    for (const z0 of [-1, 0, 2.5]) {
      const Hz = H.plane_homography(cam, z0);
      const a = LA.mulVec(Hz, [1.7, 3.1, 1]), b = LA.mulVec(cam.P, [1.7, 3.1, z0, 1]);
      approx(a[0] / a[2], b[0] / b[2], 1e-9); approx(a[1] / a[2], b[1] / b[2], 1e-9);
    }
  });

  test('homografía: los 10 puntos del plano están en posición general (sin tres colineales)', () => {
    assert(report.plane.points.length === 10, 'puntos');
    assert(report.plane.min_triangle_area > 0.1, 'área mínima ' + report.plane.min_triangle_area);
    assert(report.plane.min_triangle_area_est > 0.5, 'los 4 del DLT: ' + report.plane.min_triangle_area_est);
    assert(H.min_triangle_area([[0, 0], [1, 1], [2, 2], [5, 1]]) === 0, 'detecta colineales');
  });

  test('homografía: H21 analítica reproduce la proyección real en la vista 2 (error < 1e-6 px en los 10 puntos)', () => {
    for (const p of report.plane.points) assert(p.err_H < 1e-6, 'error ' + p.err_H + ' en ' + p.X);
    assert(report.plane.rms_H < 1e-6, 'RMS ' + report.plane.rms_H);
  });

  test('homografía: DLT normalizado con las 4 correspondencias coincide con la analítica (< 1e-6 px, también fuera de las 4)', () => {
    for (const p of report.plane.points) assert(p.err_dlt < 1e-6, 'error DLT ' + p.err_dlt + ' en ' + p.X);
    assert(report.plane.rms_dlt_heldout < 1e-6, 'RMS held-out ' + report.plane.rms_dlt_heldout);
    approxMat(LA.scale(report.H_dlt, 1 / report.H_dlt[2][2]), LA.scale(report.H21, 1 / report.H21[2][2]), 1e-6, 'H_dlt ≈ H21 (con h33 = 1)');
  });

  test('homografía: DLT recupera una H conocida con n = 4 y n = 9 puntos (con y sin normalización)', () => {
    const H0 = [[1.2, 0.1, 30], [-0.2, 0.9, 12], [1e-4, -2e-4, 1]];
    const src = [[10, 20], [300, 40], [280, 400], [30, 380], [150, 200], [60, 90], [220, 310], [250, 120], [90, 250]];
    const dst = src.map((p) => H.apply(H0, p));
    for (const n of [4, 9]) for (const normalize of [true, false]) {
      const f = H.dlt(src.slice(0, n), dst.slice(0, n), { normalize });
      assert(f.ok, 'dlt ok');
      approxMat(f.H, H0, 1e-6, 'n=' + n + ' normalize=' + normalize);
    }
  });

  test('homografía: dlt y apply con entradas inválidas no lanzan', () => {
    for (const [a, b] of [[[], []], [null, null], [[[0, 0], [1, 1], [2, 2]], [[0, 0], [1, 1], [2, 2]]], [[[0, 0], [1, 0], [1, 1], [NaN, 1]], [[0, 0], [1, 0], [1, 1], [0, 1]]], [[[1, 1], [1, 1], [1, 1], [1, 1]], [[0, 0], [1, 0], [1, 1], [0, 1]]]]) {
      const f = H.dlt(a, b);
      assert(f.ok === false && f.H === null && typeof f.error === 'string', 'debe devolver ok:false: ' + JSON.stringify(a));
    }
    assert(H.apply([[1, 0, 0], [0, 1, 0], [0, 0, 0]], [1, 1]) === null, 'w = 0 -> null');
    assert(H.apply(null, [1, 1]) === null && H.apply(LA.identity(3), [NaN, 1]) === null, 'entradas inválidas -> null');
    const ok = H.apply(LA.identity(3), [3, 4]);
    assert(ok[0] === 3 && ok[1] === 4, 'identidad');
    assert(H.plane_homography({ K: 1 }, 0) === null && H.between_views(null, null) === null, 'cámaras inválidas -> null');
  });

  test('homografía: el PRNG con semilla es determinista y gaussiano (media ≈ 0, σ ≈ 1)', () => {
    const a = H.make_rng(5), b = H.make_rng(5);
    for (let i = 0; i < 5; i++) assert(a() === b(), 'misma semilla, misma secuencia');
    const rng = H.make_rng(99);
    let s = 0, s2 = 0; const n = 40000;
    for (let i = 0; i < n; i++) { const g = H.gaussian(rng); s += g; s2 += g * g; }
    approx(s / n, 0, 0.03, 'media'); approx(Math.sqrt(s2 / n), 1, 0.03, 'desviación');
  });

  test('homografía con ruido: el error del DLT crece con σ (≈ proporcional) y es reproducible', () => {
    const rows = report.noise.rows;
    assert(rows[0].sigma === 0 && rows[0].mean_rms < 1e-6, 'σ = 0 -> error ≈ 0');
    for (let i = 1; i < rows.length; i++) assert(rows[i].mean_rms > rows[i - 1].mean_rms, 'creciente en σ=' + rows[i].sigma);
    const r1 = rows.find((q) => q.sigma === 1), r2 = rows.find((q) => q.sigma === 2);
    const ratio = r2.mean_rms / r1.mean_rms;
    assert(ratio > 1.5 && ratio < 2.6, 'proporcionalidad aproximada: RMS(2)/RMS(1) = ' + ratio);
    assert(r1.mean_rms > 0.3, 'con 1 px de ruido el error debe ser perceptible');
    assert(deepEqual(H.run_experiment().noise.rows, rows), 'misma semilla -> mismas tablas');
    assert(report.noise_example && report.noise_example.rms > 0, 'ejemplo con ruido para la UI');
  });

  test('homografía fuera del plano: la misma H21 FALLA para Z > 0 (paralaje) y el error crece con Z', () => {
    const lv = report.off_plane.levels;
    assert(report.baseline > 5, 'los centros de cámara deben ser distintos: ' + report.baseline);
    let prev = 0;
    for (const q of lv) {
      assert(q.points.length === 10, 'puntos en Z=' + q.Z);
      assert(q.rms > 1, 'error claramente > 0 en Z=' + q.Z + ': ' + q.rms);
      assert(q.rms > prev, 'creciente con Z');
      prev = q.rms;
    }
    // coherencia: con Z = 0 el mismo cálculo da error ≈ 0
    const X = [2.2, 1.9, 0];
    const a = P.project_point(X, report.cam1), b = P.project_point(X, report.cam2);
    const e0 = Math.hypot(...LA.vsub(H.apply(report.H21, [a.u, a.v]), [b.u, b.v]));
    assert(e0 < 1e-6, 'Z = 0 sin error');
  });

  test('homografía fuera del plano: la H21 predice el punto donde el rayo de la vista 1 corta el plano Z = 0', () => {
    // La predicción de H21 para un punto X de Z > 0 es la imagen-2 del punto X0 = (rayo_1(X) ∩ Z=0).
    const X = [2.2, 1.9, 3];
    const a = P.project_point(X, report.cam1);
    const C1 = report.cam1.C;
    const s = (0 - C1[2]) / (X[2] - C1[2]);                           // C1 + s·(X − C1) tiene Z = 0
    const X0 = LA.vadd(C1, LA.vscale(LA.vsub(X, C1), s));
    const b0 = P.project_point(X0, report.cam2);
    const pred = H.apply(report.H21, [a.u, a.v]);
    approx(pred[0], b0.u, 1e-6, 'u'); approx(pred[1], b0.v, 1e-6, 'v');
    assert(Math.hypot(pred[0] - P.project_point(X, report.cam2).u, pred[1] - P.project_point(X, report.cam2).v) > 1, 'y difiere del punto real');
  });

  test('homografía, rotación pura (mismo centro): H = K2·R21·K1⁻¹ sirve para TODO punto, también fuera del plano', () => {
    const pr = report.pure_rotation;
    assert(pr.ok, 'caso disponible');
    assert(pr.center_distance < 1e-9, 'mismo centro de cámara: ' + pr.center_distance);
    for (const q of pr.levels) assert(q.max < 1e-6, 'Z=' + q.Z + ' error máx ' + q.max);
    assert(pr.max_diff_vs_plane_H < 1e-9, 'coincide con la H inducida por el plano: ' + pr.max_diff_vs_plane_H);
    // K2 ≠ K1 (otra focal) y R21 ≠ I: no es un caso trivial
    assert(Math.abs(pr.cam2.K[0][0] - report.cam1.K[0][0]) > 10 && LA.maxAbs(LA.sub(pr.cam2.R, report.cam1.R)) > 0.05, 'caso no trivial');
    assert(LA.isRotation(LA.matMul(pr.cam2.R, LA.transpose(report.cam1.R)), 1e-12), 'R21 es rotación');
    const bad = H.rotation_homography(null, report.cam1);
    assert(bad.ok === false, 'cámara inválida');
  });

  test('homografía: informe en Markdown generado sin errores (se usa en la UI y en INFORME.md)', () => {
    const md = H.report_markdown(report);
    assert(md.includes('H analítica') && md.includes('RMS') && md.includes('paralaje') && md.includes('rotación pura'), 'secciones');
    assert(!/NaN|undefined|Infinity/.test(md), 'sin NaN/undefined/Infinity en el informe');
    assert(H.report_markdown(null).startsWith('Experimento no disponible'), 'entrada inválida');
  });

  test('homografía: run_experiment con configuración degenerada devuelve error explícito (sin excepción)', () => {
    const r = H.run_experiment({ est_points: [[0, 0], [1, 1]], viewport: { width: 640, height: 480 } });
    assert(typeof r.error === 'string', 'error explícito: ' + JSON.stringify(r.error));
  });
})();
