/* Verificaciones del módulo escena (scene.js). */
(function () {
  const { test, assert, approx, approxMat, deepEqual } = Harness;
  const LA = LinAlg, S = Scene;

  // Grupo de las 24 rotaciones de la retícula (cerradura de giros de 90° alrededor de X y Y).
  function rotation_group() {
    const gens = [LA.roundMat(LA.rotX(Math.PI / 2)), LA.roundMat(LA.rotY(Math.PI / 2))];
    const seen = new Map([[JSON.stringify(LA.identity(3)), LA.identity(3)]]);
    let frontier = [LA.identity(3)];
    while (frontier.length) {
      const next = [];
      for (const R of frontier) for (const g of gens) {
        const Q = LA.roundMat(LA.matMul(g, R)), k = JSON.stringify(Q);
        if (!seen.has(k)) { seen.set(k, Q); next.push(Q); }
      }
      frontier = next;
    }
    return Array.from(seen.values());
  }

  function orientation_count(cubes) {
    const keys = new Set();
    for (const R of rotation_group()) {
      const pts = cubes.map((c) => LA.mulVec(R, c));
      const mn = [0, 1, 2].map((a) => Math.min(...pts.map((p) => p[a])));
      keys.add(pts.map((p) => p.map((v, a) => v - mn[a]).join(',')).sort().join(';'));
    }
    return keys.size;
  }

  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  function pair_distances(scene, id) {
    const p = scene.pieces.find((q) => q.id === id);
    const cs = S.piece_cells(p).map((c) => [c[0] + 0.5, c[1] + 0.5, c[2] + 0.5]);
    const d = [];
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) d.push(dist(cs[i], cs[j]));
    return d.sort((x, y) => x - y);
  }

  test('escena: el grupo de rotaciones de la retícula tiene 24 elementos, todos con det = +1', () => {
    const G = rotation_group();
    assert(G.length === 24, 'tamaño ' + G.length);
    assert(G.every((R) => LA.isRotation(R, 1e-12)), 'todas son rotaciones');
  });

  test('escena: nº de orientaciones de cada pieza coincide con BlockOrientation.h del juego original', () => {
    for (const type of S.PIECE_ORDER) {
      const def = S.PIECE_DEFS[type];
      assert(orientation_count(def.cubes) === def.orig_orientations,
        type + ' (allPolyCube[' + def.orig + ']): ' + orientation_count(def.cubes) + ' ≠ ' + def.orig_orientations);
    }
  });

  test('escena: ≥ 5 piezas distintas y ≥ 2 no planas; todas con cubos unitarios enteros y conexas', () => {
    assert(S.PIECE_ORDER.length >= 5, 'piezas');
    const nonplanar = S.PIECE_ORDER.filter((t) => !S.PIECE_DEFS[t].planar);
    assert(nonplanar.length >= 2, 'no planas: ' + nonplanar.join());
    for (const t of S.PIECE_ORDER) {
      const cubes = S.PIECE_DEFS[t].cubes;
      assert(cubes.every((c) => c.every(Number.isInteger)), t + ': enteros');
      // conexidad por caras
      const seen = new Set([cubes[0].join()]), stack = [cubes[0]];
      while (stack.length) {
        const c = stack.pop();
        for (const o of cubes) {
          if (!seen.has(o.join()) && Math.abs(o[0] - c[0]) + Math.abs(o[1] - c[1]) + Math.abs(o[2] - c[2]) === 1) { seen.add(o.join()); stack.push(o); }
        }
      }
      assert(seen.size === cubes.length, t + ' no es conexa');
    }
  });

  test('escena: la ficha 7 es una pieza SIMPLE (tricubo recto I3: 3 cubos en línea, plana, 3 orientaciones)', () => {
    const last = S.PIECE_ORDER[S.PIECE_ORDER.length - 1], d = S.PIECE_DEFS[last];
    assert(last === 'I3' && d.cubes.length === 3 && d.planar && d.orig_orientations === 3, 'I3');
    assert(deepEqual(d.size, [1, 3, 1]), 'tamaño ' + d.size);
    assert(deepEqual(d.pivot, [0.5, 1.5, 0.5]), 'pivote en el cubo central');
    assert(S.PIECE_ORDER.every((t) => S.PIECE_DEFS[t].cubes.length <= 4), 'ninguna pieza supera 4 cubos');
    assert(S.PIECE_ORDER.filter((t) => !S.PIECE_DEFS[t].planar).length === 2, 'siguen siendo 2 piezas no planas (tornillo y esquina 3D)');
  });

  test('escena: el catálogo (Pieces) y las mallas (Mesh) son los de la escena; Container genera marco, rejilla y ejes', () => {
    assert(S.PIECE_DEFS === Pieces.DEFS && S.PIECE_ORDER === Pieces.ORDER, 'una sola fuente de verdad');
    const objs = Container.objects([5, 5, 12]);
    assert(objs.map((o) => o.id).join() === 'container,grid,axis_x,axis_y,axis_z', objs.map((o) => o.id).join());
    assert(objs[0].edges.length === 12 && objs[1].edges.length > 40, 'marco y rejilla');
    const m = Mesh.from_segments([[[0, 0, 0], [1, 0, 0]], [[1, 0, 0], [1, 1, 0]]]);
    assert(m.vertices.length === 3 && m.edges.length === 2, 'vértices compartidos sin duplicar');
  });

  test('escena: el pivote es el centro de un cubo ocupado (coordenadas semienteras)', () => {
    for (const t of S.PIECE_ORDER) {
      const def = S.PIECE_DEFS[t];
      assert(def.pivot.every((v) => Math.abs(v - Math.floor(v) - 0.5) < 1e-12), t + ': semientero');
      assert(def.cubes.some((c) => c[0] + 0.5 === def.pivot[0] && c[1] + 0.5 === def.pivot[1] && c[2] + 0.5 === def.pivot[2]), t + ': ocupado');
    }
  });

  test('escena: create_scene por defecto -> contenedor 5×5×12, 7 piezas sin solapes ni avisos', () => {
    const sc = S.create_scene();
    assert(deepEqual(sc.container.size, [5, 5, 12]), 'tamaño');
    assert(sc.pieces.length === 7, 'piezas: ' + sc.pieces.length);
    assert(sc.warnings.length === 0, sc.warnings.join('; '));
    assert(sc.active === 'p1', 'activa');
  });

  test('escena: create_scene con datos inválidos no lanza y anota warnings', () => {
    const sc = S.create_scene({ size: [0, 5, 5], pieces: [{ type: 'NOPE', t: [0, 0, 0] }, { type: 'L3', t: [0.5, 0, 0] }, { type: 'L3', t: [4, 4, 11] }, { type: 'O4', t: [0, 0, 0] }, { type: 'O4', t: [0, 0, 0] }] });
    assert(deepEqual(sc.container.size, [5, 5, 12]), 'tamaño por defecto');
    assert(sc.pieces.length === 1, 'solo la O4 válida: ' + sc.pieces.length);
    assert(sc.warnings.length >= 5, 'warnings: ' + sc.warnings.length);
    assert(S.create_scene(null).pieces.length === 7 && S.create_scene(42).pieces.length === 7, 'config no objeto -> por defecto');
  });

  // Escena con una sola pieza en el centro del contenedor: ningún giro de 90° toca las paredes.
  const solo = (type) => S.create_scene({ pieces: [{ type, t: [1, 1, 5] }] });

  test('piezas: trasladar y rotar conserva las distancias entre cubos (rigidez), las 7 piezas', () => {
    for (const type of S.PIECE_ORDER) {
      let sc = solo(type);
      assert(sc.pieces.length === 1, type + ' creada');
      const d0 = pair_distances(sc, 'p1');
      for (const a of [
        { type: 'rotate', axis: 'x', turns: 1 }, { type: 'translate', delta: [0, 0, 1] },
        { type: 'rotate', axis: 'z', turns: -1 }, { type: 'rotate', axis: 'y', turns: 2 }, { type: 'translate', delta: [1, 0, -2] },
        { type: 'rotate', axis: 'x', turns: -1 }, { type: 'rotate', axis: 'y', turns: 1 },
      ]) {
        sc = S.apply_action(sc, a);
        assert(sc.last.ok, type + ' ' + JSON.stringify(a) + ': ' + sc.last.error);
        const d = pair_distances(sc, 'p1');
        for (let i = 0; i < d.length; i++) approx(d[i], d0[i], 1e-12, type + ' distancia');
        const p = sc.pieces[0];
        assert(LA.isRotation(p.R, 1e-12) && p.R.every((r) => r.every(Number.isInteger)), type + ': R entera y ortonormal');
      }
    }
  });

  test('piezas: el giro de 90° deja el pivote fijo y 4 giros devuelven la pose idéntica', () => {
    for (const axis of ['x', 'y', 'z']) {
      let sc = solo('SCREW');
      const pw = S.pivot_world(sc.pieces[0]);
      for (let k = 0; k < 4; k++) {
        sc = S.apply_action(sc, { type: 'rotate', axis, turns: 1 });
        assert(sc.last.ok, axis + ' paso ' + k + ': ' + sc.last.error);
        const p = sc.pieces[0];
        approx(LA.norm(LA.vsub(S.pivot_world(p), pw)), 0, 1e-12, 'pivote fijo');
        const q = LA.mulPoint4(S.model_matrix(p), S.PIECE_DEFS.SCREW.pivot);
        approx(LA.norm(LA.vsub(q.slice(0, 3), pw)), 0, 1e-12, 'M·pivote = pivote');
      }
      approxMat(sc.pieces[0].R, LA.identity(3), 0, 'R tras 4 giros');
    }
  });

  test('piezas: rotar +90° y luego −90° es la identidad; los giros de ejes distintos no conmutan', () => {
    const sc = solo('SCREW');
    const rot = (s, axis, turns) => S.apply_action(s, { type: 'rotate', axis, turns });
    const a = rot(rot(sc, 'x', 1), 'z', 1), b = rot(rot(sc, 'z', 1), 'x', 1);
    assert(a.last.ok && b.last.ok, 'giros válidos');
    assert(!deepEqual(a.pieces[0].R, b.pieces[0].R), 'no conmutan');
    approxMat(rot(rot(sc, 'y', 1), 'y', -1).pieces[0].R, LA.identity(3), 0);
  });

  test('acciones: traslación fuera del contenedor o contra otra pieza se rechaza y no cambia la geometría', () => {
    const sc = S.create_scene();
    const before = JSON.stringify(S.get_geometry(sc));
    const out = S.apply_action(sc, { type: 'translate', id: 'p1', delta: [-1, 0, 0] });
    assert(out.last.ok === false && /fuera del contenedor/.test(out.last.error), out.last.error);
    const hit = S.apply_action(sc, { type: 'translate', id: 'p1', delta: [3, 0, 0] }); // choca con O4 (p4)
    assert(hit.last.ok === false && /colisiona/.test(hit.last.error), hit.last.error);
    assert(JSON.stringify(S.get_geometry(out)) === before && JSON.stringify(S.get_geometry(hit)) === before, 'geometría intacta');
  });

  test('acciones: apply_action es inmutable (no modifica la escena de entrada)', () => {
    const sc = S.create_scene();
    const snap = JSON.stringify(sc);
    const out = S.apply_action(sc, { type: 'translate', id: 'p1', delta: [0, 0, 1] });
    assert(JSON.stringify(sc) === snap, 'la entrada cambió');
    assert(out !== sc && out.pieces[0].t[2] === 1, 'salida nueva con la traslación');
  });

  test('acciones: entradas inválidas no lanzan excepciones y quedan marcadas ok:false', () => {
    const sc = S.create_scene();
    const bad = [undefined, null, 7, 'x', {}, { type: 'volar' }, { type: 'translate', delta: [NaN, 0, 0] },
      { type: 'translate', delta: [0.5, 0, 0] }, { type: 'translate', delta: [1, 2] }, { type: 'translate', id: 'zzz', delta: [1, 0, 0] },
      { type: 'rotate', axis: 'w', turns: 1 }, { type: 'rotate', axis: 'toString', turns: 1 }, { type: 'rotate', axis: 'x', turns: 0.5 },
      { type: 'select', id: 'nope' }, { type: 'set_pose', id: 'p1' }];
    for (const a of bad) {
      const out = S.apply_action(sc, a);
      assert(out.last.ok === false, JSON.stringify(a) + ' debería ser inválida');
      assert(deepEqual(out.pieces, sc.pieces), JSON.stringify(a) + ' no debe cambiar piezas');
    }
    assert(S.apply_action(null, { type: 'select', id: 'p1' }) === null, 'escena inválida se devuelve tal cual');
  });

  test('acciones: set_pose acepta rotaciones continuas y rechaza R no rígida o t no finita', () => {
    const sc = S.create_scene();
    const R = LA.axisAngle([1, 1, 0], 0.7);
    const ok = S.apply_action(sc, { type: 'set_pose', id: 'p3', R, t: [0.25, 1.5, 6] });
    assert(ok.last.ok, ok.last.error);
    const rejected = [
      { type: 'set_pose', id: 'p3', R: LA.scale(R, 1.01), t: [0, 0, 0] },
      { type: 'set_pose', id: 'p3', R: [[1, 0, 0], [0, 1, 0], [0, 0, -1]], t: [0, 0, 0] },
      { type: 'set_pose', id: 'p3', R, t: [0, NaN, 0] },
      { type: 'set_pose', id: 'p3', R, t: [0, Infinity, 0] },
    ];
    for (const a of rejected) assert(S.apply_action(sc, a).last.ok === false, JSON.stringify(a).slice(0, 60));
    // una pose continua no permite luego traslaciones de retícula
    const t2 = S.apply_action(ok, { type: 'translate', id: 'p3', delta: [1, 0, 0] });
    assert(t2.last.ok === false && /retícula/.test(t2.last.error), t2.last.error);
  });

  test('geometría: aristas visibles unitarias de L3 (16 vért., 22 aristas), O4 (16, 20) y T4 (20, 28)', () => {
    // Deducción independiente para piezas planas de espesor 1 con perímetro P (en aristas unitarias) y c esquinas
    // del contorno: vértices = 2P, aristas horizontales = 2P, aristas verticales = c (las de caras coplanares se descartan).
    //   L3: P=8, c=6 -> 16 y 22   O4: P=8, c=4 -> 16 y 20   T4: P=10, c=8 -> 20 y 28
    const g = S.get_geometry(S.create_scene());
    const by = (id) => g.objects.find((o) => o.id === id);
    for (const [id, nv, ne] of [['p1', 16, 22], ['p4', 16, 20], ['p2', 20, 28]]) {
      assert(by(id).vertices.length === nv && by(id).edges.length === ne, id + ': ' + by(id).vertices.length + '/' + by(id).edges.length);
    }
    // un cubo suelto tiene las 12 aristas y 8 vértices
    const cube = Mesh.polycube_edges([[0, 0, 0]]);
    assert(cube.length === 12, 'cubo: ' + cube.length);
  });

  test('geometría: vértices del mundo = M·vértices locales; get_geometry está en coordenadas del MUNDO', () => {
    let sc = S.create_scene();
    sc = S.apply_action(S.apply_action(sc, { type: 'select', id: 'p6' }), { type: 'rotate', axis: 'x', turns: 1 });
    const g = S.get_geometry(sc);
    for (const o of g.objects.filter((q) => q.role === 'piece')) {
      o.vertices_local.forEach((v, i) => {
        const w = LA.mulPoint4(o.M, v);
        approx(w[3], 1, 1e-12, 'w');
        for (let a = 0; a < 3; a++) approx(o.vertices[i][a], w[a], 1e-12, o.id + ' vértice ' + i);
      });
      assert(LA.isRotation(LA.roundMat([[o.M[0][0], o.M[0][1], o.M[0][2]], [o.M[1][0], o.M[1][1], o.M[1][2]], [o.M[2][0], o.M[2][1], o.M[2][2]]]), 1e-12), 'bloque 3×3 de M');
    }
    // los vértices de la pieza p1 sin mover coinciden con sus vértices locales + t (= 0)
    const p1 = g.objects.find((o) => o.id === 'p1');
    assert(deepEqual(p1.vertices, p1.vertices_local), 'p1 en pose identidad');
  });

  test('geometría: contenedor 5×5×12 (marco de 12 aristas, esquinas en [0,5]×[0,5]×[0,12]) y ejes', () => {
    const g = S.get_geometry(S.create_scene());
    const c = g.objects.find((o) => o.id === 'container');
    assert(c.edges.length === 12 && c.vertices.length === 8, 'marco');
    const ext = [0, 1, 2].map((a) => [Math.min(...c.vertices.map((v) => v[a])), Math.max(...c.vertices.map((v) => v[a]))]);
    assert(deepEqual(ext, [[0, 5], [0, 5], [0, 12]]), JSON.stringify(ext));
    assert(g.objects.filter((o) => o.role === 'axis').length === 3 && g.objects.find((o) => o.id === 'grid').edges.length > 40, 'ejes y rejilla');
  });

  test('geometría: get_geometry con escena inválida no lanza', () => {
    for (const bad of [null, undefined, {}, { pieces: 3 }, 'x']) {
      const g = S.get_geometry(bad);
      assert(g.error && g.objects.length === 0, 'error explícito');
    }
  });

  test('geometría: todas las posiciones por defecto caben en el contenedor y la selección cicla', () => {
    let sc = S.create_scene();
    const seen = [];
    for (let i = 0; i < 8; i++) { seen.push(sc.active); sc = S.apply_action(sc, { type: 'select_next' }); }
    assert(seen.slice(0, 7).join() === 'p1,p2,p3,p4,p5,p6,p7' && seen[7] === 'p1', seen.join());
    sc = S.apply_action(S.create_scene(), { type: 'select_prev' });
    assert(sc.active === 'p7', 'select_prev desde p1 -> p7');
    sc = S.apply_action(sc, { type: 'select', index: 2 });
    assert(sc.active === 'p3', 'select por índice');
  });
})();
