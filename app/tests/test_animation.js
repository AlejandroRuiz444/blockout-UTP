/* Verificaciones de la capa de animación: easing, motion y victoria (src/animation). */
(function () {
  const { test, assert, approx, approxMat, deepEqual } = Harness;
  const LA = LinAlg, S = Scene, E = Easing, Mo = Motion, V = Victory, C = Camera, P = Projection;

  const base = S.create_scene();
  const T = V.DURATION;

  // ------------------------------------------------------------------ easing
  test('easing: extremos 0 -> 0 y 1 -> 1, monótonas, recortan fuera de [0,1] y NaN vale 0', () => {
    for (const fn of [E.smoothstep, E.in_out_cubic, E.out_cubic]) {
      approx(fn(0), 0, 1e-15); approx(fn(1), 1, 1e-15); approx(fn(-3), 0, 0); approx(fn(9), 1, 0); approx(fn(NaN), 0, 0);
      let prev = -1;
      for (let x = 0; x <= 1.0001; x += 0.01) { const y = fn(x); assert(y >= prev - 1e-15, 'monótona'); prev = y; }
    }
    approx(E.smoothstep(0.5), 0.5, 1e-15); approx(E.in_out_cubic(0.5), 0.5, 1e-15);
    assert(E.out_cubic(0.2) > E.smoothstep(0.2), 'out_cubic arranca más rápido');
    approx(E.in_out_cubic(0.3) + E.in_out_cubic(0.7), 1, 1e-15, 'simetría 1 − f(x) = f(1 − x)');
  });

  // ------------------------------------------------------------------ motion
  test('motion: interpolate_rotation recorre el camino geodésico (R(0)=R0, R(1)=R1, siempre rotación; caso de 180°)', () => {
    const cases = [[LA.rotZ(Math.PI / 2), LA.identity(3)], [LA.rotX(Math.PI), LA.identity(3)], [LA.axisAngle([1, 2, 3], 2.0), LA.rotY(0.4)], [LA.identity(3), LA.identity(3)]];
    for (const [R0, R1] of cases) {
      approxMat(Mo.interpolate_rotation(R0, R1, 0), R0, 1e-12, 's=0');
      approxMat(Mo.interpolate_rotation(R0, R1, 1), R1, 1e-12, 's=1');
      let prev = R0;
      for (let s = 0.05; s <= 1.0001; s += 0.05) {
        const R = Mo.interpolate_rotation(R0, R1, s);
        assert(LA.isRotation(R, 1e-12), 'rotación en s=' + s);
        assert(LA.maxAbs(LA.sub(R, prev)) < 0.35, 'sin saltos en s=' + s);
        prev = R;
      }
    }
    // 90° -> 0: a mitad de camino son 45° (traza = 1 + 2cosθ)
    const half = Mo.interpolate_rotation(LA.rotZ(Math.PI / 2), LA.identity(3), 0.5);
    approx(half[0][0] + half[1][1] + half[2][2], 1 + 2 * Math.cos(Math.PI / 4), 1e-12, 'ángulo a mitad de camino');
    assert(Mo.interpolate_rotation([[2, 0, 0], [0, 1, 0], [0, 0, 1]], LA.identity(3), 0.5) === null && Mo.interpolate_rotation(LA.identity(3), LA.identity(3), NaN) === null, 'entradas inválidas -> null');
  });

  test('motion: rotation_action interpola con matrices de rotación reales (R(s) rotación, 45° a s = 0.5)', () => {
    const sc = S.create_scene({ pieces: [{ type: 'SCREW', t: [1, 1, 5] }] });
    const R0 = sc.pieces[0].R;
    approxMat(Mo.rotation_action(sc, 'p1', 'z', 1, 0).R, R0, 1e-12, 's=0');
    const exact = S.apply_action(sc, { type: 'rotate', id: 'p1', axis: 'z', turns: 1 });
    approxMat(Mo.rotation_action(sc, 'p1', 'z', 1, 1).R, exact.pieces[0].R, 1e-12, 's=1 coincide con el paso exacto');
    for (const s of [0.1, 0.37, 0.5, 0.9]) {
      const a = Mo.rotation_action(sc, 'p1', 'x', -1, s);
      assert(LA.isRotation(a.R, 1e-12), 'rotación en s=' + s);
      assert(S.apply_action(sc, a).last.ok, 'set_pose aceptada');
    }
    const half = Mo.rotation_action(sc, 'p1', 'y', 1, 0.5).R;
    approx(LA.matMul(half, LA.transpose(R0))[0][0], Math.cos(Math.PI / 4), 1e-12, 'cos 45°');
    assert(Mo.rotation_action(sc, 'zz', 'x', 1, 0.5) === null && Mo.rotation_action(sc, 'p1', 'w', 1, 0.5) === null && Mo.rotation_action(sc, 'p1', 'x', 1, NaN) === null, 'entradas inválidas -> null');
  });

  test('motion: translation_action y apply_actions toleran entradas inválidas', () => {
    const a = Mo.translation_action(base, 'p1', [2, 0, 4], 0.5);
    approxMat(a.t, [1, 0, 2], 1e-12);
    assert(Mo.translation_action(base, 'p1', [NaN, 0, 0], 0.5) === null && Mo.translation_action(base, 'x', [1, 0, 0], 0.5) === null, 'inválido -> null');
    assert(Mo.apply_actions(base, [null, undefined, { type: 'nada' }]).pieces.length === 7, 'no lanza');
    assert(Mo.apply_actions(base, null) === base, 'sin acciones');
  });

  // ------------------------------------------------------------------ victoria
  const pivotAt = (piece, a) => LA.vadd(S.PIECE_DEFS[piece.type].pivot, a.t);
  const at = (t) => V.actions(base, t);
  const stackedBox = (i) => { const l = V.tower_layout(base)[i], d = S.PIECE_DEFS[base.pieces[i].type].size; return { l, d }; };

  test('victoria: fuera de (0, T) no genera acciones (NaN, negativos, t ≥ T, escena inválida)', () => {
    for (const t of [0, -1, T, T + 3, NaN, Infinity, undefined, 'x']) assert(V.actions(base, t).length === 0, 't = ' + t);
    assert(V.actions(null, 1).length === 0 && V.actions({}, 1).length === 0, 'escena inválida');
    assert(at(T / 2).length === 7, 'una acción por pieza');
  });

  test('victoria: modifica POSES 3D (acciones set_pose) con R rígida y t finita, aceptadas por apply_action', () => {
    for (const t of [0.4, 1.5, 2.8, 4.0, 5.2, 6.3, 7.6]) {
      const acts = at(t);
      assert(acts.every((a) => a.type === 'set_pose' && LA.isRotation(a.R, 1e-9) && LA.allFinite(a.t)), 'acciones válidas en t=' + t);
      assert(Mo.apply_actions(base, acts).last.ok, 'la escena aceptó las acciones en t=' + t);
    }
    for (const t of [1.5, 2.8, 4.0, 6.3]) {
      const sc = Mo.apply_actions(base, at(t));
      sc.pieces.forEach((p, i) => assert(!deepEqual(p.R, base.pieces[i].R) || !deepEqual(p.t, base.pieces[i].t), p.id + ' cambió de pose en t=' + t));
    }
  });

  test('victoria: conserva la rigidez (distancias entre vértices de cada pieza) y no modifica la escena de entrada', () => {
    const snap = JSON.stringify(base);
    const g0 = S.get_geometry(base);
    const dists = (g, id) => { const o = g.objects.find((q) => q.id === id), d = []; for (let i = 0; i < o.vertices.length; i++) for (let j = i + 1; j < o.vertices.length; j++) d.push(LA.norm(LA.vsub(o.vertices[i], o.vertices[j]))); return d; };
    for (const t of [0.7, 1.4, 2.2, 3.5, 4.4, 6.0, 7.1]) {
      const g = S.get_geometry(Mo.apply_actions(base, at(t)));
      for (const p of base.pieces) { const a = dists(g0, p.id), b = dists(g, p.id); for (let i = 0; i < a.length; i++) approx(b[i], a[i], 1e-9, p.id + ' distancia en t=' + t); }
    }
    assert(JSON.stringify(base) === snap, 'la escena base no cambió');
  });

  test('victoria: determinista, empieza y termina EXACTAMENTE en las poses originales', () => {
    for (const t of [0.3, 2.5, 4.4, 6.6]) assert(JSON.stringify(at(t)) === JSON.stringify(at(t)), 'repetible en t=' + t);
    assert(deepEqual(Mo.apply_actions(base, V.actions(base, T)).pieces, base.pieces), 'en t ≥ T las poses son idénticas a las iniciales');
    for (const t of [1e-4, T - 1e-4]) {
      Mo.apply_actions(base, at(t)).pieces.forEach((p, i) => { approxMat(p.t, base.pieces[i].t, 1e-3, 't en ' + t); approxMat(p.R, base.pieces[i].R, 1e-3, 'R en ' + t); });
    }
  });

  test('victoria: en la pausa las piezas forman una TORRE centrada, sin solaparse, apilada sobre el piso y dentro del contenedor', () => {
    const acts = at(2.8);
    const boxes = acts.map((a, i) => {
      const { l, d } = stackedBox(i);
      approxMat(a.R, LA.identity(3), 1e-12, 'R = I en la torre');
      approxMat(a.t, l.t, 1e-12, 'pose de la torre ' + base.pieces[i].id);
      return { lo: a.t[2], hi: a.t[2] + d[2], cx: a.t[0] + d[0] / 2, cy: a.t[1] + d[1] / 2 };
    });
    for (const b of boxes) { approx(b.cx, 2.5, 1e-12, 'centrada en X'); approx(b.cy, 2.5, 1e-12, 'centrada en Y'); }
    boxes.sort((a, b) => a.lo - b.lo);
    approx(boxes[0].lo, 0, 1e-12, 'la primera capa apoya en el piso');
    for (let i = 1; i < boxes.length; i++) assert(boxes[i].lo >= boxes[i - 1].hi + V.GAP - 1e-12, 'capas separadas');
    assert(boxes[boxes.length - 1].hi <= base.container.size[2], 'la torre cabe en el contenedor (altura ' + boxes[boxes.length - 1].hi + ')');
  });

  test('victoria: durante el giro cada capa gira 360° alrededor del eje vertical del contenedor (alterna sentido) y vuelve a la torre', () => {
    const lay = V.tower_layout(base);
    const acts = at(4.0);                                  // mitad del giro: α = ±π
    acts.forEach((a, i) => {
      const alpha = (i % 2 ? 1 : -1) * Math.PI;
      approxMat(a.R, LA.rotZ(alpha), 1e-9, base.pieces[i].id + ' R = Rz(±π)');
      const def = S.PIECE_DEFS[base.pieces[i].type];
      const p1 = LA.vadd(def.pivot, lay[i].t);
      const q = LA.mulVec(LA.rotZ(alpha), [p1[0] - 2.5, p1[1] - 2.5, 0]);
      approxMat(pivotAt(base.pieces[i], a), [2.5 + q[0], 2.5 + q[1], p1[2]], 1e-9, base.pieces[i].id + ' pivote');
    });
    at(5.2).forEach((a, i) => { approxMat(a.R, LA.identity(3), 1e-9, 'tras 360° vuelve a la torre'); approxMat(a.t, lay[i].t, 1e-9, 't'); });
  });

  test('victoria: el vuelo describe una ESPIRAL con arco (la pieza sube y baja) y el regreso es el vuelo al revés', () => {
    // arco vertical: a mitad del vuelo de la pieza 0 el pivote está por encima de la interpolación lineal
    const p0 = S.pivot_world(base.pieces[0]), l0 = V.tower_layout(base)[0];
    const p1 = LA.vadd(S.PIECE_DEFS[base.pieces[0].type].pivot, l0.t);
    const a = at(0.9)[0], e = E.in_out_cubic(0.9 / V.FLY);
    assert(pivotAt(base.pieces[0], a)[2] > p0[2] + (p1[2] - p0[2]) * e + 0.5, 'arco vertical sobre la recta');
    // espiral: el ángulo respecto del eje cambia > 1 vuelta mientras el radio cambia
    const ang = (t) => { const w = pivotAt(base.pieces[0], at(t)[0]); return Math.atan2(w[1] - 2.5, w[0] - 2.5); };
    let travelled = 0, prev = ang(0.01);
    for (let t = 0.02; t < 1.8; t += 0.02) { const x = ang(t); let d = x - prev; d -= 2 * Math.PI * Math.round(d / (2 * Math.PI)); travelled += d; prev = x; }
    assert(Math.abs(travelled) > 4, 'gira más de ~230° alrededor del eje: ' + travelled.toFixed(2));
    // simetría temporal para la pieza central (índice 3, retardos de entrada y salida iguales): pose(5.5+τ) = pose(2.4−τ)
    for (const tau of [0.4, 0.7, 1.0, 1.3, 1.7]) {
      const out = at(5.5 + tau)[3], inn = at(2.4 - tau)[3];
      approxMat(out.R, inn.R, 1e-9, 'R simétrica τ=' + tau); approxMat(out.t, inn.t, 1e-9, 't simétrica τ=' + tau);
    }
  });

  test('victoria: movimiento continuo (sin saltos de posición ni de orientación) durante los 8 s', () => {
    let prev = at(0.0005), maxStep = 0, maxRot = 0;
    for (let t = 0.005; t < T - 0.0005; t += 0.005) {
      const cur = at(t);
      cur.forEach((a, i) => {
        maxStep = Math.max(maxStep, LA.norm(LA.vsub(pivotAt(base.pieces[i], a), pivotAt(base.pieces[i], prev[i]))));
        maxRot = Math.max(maxRot, LA.maxAbs(LA.sub(a.R, prev[i].R)));
      });
      prev = cur;
    }
    assert(maxStep < 0.4, 'salto de posición máximo por paso de 5 ms: ' + maxStep.toFixed(3));
    assert(maxRot < 0.2, 'salto de orientación máximo por paso de 5 ms: ' + maxRot.toFixed(3));
  });

  test('victoria: fases y textos para la interfaz', () => {
    assert(V.phase_at(1).name === 'fly_in' && V.phase_at(2.7).name === 'hold' && V.phase_at(4).name === 'spin' && V.phase_at(5.2).name === 'hold' && V.phase_at(7).name === 'fly_out', 'fases');
    for (const t of [1, 2.7, 4, 7]) assert(V.phase_at(t).caption.length > 10, 'texto');
  });

  test('victoria: usa la MISMA cadena de proyección y los controles de cámara siguen activos mientras corre', () => {
    const g0 = S.get_geometry(base);
    let params = C.default_params();
    for (let i = 0; i < 12; i++) {
      const animated = Mo.apply_actions(base, at(0.4 + i * 0.6));
      const g1 = S.get_geometry(animated);
      params = C.adjust(params, { d_azimuth: 0.3, d_elevation: 0.05, distance_factor: 0.95, d_fov: 0.02 });   // la cámara se mueve durante la animación
      const cam = C.build_camera(params);
      const a = P.project(g0, cam, cam.viewport), b = P.project(g1, cam, cam.viewport);
      assert(a.error === null && b.error === null && b.lines.length > 0, 'proyecta');
      assert(b.lines.every((l) => LA.allFinite([l.x1, l.y1, l.x2, l.y2])), 'finito');
      assert(!deepEqual(a.lines, b.lines), 'la animación se ve en 2D porque cambió la geometría 3D (t=' + (0.4 + i * 0.6).toFixed(1) + ')');
    }
  });
})();
