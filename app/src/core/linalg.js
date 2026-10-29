/*
 * linalg.js — mini-biblioteca de álgebra lineal propia (cero dependencias).
 *
 * Convenciones:
 *   - Matriz = arreglo de filas (row-major): A[i][j]. Vec3/Vec4 = arreglo plano.
 *   - Mat3 = 3×3, Mat4 = 4×4, Mat3x4 = 3×4. Todo es JSON-friendly.
 *   - Convención columna: un punto es un vector columna y se transforma como x' = A·x.
 *   - Ángulos en RADIANES.
 *
 * Política de errores (módulo de bajo nivel):
 *   - Dimensiones incompatibles -> lanza RangeError (error de programación).
 *   - Matriz singular o con valores no finitos -> inverse/solve devuelven null.
 *   - Los módulos públicos (scene, camera, projection, homography) validan sus entradas
 *     ANTES de llamar aquí, así que no propagan excepciones al usuario.
 */
(function (root) {
  'use strict';

  function isNum(x) { return typeof x === 'number' && Number.isFinite(x); }

  /** true si todos los números del arreglo (anidado) son finitos (sin NaN ni ±Infinity). */
  function allFinite(a) {
    if (Array.isArray(a)) {
      for (let i = 0; i < a.length; i++) if (!allFinite(a[i])) return false;
      return true;
    }
    return isNum(a);
  }

  function zeros(r, c) {
    const M = [];
    for (let i = 0; i < r; i++) M.push(new Array(c).fill(0));
    return M;
  }

  function identity(n) {
    const I = zeros(n, n);
    for (let i = 0; i < n; i++) I[i][i] = 1;
    return I;
  }

  function clone(A) { return A.map((row) => row.slice()); }

  function dims(A) { return [A.length, A.length ? A[0].length : 0]; }

  /** Producto matricial C = A·B (A: n×m, B: m×p). */
  function matMul(A, B) {
    const n = A.length, m = B.length, p = B[0].length;
    if (A[0].length !== m) throw new RangeError('matMul: dimensiones incompatibles');
    const C = zeros(n, p);
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < m; k++) {
        const a = A[i][k];
        for (let j = 0; j < p; j++) C[i][j] += a * B[k][j];
      }
    }
    return C;
  }

  /** Producto matriz·vector columna y = A·x. */
  function mulVec(A, x) {
    if (A[0].length !== x.length) throw new RangeError('mulVec: dimensiones incompatibles');
    const y = new Array(A.length).fill(0);
    for (let i = 0; i < A.length; i++) {
      let s = 0;
      for (let j = 0; j < x.length; j++) s += A[i][j] * x[j];
      y[i] = s;
    }
    return y;
  }

  function transpose(A) {
    const n = A.length, m = A[0].length;
    const T = zeros(m, n);
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) T[j][i] = A[i][j];
    return T;
  }

  function add(A, B) { return A.map((r, i) => r.map((v, j) => v + B[i][j])); }
  function sub(A, B) { return A.map((r, i) => r.map((v, j) => v - B[i][j])); }
  function scale(A, s) { return A.map((r) => r.map((v) => v * s)); }

  function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function norm(a) { return Math.sqrt(dot(a, a)); }
  function vsub(a, b) { return a.map((v, i) => v - b[i]); }
  function vadd(a, b) { return a.map((v, i) => v + b[i]); }
  function vscale(a, s) { return a.map((v) => v * s); }
  /** Vector unitario, o null si la norma es ~0 o no es finita. */
  function normalize(a) {
    const n = norm(a);
    if (!(n > 1e-300) || !Number.isFinite(n)) return null;
    return a.map((v) => v / n);
  }

  /** Determinante de una matriz cuadrada (eliminación gaussiana con pivoteo parcial). */
  function det(A) {
    const n = A.length;
    const M = clone(A);
    let d = 1;
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (M[p][c] === 0) return 0;
      if (p !== c) { const tmp = M[p]; M[p] = M[c]; M[c] = tmp; d = -d; }
      d *= M[c][c];
      for (let r = c + 1; r < n; r++) {
        const f = M[r][c] / M[c][c];
        for (let k = c; k < n; k++) M[r][k] -= f * M[c][k];
      }
    }
    return d;
  }

  function maxAbs(A) {
    let m = 0;
    for (const r of A) for (const v of r) if (Math.abs(v) > m) m = Math.abs(v);
    return m;
  }

  /**
   * Resuelve A·X = B por Gauss-Jordan con pivoteo parcial. B puede ser vector (n) o matriz (n×m).
   * Devuelve null si A es singular (pivote < 1e-13 · max|A|) o hay valores no finitos.
   */
  function solve(A, B) {
    const n = A.length;
    const isVec = !Array.isArray(B[0]);
    const Bm = isVec ? B.map((v) => [v]) : B;
    if (!allFinite(A) || !allFinite(Bm)) return null;
    const m = Bm[0].length;
    const M = A.map((row, i) => row.concat(Bm[i]));
    const tol = 1e-13 * Math.max(maxAbs(A), 1e-300);
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (Math.abs(M[p][c]) < tol) return null;
      if (p !== c) { const tmp = M[p]; M[p] = M[c]; M[c] = tmp; }
      const piv = M[c][c];
      for (let k = c; k < n + m; k++) M[c][k] /= piv;
      for (let r = 0; r < n; r++) {
        if (r === c) continue;
        const f = M[r][c];
        if (f === 0) continue;
        for (let k = c; k < n + m; k++) M[r][k] -= f * M[c][k];
      }
    }
    const X = M.map((row) => row.slice(n));
    if (!allFinite(X)) return null;
    return isVec ? X.map((r) => r[0]) : X;
  }

  /** Inversa de una matriz cuadrada, o null si es singular. */
  function inverse(A) { return solve(A, identity(A.length)); }

  // ---- Rotaciones 3D (Mat3), ángulo en radianes, mano derecha ----
  function rotX(a) { const c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, -s], [0, s, c]]; }
  function rotY(a) { const c = Math.cos(a), s = Math.sin(a); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; }
  function rotZ(a) { const c = Math.cos(a), s = Math.sin(a); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; }

  /** Rotación de ángulo a alrededor de un eje cualquiera (fórmula de Rodrigues). null si el eje es nulo. */
  function axisAngle(axis, a) {
    const u = normalize(axis);
    if (!u) return null;
    const c = Math.cos(a), s = Math.sin(a), k = 1 - c;
    const [x, y, z] = u;
    return [
      [c + x * x * k, x * y * k - z * s, x * z * k + y * s],
      [y * x * k + z * s, c + y * y * k, y * z * k - x * s],
      [z * x * k - y * s, z * y * k + x * s, c + z * z * k],
    ];
  }

  /**
   * Eje y ángulo de una rotación R (inversa de axisAngle): R = axisAngle(axis, angle) con angle ∈ [0, π].
   * Casos límite: angle ≈ 0 -> eje [0,0,1]; angle ≈ π -> el eje se obtiene de (R + I)/2 (el signo es indiferente).
   * Devuelve null si R no es una rotación.
   */
  function rotationAxisAngle(R) {
    if (!isRotation(R, 1e-6)) return null;
    const c = Math.min(1, Math.max(-1, (R[0][0] + R[1][1] + R[2][2] - 1) / 2));
    const angle = Math.acos(c);
    if (angle < 1e-9) return { axis: [0, 0, 1], angle: 0 };
    if (Math.PI - angle < 1e-6) {
      const d = [(R[0][0] + 1) / 2, (R[1][1] + 1) / 2, (R[2][2] + 1) / 2];
      const k = d.indexOf(Math.max(d[0], d[1], d[2]));
      const a = [0, 0, 0];
      a[k] = Math.sqrt(Math.max(d[k], 0));
      for (let j = 0; j < 3; j++) if (j !== k) a[j] = (R[k][j] + R[j][k]) / (4 * a[k]);
      return { axis: normalize(a), angle: Math.PI };
    }
    const s = 2 * Math.sin(angle);
    return { axis: [(R[2][1] - R[1][2]) / s, (R[0][2] - R[2][0]) / s, (R[1][0] - R[0][1]) / s], angle };
  }

  function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }

  /** Redondea cada entrada al entero más cercano (sin -0). */
  function roundMat(A) { return A.map((r) => r.map((v) => { const q = Math.round(v); return q === 0 ? 0 : q; })); }

  /** R ortonormal con det = +1 (tolerancia tol sobre ||RᵀR − I||∞ y |det − 1|). */
  function isRotation(R, tol) {
    tol = tol === undefined ? 1e-9 : tol;
    if (!Array.isArray(R) || R.length !== 3 || !R.every((r) => Array.isArray(r) && r.length === 3)) return false;
    if (!allFinite(R)) return false;
    const E = sub(matMul(transpose(R), R), identity(3));
    return maxAbs(E) <= tol && Math.abs(det(R) - 1) <= tol;
  }

  // ---- Matrices homogéneas 4×4 ----
  /** Mat4 rígida [R t; 0 1]. */
  function rigid4(R, t) {
    return [
      [R[0][0], R[0][1], R[0][2], t[0]],
      [R[1][0], R[1][1], R[1][2], t[1]],
      [R[2][0], R[2][1], R[2][2], t[2]],
      [0, 0, 0, 1],
    ];
  }
  function translation4(t) { return rigid4(identity(3), t); }
  /** Aplica una Mat4 a un punto 3D (w = 1) y devuelve [x, y, z, w] (sin dividir). */
  function mulPoint4(M, p) { return mulVec(M, [p[0], p[1], p[2], 1]); }

  /**
   * Autovalores/autovectores de una matriz simétrica (método de Jacobi).
   * Devuelve { values (ascendentes), vectors } con vectors[k] = autovector unitario k.
   */
  function symEigen(S) {
    const n = S.length;
    const A = clone(S), V = identity(n);
    let total = 0;
    for (const r of A) for (const v of r) total += v * v;
    for (let sweep = 0; sweep < 100; sweep++) {
      let off = 0;
      for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p][q] * A[p][q];
      if (off <= 1e-32 * total) break;
      for (let p = 0; p < n - 1; p++) {
        for (let q = p + 1; q < n; q++) {
          const apq = A[p][q];
          if (apq === 0) continue;
          const theta = (A[q][q] - A[p][p]) / (2 * apq);
          const t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
          const c = 1 / Math.sqrt(t * t + 1), s = t * c;
          for (let k = 0; k < n; k++) { // A·P
            const akp = A[k][p], akq = A[k][q];
            A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq;
          }
          for (let k = 0; k < n; k++) { // Pᵀ·(A·P)
            const apk = A[p][k], aqk = A[q][k];
            A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk;
          }
          for (let k = 0; k < n; k++) { // V·P
            const vkp = V[k][p], vkq = V[k][q];
            V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq;
          }
        }
      }
    }
    const idx = [...Array(n).keys()].sort((i, j) => A[i][i] - A[j][j]);
    return {
      values: idx.map((i) => A[i][i]),
      vectors: idx.map((i) => V.map((row) => row[i])),
    };
  }

  const LinAlg = {
    isNum, allFinite, zeros, identity, clone, dims, matMul, mulVec, transpose, add, sub, scale,
    dot, cross, norm, normalize, vsub, vadd, vscale, det, solve, inverse, maxAbs,
    rotX, rotY, rotZ, axisAngle, rotationAxisAngle, clamp, roundMat, isRotation, rigid4, translation4, mulPoint4, symEigen,
  };
  root.LinAlg = LinAlg;
  if (typeof module !== 'undefined' && module.exports) module.exports = LinAlg;
})(typeof globalThis !== 'undefined' ? globalThis : this);
