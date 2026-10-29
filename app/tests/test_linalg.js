/* Verificaciones de álgebra lineal (linalg.js). */
(function () {
  const { test, assert, approx, approxMat } = Harness;
  const LA = LinAlg;

  const A3 = [[2, -1, 0.5], [1, 3, -2], [0, 4, 1]];
  const A4 = [[4, 1, 0, 2], [1, 5, -1, 0], [0, -1, 3, 1], [2, 0, 1, 6]];

  test('álgebra: multiplicación 2×3 · 3×2 contra valores calculados a mano', () => {
    const C = LA.matMul([[1, 2, 3], [4, 5, 6]], [[7, 8], [9, 10], [11, 12]]);
    approxMat(C, [[58, 64], [139, 154]], 0);
  });

  test('álgebra: dimensiones incompatibles lanzan RangeError (error de programación documentado)', () => {
    let threw = false;
    try { LA.matMul([[1, 2]], [[1, 2]]); } catch (e) { threw = e instanceof RangeError; }
    assert(threw, 'matMul debería lanzar RangeError');
  });

  test('álgebra: transpuesta y (A·B)ᵀ = Bᵀ·Aᵀ', () => {
    approxMat(LA.transpose([[1, 2, 3], [4, 5, 6]]), [[1, 4], [2, 5], [3, 6]], 0);
    const B = [[1, 0, 2], [-1, 3, 1], [4, 1, 0]];
    approxMat(LA.transpose(LA.matMul(A3, B)), LA.matMul(LA.transpose(B), LA.transpose(A3)), 1e-12);
  });

  test('álgebra: A·A⁻¹ = I (Mat3 y Mat4)', () => {
    approxMat(LA.matMul(A3, LA.inverse(A3)), LA.identity(3), 1e-12, 'Mat3');
    approxMat(LA.matMul(LA.inverse(A4), A4), LA.identity(4), 1e-12, 'Mat4');
  });

  test('álgebra: determinante conocido y matriz singular -> inverse devuelve null', () => {
    approx(LA.det([[1, 2], [3, 4]]), -2, 1e-12);
    approx(LA.det(LA.identity(4)), 1, 1e-12);
    assert(LA.inverse([[1, 2], [2, 4]]) === null, 'singular debe dar null');
    assert(LA.inverse([[1, NaN], [0, 1]]) === null, 'NaN debe dar null');
  });

  test('álgebra: solve A·x = b', () => {
    const x = LA.solve(A3, [1, 2, 3]);
    const b = LA.mulVec(A3, x);
    approx(b[0], 1, 1e-12); approx(b[1], 2, 1e-12); approx(b[2], 3, 1e-12);
    assert(LA.solve([[1, 1], [1, 1]], [1, 2]) === null, 'sistema singular -> null');
  });

  test('álgebra: producto vectorial y normalización', () => {
    assert(LA.cross([1, 0, 0], [0, 1, 0]).join() === '0,0,1', 'x × y = z');
    approx(LA.norm(LA.normalize([3, 4, 0])), 1, 1e-15);
    assert(LA.normalize([0, 0, 0]) === null, 'vector nulo -> null');
  });

  test('rotaciones: RᵀR = I y det R = +1 (rotX, rotY, rotZ, eje arbitrario)', () => {
    const angles = [0, 0.3, Math.PI / 2, 2.1, -1.7, Math.PI];
    for (const a of angles) {
      const Rs = [LA.rotX(a), LA.rotY(a), LA.rotZ(a), LA.axisAngle([1, 2, -3], a)];
      for (const R of Rs) {
        approxMat(LA.matMul(LA.transpose(R), R), LA.identity(3), 1e-12, 'RᵀR');
        approx(LA.det(R), 1, 1e-12, 'det');
        assert(LA.isRotation(R, 1e-12), 'isRotation');
      }
    }
  });

  test('rotaciones: axisAngle con eje z coincide con rotZ; rotZ(90°) manda x a y', () => {
    approxMat(LA.axisAngle([0, 0, 5], 0.8), LA.rotZ(0.8), 1e-12);
    const v = LA.mulVec(LA.rotZ(Math.PI / 2), [1, 0, 0]);
    approx(v[0], 0, 1e-12); approx(v[1], 1, 1e-12); approx(v[2], 0, 1e-12);
  });

  test('rotaciones: isRotation rechaza reflexiones, escalas y NaN', () => {
    assert(!LA.isRotation([[1, 0, 0], [0, 1, 0], [0, 0, -1]]), 'reflexión det = −1');
    assert(!LA.isRotation([[2, 0, 0], [0, 2, 0], [0, 0, 2]]), 'escala');
    assert(!LA.isRotation([[NaN, 0, 0], [0, 1, 0], [0, 0, 1]]), 'NaN');
    assert(!LA.isRotation([[1, 0], [0, 1]]), 'tamaño');
  });

  test('álgebra: roundMat deja enteros exactos y sin -0', () => {
    const R = LA.roundMat(LA.rotZ(Math.PI / 2));
    assert(JSON.stringify(R) === '[[0,-1,0],[1,0,0],[0,0,1]]', JSON.stringify(R));
  });

  test('rotaciones: rotationAxisAngle es la inversa de axisAngle (incluidos 0°, 90° y 180°) y rechaza lo que no es rotación', () => {
    const cases = [[[1, 2, -3], 0.7], [[0, 0, 1], Math.PI], [[0, 1, 0], Math.PI], [[1, 1, 0], Math.PI], [[1, 0, 0], Math.PI / 2], [[0, 0, 1], 0], [[1, -1, 2], 3.0], [[0, 1, 1], 1e-7]];
    for (const [axis, a] of cases) {
      const R = LA.axisAngle(axis, a), r = LA.rotationAxisAngle(R);
      approxMat(LA.axisAngle(r.axis, r.angle), R, 1e-9, 'eje ' + axis + ' ángulo ' + a);
      approx(r.angle, a, 1e-6, 'ángulo recuperado');
    }
    assert(LA.rotationAxisAngle([[2, 0, 0], [0, 1, 0], [0, 0, 1]]) === null, 'no es rotación');
    approx(LA.clamp(5, 0, 1), 1, 0); approx(LA.clamp(-5, 0, 1), 0, 0);
  });

  test('álgebra: symEigen (Jacobi) cumple S·v = λ·v y ordena ascendente', () => {
    const S = [[4, 1, 0], [1, 3, 1], [0, 1, 2]];
    const e = LA.symEigen(S);
    for (let k = 0; k < 3; k++) {
      const Sv = LA.mulVec(S, e.vectors[k]);
      for (let i = 0; i < 3; i++) approx(Sv[i], e.values[k] * e.vectors[k][i], 1e-12);
      approx(LA.norm(e.vectors[k]), 1, 1e-12);
    }
    assert(e.values[0] <= e.values[1] && e.values[1] <= e.values[2], 'orden ascendente');
  });
})();
