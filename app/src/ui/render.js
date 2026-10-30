/*
 * render.js — MÓDULO APLICACIÓN (rol C), DrawPrimitives2D -> pantalla.
 *
 * Solo DIBUJA primitivas 2D que ya vienen proyectadas (líneas en píxeles). No calcula cámara ni proyección y no
 * usa transformaciones 3D del navegador. Los colores por tipo de pieza son una decisión de interfaz.
 */
(function (root) {
  'use strict';

  const PIECE_COLORS = {
    L3: '#ff7b72', T4: '#ffa657', S4: '#7ee787', O4: '#e3b341', SCREW: '#79c0ff', CORNER3D: '#d2a8ff', I3: '#ff9bce',
  };
  const AXIS_COLORS = { axis_x: '#ff5f5f', axis_y: '#5fdc5f', axis_z: '#5fa0ff' };
  const BG = '#0d1117';

  function piece_color(type) { return PIECE_COLORS[type] || '#c9d1d9'; }

  function line(ctx, x1, y1, x2, y2, color, width, alpha, dash) {
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 1;
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  /** Marcadores para el experimento de homografía: dot, ring, cross (+), x, diamond. */
  function marker(ctx, x, y, shape, color, size) {
    const r = size || 5;
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = 1;
    ctx.beginPath();
    if (shape === 'dot') { ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill(); return; }
    if (shape === 'ring') { ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.stroke(); return; }
    if (shape === 'cross') { ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); }
    else if (shape === 'x') { ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x - r, y + r); ctx.lineTo(x + r, y - r); }
    else { ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); }
    ctx.stroke();
  }

  function text(ctx, str, x, y, color, font) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = color || '#c9d1d9';
    ctx.font = font || '12px system-ui, sans-serif';
    ctx.fillText(str, x, y);
  }

  function clear(ctx, w, h) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);
  }

  /** Estilo de una línea según su rol (container, grid, axis, piece). */
  function style_of(l) {
    if (l.role === 'grid') return { color: '#8b949e', width: 1, alpha: 0.22, order: 0 };
    if (l.role === 'container') return { color: '#c9d1d9', width: 1.6, alpha: 0.9, order: 1 };
    if (l.role === 'axis') return { color: AXIS_COLORS[l.id] || '#fff', width: 2.5, alpha: 1, order: 4 };
    if (l.active) return { color: piece_color(l.type), width: 3.2, alpha: 1, order: 3 };
    return { color: piece_color(l.type), width: 1.8, alpha: 1, order: 2 };
  }

  /**
   * Dibuja un DrawPrimitives2D. Las líneas de piezas se atenúan con la profundidad z_c (más lejos = más tenue)
   * como ayuda visual; la profundidad la entrega el módulo de proyección.
   */
  function draw_primitives(ctx, prims, opts) {
    const o = opts || {};
    if (!prims || !Array.isArray(prims.lines)) return;
    let zmin = Infinity, zmax = -Infinity;
    for (const l of prims.lines) { const z = (l.z1 + l.z2) / 2; if (z < zmin) zmin = z; if (z > zmax) zmax = z; }
    const span = zmax - zmin > 1e-9 ? zmax - zmin : 1;
    const items = prims.lines.map((l) => ({ l, s: style_of(l) })).sort((a, b) => a.s.order - b.s.order);
    for (const { l, s } of items) {
      let a = s.alpha;
      if (o.depth_cue !== false && (l.role === 'piece' || l.role === 'container')) a *= 1 - 0.55 * ((l.z1 + l.z2) / 2 - zmin) / span;
      line(ctx, l.x1, l.y1, l.x2, l.y2, o.mono || s.color, s.width, a);
    }
  }

  /** Pantalla completa de la escena principal: fondo + primitivas. */
  function draw_scene(ctx, prims, w, h) {
    clear(ctx, w, h);
    draw_primitives(ctx, prims);
  }

  const Render = { PIECE_COLORS, piece_color, line, marker, text, clear, draw_primitives, draw_scene };
  root.Render = Render;
  if (typeof module !== 'undefined' && module.exports) module.exports = Render;
})(typeof globalThis !== 'undefined' ? globalThis : this);
