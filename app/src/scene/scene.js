/*
 * scene.js — MÓDULO ESCENA (rol A: escena y geometría).
 *
 * Es dueño del ESTADO de la escena (contenedor, piezas y sus poses 3D). Usa el catálogo de piezas (pieces.js), las
 * mallas (mesh.js) y la geometría estática (container.js) de su propia carpeta y el álgebra de core/linalg.js.
 * NO sabe nada de cámara, proyección, animación ni pantalla.
 *
 * API pública:
 *   create_scene(config)        -> Scene
 *   apply_action(scene, action) -> Scene      (inmutable: devuelve una escena NUEVA)
 *   get_geometry(scene)         -> Geometry3D (vértices y aristas en coordenadas del MUNDO)
 *
 * Política de errores (ver docs/INTERFACES.md §6): ninguna función pública lanza excepciones.
 *   - create_scene con datos inválidos: omite la pieza/valor inválido y lo anota en scene.warnings.
 *   - apply_action con una acción inválida: devuelve una copia de la escena SIN cambios en las
 *     piezas y con scene.last = { ok:false, error:"..." }. Si no es inválida, scene.last.ok = true.
 *   - get_geometry con una escena inválida: { objects: [], error: "..." }.
 *
 * Unidades: 1 celda del contenedor = 1 unidad. Mundo: X, Y horizontales, Z hacia arriba
 * (mano derecha). El piso del contenedor es el plano Z = 0.
 */
