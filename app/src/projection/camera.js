/*
 * camera.js — MÓDULO CÁMARA (rol B, parte 1: construcción de K, R, t, P).
 *
 * No conoce piezas ni reglas de la escena. Construye la cámara de forma explícita:
 *   - Extrínsecos R, t (mundo -> cámara) mediante un look-at propio a partir de la órbita.
 *   - Intrínsecos K (3×3) a partir del campo de visión vertical y del viewport.
 *   - P = K·[R | t]  (3×4).
 *
 * Sistema de la cámara (convención "OpenCV"): x_c hacia la DERECHA, y_c hacia ABAJO, z_c hacia
 * ADELANTE (el eje óptico). Imagen: u a la derecha, v hacia abajo, en píxeles. Como y_c y v apuntan
 * en el mismo sentido, fy > 0.   X_c = R·X_w + t ;  λ·[u v 1]ᵀ = K·X_c  con  λ = z_c.
 *
 * Ángulos en RADIANES. Mundo: Z hacia arriba.
 *
 * Política de errores: build_camera NUNCA lanza. Un parámetro no finito se sustituye por su valor
 * por defecto y uno fuera de rango se recorta; ambos casos quedan listados en camera.sanitized.
 */
(function (root) {
  'use strict';
  const LA = root.LinAlg || require('../core/linalg.js');
  const DEG = Math.PI / 180;

  const DEFAULTS = {
    azimuth: -50 * DEG,          // ángulo en el plano XY medido desde +X hacia +Y
    elevation: 25 * DEG,         // ángulo sobre el plano XY
    distance: 24,                // unidades (celdas) entre la cámara y el punto objetivo
    target: [2.5, 2.5, 6],       // centro del contenedor 5×5×12
    fov_y: 45 * DEG,             // campo de visión vertical
    near: 0.1,                   // plano cercano: se conserva z_c ≥ near
    viewport: { width: 960, height: 640 },
  };
  const LIMITS = {
    elevation: [-89 * DEG, 89 * DEG], distance: [0.5, 100], fov_y: [10 * DEG, 120 * DEG],
    near: [1e-3, 10], size: [1, 16384], azimuth: [-1e6, 1e6],
  };

  function clampNum(v, def, lim, name, list) {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      if (v !== undefined) list.push(name);
      return def;
    }
    if (v < lim[0]) { list.push(name); return lim[0]; }
    if (v > lim[1]) { list.push(name); return lim[1]; }
    return v;
  }

  function vec3(v, def, name, list) {
    if (Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === 'number' && Number.isFinite(x))) return v.slice();
    if (v !== undefined) list.push(name);
    return def ? def.slice() : null;
  }

  /** Copia saneada de los parámetros: { params, sanitized: [nombres] }. */
  function sanitize(p) {
    const s = p && typeof p === 'object' ? p : {};
    const list = [];
    const vp = s.viewport && typeof s.viewport === 'object' ? s.viewport : {};
    const params = {
      azimuth: clampNum(s.azimuth, DEFAULTS.azimuth, LIMITS.azimuth, 'azimuth', list),
      elevation: clampNum(s.elevation, DEFAULTS.elevation, LIMITS.elevation, 'elevation', list),
      distance: clampNum(s.distance, DEFAULTS.distance, LIMITS.distance, 'distance', list),
      target: vec3(s.target, DEFAULTS.target, 'target', list),
      fov_y: clampNum(s.fov_y, DEFAULTS.fov_y, LIMITS.fov_y, 'fov_y', list),
      near: clampNum(s.near, DEFAULTS.near, LIMITS.near, 'near', list),
      viewport: {
        width: clampNum(vp.width, DEFAULTS.viewport.width, LIMITS.size, 'viewport.width', list),
        height: clampNum(vp.height, DEFAULTS.viewport.height, LIMITS.size, 'viewport.height', list),
      },
    };
    const eye = vec3(s.eye, null, 'eye', list);
    if (eye) params.eye = eye;
    return { params, sanitized: list };
  }

  /**
   * Look-at propio. Dados la posición del ojo, el punto mirado y un vector "arriba" del mundo:
   *   f = normalize(target − eye)            (z_c, adelante)
   *   r = normalize(f × up)                  (x_c, derecha)
   *   d = f × r                              (y_c, abajo)
   *   R = [rᵀ; dᵀ; fᵀ] (filas),  t = −R·eye
   * Si f es paralelo a up se usa up = [0,1,0]. Devuelve null si eye == target.
   */
  function look_at(eye, target, up) {
    const f = LA.normalize(LA.vsub(target, eye));
    if (!f) return null;
    let r = LA.normalize(LA.cross(f, up || [0, 0, 1]));
    if (!r) r = LA.normalize(LA.cross(f, [0, 1, 0]));
    const d = LA.cross(f, r);
    const R = [r, d, f];
    const Re = LA.mulVec(R, eye);
    return { R, t: [-Re[0], -Re[1], -Re[2]], C: eye.slice(), right: r, down: d, forward: f };
  }

  /** Focal en píxeles para un FOV (rad) sobre una dimensión de size píxeles: f = (size/2)/tan(fov/2). */
  function focal_from_fov(fov, size) { return (size / 2) / Math.tan(fov / 2); }
  function fov_from_focal(f, size) { return 2 * Math.atan((size / 2) / f); }

  /**
   * build_camera(parameters) -> Camera
   * parameters = { azimuth, elevation, distance, target:[x,y,z], fov_y, near, viewport:{width,height} }
   *   (opcional: eye:[x,y,z] coloca el centro de cámara allí; azimuth/elevation/distance se ignoran).
   *   Posición: eye = target + distance·(cosφ·cosθ, cosφ·sinθ, sinφ)  con θ = azimuth, φ = elevation.
   * Camera = { K (3×3), R (3×3), t (3), P (3×4), C (centro, mundo), near, viewport, intrinsics:{fx,fy,cx,cy},
   *            params (saneados), sanitized (nombres corregidos) }
   * K = [[fx,0,cx],[0,fy,cy],[0,0,1]] con cx = width/2, cy = height/2, fy = (height/2)/tan(fov_y/2), fx = fy
   * (píxeles cuadrados).
   */
  function build_camera(parameters) {
    const { params, sanitized } = sanitize(parameters);
    const T = params.target;
    let eye = params.eye;
    if (!eye) {
      const ce = Math.cos(params.elevation);
      eye = [
        T[0] + params.distance * ce * Math.cos(params.azimuth),
        T[1] + params.distance * ce * Math.sin(params.azimuth),
        T[2] + params.distance * Math.sin(params.elevation),
      ];
    }
    let L = look_at(eye, T, [0, 0, 1]);
    if (!L) { // eye == target: se retrocede a lo largo de -Y (caso degenerado)
      eye = [T[0], T[1] - 1, T[2]];
      L = look_at(eye, T, [0, 0, 1]);
      sanitized.push('eye');
    }
    const { width, height } = params.viewport;
    const fy = focal_from_fov(params.fov_y, height);
    const fx = fy;
    const cx = width / 2, cy = height / 2;
    const K = [[fx, 0, cx], [0, fy, cy], [0, 0, 1]];
    const Rt = [
      [L.R[0][0], L.R[0][1], L.R[0][2], L.t[0]],
      [L.R[1][0], L.R[1][1], L.R[1][2], L.t[1]],
      [L.R[2][0], L.R[2][1], L.R[2][2], L.t[2]],
    ];
    return {
      K, R: L.R, t: L.t, P: LA.matMul(K, Rt), C: eye,
      near: params.near, viewport: { width, height },
      intrinsics: { fx, fy, cx, cy }, params, sanitized,
    };
  }

  function default_params() { return JSON.parse(JSON.stringify(DEFAULTS)); }

  /**
   * adjust(params, delta) -> params nuevos (valores recortados a sus límites).
   * delta = { d_azimuth, d_elevation, distance_factor, d_fov } (todos opcionales, radianes / factor).
   * No toca la escena: mover la cámara solo cambia R, t, K.
   */
  function adjust(params, delta) {
    const base = sanitize(params).params;
    const d = delta || {};
    const next = JSON.parse(JSON.stringify(base));
    delete next.eye;
    if (Number.isFinite(d.d_azimuth)) next.azimuth += d.d_azimuth;
    if (Number.isFinite(d.d_elevation)) next.elevation += d.d_elevation;
    if (Number.isFinite(d.distance_factor) && d.distance_factor > 0) next.distance *= d.distance_factor;
    if (Number.isFinite(d.d_fov)) next.fov_y += d.d_fov;
    return sanitize(next).params;
  }

  const Camera = { DEFAULTS, LIMITS, build_camera, look_at, default_params, adjust, sanitize, focal_from_fov, fov_from_focal };
  root.Camera = Camera;
  if (typeof module !== 'undefined' && module.exports) module.exports = Camera;
})(typeof globalThis !== 'undefined' ? globalThis : this);
