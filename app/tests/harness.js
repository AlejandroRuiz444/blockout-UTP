/*
 * harness.js — runner mínimo de verificaciones (asserts planos, sin frameworks).
 * Se usa igual desde Node (run.js) y desde el navegador (tests/index.html).
 */
(function (root) {
  'use strict';
  const tests = [];

  function test(name, fn) { tests.push({ name, fn }); }

  function assert(cond, msg) { if (!cond) throw new Error(msg || 'assert falló'); }

  function approx(a, b, tol, msg) {
    tol = tol === undefined ? 1e-9 : tol;
    if (!(Math.abs(a - b) <= tol)) throw new Error((msg || 'approx') + ': esperado ' + b + ', obtenido ' + a + ' (tol ' + tol + ')');
  }

  function approxMat(A, B, tol, msg) {
    if (A.length !== B.length) throw new Error((msg || 'approxMat') + ': tamaños distintos');
    for (let i = 0; i < A.length; i++) {
      if (Array.isArray(A[i])) approxMat(A[i], B[i], tol, msg);
      else approx(A[i], B[i], tol, (msg || 'approxMat') + ' [' + i + ']');
    }
  }

  function deepEqual(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  /** Ejecuta todo y devuelve { passed, failed, lines }. */
  function run() {
    let passed = 0, failed = 0;
    const lines = [];
    for (const t of tests) {
      try { t.fn(); passed++; lines.push('  ok   ' + t.name); }
      catch (e) { failed++; lines.push('  FAIL ' + t.name + '\n         ' + (e && e.message ? e.message : e)); }
    }
    lines.push('');
    lines.push('Resultado: ' + passed + ' correctos, ' + failed + ' fallidos, ' + tests.length + ' en total');
    return { passed, failed, lines };
  }

  const Harness = { test, assert, approx, approxMat, deepEqual, run };
  root.Harness = Harness;
  if (typeof module !== 'undefined' && module.exports) module.exports = Harness;
})(typeof globalThis !== 'undefined' ? globalThis : this);