(function (root) {
  'use strict';
  const LA = root.LinAlg || require('../core/linalg.js');
  const Pieces = root.Pieces || require('./pieces.js');
  const Mesh = root.Mesh || require('./mesh.js');
  const Container = root.Container || require('./container.js');

  const PIECE_DEFS = Pieces.DEFS;
  const PIECE_ORDER = Pieces.ORDER;
  const key3 = (a) => a[0] + ',' + a[1] + ',' + a[2];

  const MESH_CACHE = {};
  function piece_mesh(type) {
    if (!MESH_CACHE[type]) MESH_CACHE[type] = Mesh.from_segments(Mesh.polycube_edges(PIECE_DEFS[type].cubes));
    return MESH_CACHE[type];
  }

  // ------------------------------------------------------------------- poses
  /** M (4×4): local -> mundo. M = T(p + t) · [R 0; 0 1] · T(−p), con p = pivote local. */
  function model_matrix(piece) {
    const p = PIECE_DEFS[piece.type].pivot;
    const Tp = LA.translation4([p[0] + piece.t[0], p[1] + piece.t[1], p[2] + piece.t[2]]);
    const R4 = LA.rigid4(piece.R, [0, 0, 0]);
    const Tm = LA.translation4([-p[0], -p[1], -p[2]]);
    return LA.matMul(LA.matMul(Tp, R4), Tm);
  }

  /** Posición del pivote en coordenadas del mundo: p + t (el pivote es el punto fijo de R). */
  function pivot_world(piece) {
    const p = PIECE_DEFS[piece.type].pivot;
    return [p[0] + piece.t[0], p[1] + piece.t[1], p[2] + piece.t[2]];
  }

  /**
   * Celdas enteras [x,y,z] que ocupa la pieza en el mundo, o null si su pose no está alineada a la
   * retícula (R con entradas enteras y t entera). Una celda (i,j,k) ocupa [i,i+1]×[j,j+1]×[k,k+1].
   */
  function piece_cells(piece) {
    const def = PIECE_DEFS[piece.type];
    const out = [];
    for (const c of def.cubes) {
      const rel = LA.vsub([c[0] + 0.5, c[1] + 0.5, c[2] + 0.5], def.pivot);
      const w = LA.mulVec(piece.R, rel);
      const idx = [0, 1, 2].map((a) => w[a] + def.pivot[a] + piece.t[a] - 0.5);
      const r = idx.map(Math.round);
      if (idx.some((v, a) => Math.abs(v - r[a]) > 1e-6)) return null;
      out.push(r);
    }
    return out;
  }

  function placement_error(scene, id, cells) {
    const [W, H, D] = scene.container.size;
    for (const c of cells) {
      if (c[0] < 0 || c[1] < 0 || c[2] < 0 || c[0] >= W || c[1] >= H || c[2] >= D) return 'fuera del contenedor';
    }
    const used = new Set();
    for (const p of scene.pieces) {
      if (p.id === id) continue;
      const pc = piece_cells(p);
      if (pc) pc.forEach((c) => used.add(key3(c)));
    }
    for (const c of cells) if (used.has(key3(c))) return 'colisiona con otra pieza';
    return null;
  }

  // ------------------------------------------------------------- create_scene
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const isIntVec = (v, n) => Array.isArray(v) && v.length === n && v.every(Number.isInteger);

  function default_config() {
    return {
      size: [5, 5, 12],
      pieces: [
        { type: 'L3', t: [0, 0, 0] },
        { type: 'T4', t: [1, 3, 0] },
        { type: 'S4', t: [1, 1, 6] },
        { type: 'O4', t: [3, 0, 0] },
        { type: 'SCREW', t: [3, 3, 2] },
        { type: 'CORNER3D', t: [0, 0, 3] },
        { type: 'I3', t: [2, 2, 8] },
      ],
    };
  }

  /**
   * create_scene(config) -> Scene.  config = { size:[W,H,D], pieces:[{type, t:[x,y,z], R?}], active? }.
   * Sin config usa default_config(). Valores inválidos -> se omiten y se anotan en scene.warnings.
   */
  function create_scene(config) {
    const cfg = config && typeof config === 'object' ? config : default_config();
    const warnings = [];
    let size = cfg.size;
    if (!(isIntVec(size, 3) && size.every((v) => v >= 1 && v <= 64))) {
      if (cfg.size !== undefined) warnings.push('size inválido: se usa [5,5,12]');
      size = [5, 5, 12];
    }
    const scene = { version: 1, container: { size: size.slice() }, pieces: [], active: null, last: { ok: true, action: 'create', error: null }, warnings };
    (Array.isArray(cfg.pieces) ? cfg.pieces : []).forEach((spec, i) => {
      if (!spec || !PIECE_DEFS[spec.type]) { warnings.push('pieza ' + i + ': tipo desconocido'); return; }
      const R = spec.R === undefined ? LA.identity(3) : spec.R;
      if (!LA.isRotation(R, 1e-9) || !isIntVec(spec.t, 3)) { warnings.push('pieza ' + i + ': pose inválida (R rotación entera, t entero)'); return; }
      const piece = { id: 'p' + (scene.pieces.length + 1), type: spec.type, R: clone(R), t: spec.t.slice() };
      const cells = piece_cells(piece);
      const err = cells ? placement_error(scene, piece.id, cells) : 'pose no alineada a la retícula';
      if (err) { warnings.push('pieza ' + i + ' (' + spec.type + '): ' + err); return; }
      scene.pieces.push(piece);
    });
    const act = scene.pieces.find((p) => p.id === cfg.active);
    scene.active = act ? act.id : (scene.pieces[0] ? scene.pieces[0].id : null);
    return scene;
  }

  // ------------------------------------------------------------- apply_action
  const AXES = { x: 0, y: 1, z: 2 };

  function is_scene(s) {
    return !!s && typeof s === 'object' && Array.isArray(s.pieces) && s.container && isIntVec(s.container.size, 3);
  }

  /** Ejecuta la acción sobre next (copia ya clonada). Devuelve null si OK o un mensaje de error. */
  function run_action(next, a) {
    if (!a || typeof a !== 'object' || typeof a.type !== 'string') return 'acción inválida';
    const find = (id) => next.pieces.find((p) => p.id === id);
    const target = () => find(a.id === undefined ? next.active : a.id);
    switch (a.type) {
      case 'select': {
        const p = a.index !== undefined ? next.pieces[a.index] : find(a.id);
        if (!p) return 'pieza inexistente';
        next.active = p.id;
        return null;
      }
      case 'select_next':
      case 'select_prev': {
        if (!next.pieces.length) return 'no hay piezas';
        const i = next.pieces.findIndex((p) => p.id === next.active);
        const d = a.type === 'select_next' ? 1 : -1;
        next.active = next.pieces[(i + d + next.pieces.length) % next.pieces.length].id;
        return null;
      }
      case 'translate': {
        const p = target();
        if (!p) return 'pieza inexistente';
        if (!isIntVec(a.delta, 3)) return 'delta debe ser [dx,dy,dz] con enteros';
        const moved = { type: p.type, R: p.R, t: [p.t[0] + a.delta[0], p.t[1] + a.delta[1], p.t[2] + a.delta[2]] };
        const cells = piece_cells(moved);
        if (!cells) return 'la pieza no está alineada a la retícula';
        const err = placement_error(next, p.id, cells);
        if (err) return 'traslación bloqueada: ' + err;
        p.t = moved.t;
        return null;
      }
      case 'rotate': {
        const p = target();
        if (!p) return 'pieza inexistente';
        if (!Object.prototype.hasOwnProperty.call(AXES, a.axis) || !Number.isInteger(a.turns)) return "rotate requiere axis 'x'|'y'|'z' y turns entero (cuartos de vuelta)";
        const rot = [LA.rotX, LA.rotY, LA.rotZ][AXES[a.axis]](a.turns * Math.PI / 2);
        // Paso final EXACTO sobre la retícula: se redondean las entradas de la matriz resultante.
        const R = LA.roundMat(LA.matMul(rot, p.R));
        if (!LA.isRotation(R, 1e-12)) return 'la rotación resultante no es una rotación válida';
        const turned = { type: p.type, R, t: p.t };
        const cells = piece_cells(turned);
        if (!cells) return 'la pieza no está alineada a la retícula';
        const err = placement_error(next, p.id, cells);
        if (err) return 'rotación bloqueada: ' + err;
        p.R = R;
        return null;
      }
      case 'set_pose': {
        // Usada por la animación: pose continua (no exige retícula ni límites), solo rigidez.
        const p = find(a.id);
        if (!p) return 'pieza inexistente';
        if (!LA.isRotation(a.R, 1e-9)) return 'R no es ortonormal con det = +1';
        if (!Array.isArray(a.t) || a.t.length !== 3 || !LA.allFinite(a.t)) return 't debe ser [x,y,z] finito';
        p.R = clone(a.R);
        p.t = a.t.slice();
        return null;
      }
      default:
        return 'tipo de acción desconocido: ' + a.type;
    }
  }

  /**
   * apply_action(scene, action) -> Scene (nueva; la entrada NO se modifica).
   * Acciones: {type:'select', id|index} · {type:'select_next'|'select_prev'} ·
   *   {type:'translate', id?, delta:[dx,dy,dz] enteros} ·
   *   {type:'rotate', id?, axis:'x'|'y'|'z', turns: entero} (giro de 90°·turns alrededor del eje del MUNDO
   *   que pasa por el pivote) · {type:'set_pose', id, R:3×3, t:[3]} (pose rígida arbitraria).
   * Acción inválida o bloqueada -> escena sin cambios en piezas y last = {ok:false, error}.
   */
  function apply_action(scene, action) {
    if (!is_scene(scene)) return scene;
    const name = action && typeof action.type === 'string' ? action.type : String(action);
    let next;
    try {
      next = clone(scene);
    } catch (e) {
      return scene;
    }
    let err;
    try {
      err = run_action(next, action);
    } catch (e) {
      err = 'error interno al aplicar la acción: ' + e.message;
    }
    if (err) {
      const same = clone(scene);
      same.last = { ok: false, action: name, error: err };
      return same;
    }
    next.last = { ok: true, action: name, error: null };
    return next;
  }

  // -------------------------------------------------------------- get_geometry
  /**
   * get_geometry(scene) -> Geometry3D = { objects: [Object3D], error }.
   * Object3D = { id, role: 'container'|'grid'|'axis'|'piece', type?, active, M (4×4 local->mundo),
   *              vertices_local [[x,y,z]], vertices [[x,y,z]] (MUNDO = M·local), edges [[i,j]] }.
   * Aquí se aplica M; la cámara (R, t, K) la aplica el módulo de proyección.
   */
  function get_geometry(scene) {
    if (!is_scene(scene)) return { objects: [], error: 'escena inválida' };
    const objects = Container.objects(scene.container.size);
    for (const piece of scene.pieces) {
      if (!PIECE_DEFS[piece.type] || !LA.isRotation(piece.R, 1e-6) || !LA.allFinite(piece.t)) continue;
      const mesh = piece_mesh(piece.type);
      const M = model_matrix(piece);
      objects.push({
        id: piece.id, role: 'piece', type: piece.type, active: piece.id === scene.active,
        M, vertices_local: mesh.vertices.map((v) => v.slice()),
        vertices: mesh.vertices.map((v) => LA.mulPoint4(M, v).slice(0, 3)),
        edges: mesh.edges.map((e) => e.slice()),
      });
    }
    return { objects, error: null };
  }

  const Scene = {
    PIECE_DEFS, PIECE_ORDER, default_config, create_scene, apply_action, get_geometry,
    model_matrix, pivot_world, piece_cells,
  };
  root.Scene = Scene;
  if (typeof module !== 'undefined' && module.exports) module.exports = Scene;
})(typeof globalThis !== 'undefined' ? globalThis : this);
