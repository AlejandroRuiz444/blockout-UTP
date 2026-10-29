/*
 * mesh.js — MÓDULO ESCENA (rol A) · mallas de alambre (vértices + aristas) en coordenadas locales.
 *
 * Funciones puras, sin estado. Una malla es { vertices: [[x,y,z]...], edges: [[i,j]...] } (índices en vertices).
 */
(function (root) {
  'use strict';
  const LA = root.LinAlg || require('../core/linalg.js');

  const key3 = (a) => a[0] + ',' + a[1] + ',' + a[2];

  /**
   * Aristas VISIBLES de un policubo (como en la versión alambre del juego original): se descartan las aristas
   * interiores y las que están entre dos caras coplanares. Para cada arista candidata se miran las 4 celdas que
   * la rodean (en el plano perpendicular): se conserva si hay 1 (arista convexa), 3 (cóncava) o 2 en diagonal
   * (no-variedad); se descarta si hay 0, 4 o 2 adyacentes (cara plana / interior).
   * Devuelve [[p, q], ...] con p, q = esquinas enteras (aristas unitarias).
   */
  function polycube_edges(cubes) {
    const occ = new Set(cubes.map(key3));
    const has = (c) => occ.has(key3(c));
    const seen = new Map();
    for (const cube of cubes) {
      for (let axis = 0; axis < 3; axis++) {
        const a1 = (axis + 1) % 3, a2 = (axis + 2) % 3;
        for (let d1 = 0; d1 < 2; d1++) {
          for (let d2 = 0; d2 < 2; d2++) {
            const p = cube.slice(); p[a1] += d1; p[a2] += d2;
            const q = p.slice(); q[axis] += 1;
            const k = key3(p) + '|' + key3(q);
            if (seen.has(k)) continue;
            const c = [];
            for (let o1 = -1; o1 <= 0; o1++) {
              for (let o2 = -1; o2 <= 0; o2++) {
                const cell = p.slice(); cell[a1] += o1; cell[a2] += o2;
                c.push(has(cell));
              }
            }
            const n = c.filter(Boolean).length;
            const keep = n === 1 || n === 3 || (n === 2 && ((c[0] && c[3]) || (c[1] && c[2])));
            seen.set(k, keep ? [p, q] : null);
          }
        }
      }
    }
    return Array.from(seen.values()).filter(Boolean);
  }

  /** Convierte una lista de segmentos [[p,q],...] en { vertices, edges } sin vértices duplicados. */
  function from_segments(segs) {
    const index = new Map(), vertices = [], edges = [];
    const vid = (p) => {
      const k = key3(p);
      if (!index.has(k)) { index.set(k, vertices.length); vertices.push(p.slice()); }
      return index.get(k);
    };
    for (const [p, q] of segs) edges.push([vid(p), vid(q)]);
    return { vertices, edges };
  }

  /** Objeto 3D estático (M = identidad: sus vértices locales ya están en el mundo). */
  function static_object(id, role, segs) {
    const m = from_segments(segs);
    return { id, role, active: false, M: LA.identity(4), vertices_local: m.vertices, vertices: m.vertices.map((v) => v.slice()), edges: m.edges };
  }

  const Mesh = { polycube_edges, from_segments, static_object };
  root.Mesh = Mesh;
  if (typeof module !== 'undefined' && module.exports) module.exports = Mesh;
})(typeof globalThis !== 'undefined' ? globalThis : this);
