# Guía para la sustentación en vivo y el video

Cada integrante debe poder (1) explicar su módulo, (2) **seguir un punto desde las coordenadas del objeto hasta la pantalla** y (3) describir un problema de integración que el equipo haya resuelto. Esta guía contiene el material para los tres puntos. Roles: Estudiante 1 (A), Juan (B), Yohan (C); ver [ARQUITECTURA.md](ARQUITECTURA.md).

## 1. Qué explica cada rol

| Rol | Archivos | Debe poder explicar (y modificar en vivo) |
|---|---|---|
| **A: escena y geometría** — Estudiante 1 | `src/scene/` (`pieces`, `mesh`, `container`, `scene`) y `src/animation/` (`easing`, `motion`, `victory`) | Qué es una pose (`R`, `t`) y por qué `M = T(p+t)·R·T(−p)`; el pivote (centro de un cubo ocupado: coordenadas semienteras ⇒ los giros de 90° caen en la retícula); `rotate` = `round(Rot·R)`; por qué `apply_action` es inmutable; qué rechaza (`fuera del contenedor`, `colisiona`); cómo salen las aristas visibles (regla de las 4 celdas alrededor de cada arista). *Cambio sugerido para probar:* añadir una pieza nueva en `RAW` de `pieces.js` (p. ej. el cubo suelto) y verla en el contenedor. |
| **B: cámara y proyección** — Juan | `src/projection/` (`camera`, `projection`, `homography`) y `src/core/linalg.js` | Construcción de `R, t, K` (look-at propio), por qué `fy > 0`, perspectiva `(u,v) = (p₁/λ, p₂/λ)`, recorte contra `z_c ≥ near` antes de dividir, Liang–Barsky; derivación `H = K[r₁ r₂ t]`, DLT con normalización, por qué falla fuera del plano. *Cambio sugerido:* cambiar `near` o el FOV por defecto, o la altura `Z` del experimento. |
| **C: interfaz y animación** — Yohan | `src/animation/demo.js` y `src/ui/` (`input`, `controller`, `hud`, `render`, `homography_panel`, `main`) | El flujo por fotograma, la victoria como `set_pose` (nunca coordenadas de pantalla), por qué la demo es una función pura del tiempo (determinismo), cómo siguen activos los controles de cámara. *Cambio sugerido:* cambiar la duración o la dispersión de la victoria (`EXPLODE`, `LIFT`) o una tecla en `input.js`. |

Todos deben entender la cadena completa: el enunciado dice que los roles marcan responsabilidades, no exclusividad del conocimiento.

## 2. Traza numérica completa de un vértice

Salida **real** de `node app/tests/trace.js` (escena por defecto; se selecciona el tornillo `p5`, se rota 90° alrededor de X y se traslada (0,0,+1); cámara por defecto, viewport 960×640):

```
Pieza: Tornillo (3D) (p5), acciones: rotate x +90°, translate (0,0,+1) desde la escena por defecto
Pivote local p = (1.5, 0.5, 1.5)
R =
  [ 1  0  0 ]
  [ 0  0 -1 ]
  [ 0  1  0 ]
t = (3, 3, 3)

M = T(p + t) · [R 0; 0 1] · T(−p)   (4×4, local -> mundo)
  [ 1.000  0.000  0.000  3.000 ]
  [ 0.000  0.000 -1.000  5.000 ]
  [ 0.000  1.000  0.000  4.000 ]
  [ 0.000  0.000  0.000  1.000 ]

PASO 1  vértice en coordenadas del OBJETO:   X_l = (2, 1, 2)
PASO 2  M·[X_l 1]ᵀ  -> MUNDO:               X_w = (5.0000, 3.0000, 5.0000)   w = 1
        (comprobación con la geometría que entrega la escena: (5.0000, 3.0000, 5.0000))

Cámara por defecto: acimut -50.0°, elevación 25.0°, distancia 24, objetivo (2.5, 2.5, 6), FOV vertical 45.0°, viewport 960×640, near 0.1
Centro de cámara C = (16.4815, -14.1625, 16.1428)
R (mundo -> cámara) =
  [   0.76604    0.64279    0.00000 ]
  [   0.27165   -0.32374   -0.90631 ]
  [  -0.58256    0.69427   -0.42262 ]
t = −R·C = (-3.5221, 5.5681, 26.2564)
K =
  [   772.548      0.000    480.000 ]
  [     0.000    772.548    320.000 ]
  [     0.000      0.000      1.000 ]

PASO 3  [R|t]·[X_w 1]ᵀ -> CÁMARA:            X_c = (2.2365, 1.4236, 23.3133)   (z_c = 23.3133 > near)
PASO 4  K·X_c:                               (12918.214, 8560.047, 23.313)   λ = 23.3133
PASO 5  división en perspectiva (÷ λ):       (u, v) = (554.112, 367.174) px
Comprobación con P = K[R|t] (3×4):           P·[X_w 1]ᵀ = (12918.214, 8560.047, 23.313) -> (u, v) = (554.112, 367.174)
Comprobación con project_point():            (u, v) = (554.112, 367.174)
```

Cómo contarlo en voz alta: «el vértice `(2,1,2)` del tornillo está en su sistema local; `M` lo gira alrededor del pivote `(1.5,0.5,1.5)` y lo traslada: queda en `(5,3,5)` del mundo. `[R|t]` lo expresa respecto de la cámara: está 23.3 unidades delante (`z_c`), 2.2 a la derecha y 1.4 hacia abajo. `K` multiplica por la focal (772.5 px) y suma el punto principal (480, 320); al dividir por `λ = z_c` sale el píxel `(554.1, 367.2)`.» La HUD de la app (panel «Cadena de proyección») muestra en vivo `K`, `[R|t]` y la `M` de la pieza activa.

Un segundo cálculo, **a mano**, está en [INTERFACES.md §9](INTERFACES.md) (ejemplo dorado: `(u,v) = (362.734849, 200.127843)`); los tests lo comprueban.

## 3. Guion del video

El video debe mostrar **todas** las funcionalidades, la ejecución en **Linux** y a **todos** los integrantes visibles e identificados, cada uno explicando su contribución. Publicarlo en YouTube desde la cuenta institucional UTP con visualización restringida a cuentas UTP, y verificar el acceso del docente antes de entregar. *(Pendiente: lo graba y publica el equipo; aquí solo hay un guion.)*

| Tiempo orientativo | Qué mostrar | Quién |
|---|---|---|
| 0:00–0:30 | Presentación: nombres, roles, sistema operativo **Linux** y navegador usado; abrir `app/index.html` con doble clic (sin servidor) | todos |
| 0:30–1:30 | **Escena principal**: contenedor 5×5×12 con rejilla, 7 piezas, panel de controles, pieza activa y estado. Seleccionar piezas (1–7, Tab) | Estudiante 1 |
| 1:30–3:00 | **Piezas**: trasladar (←→↑↓, PgUp/PgDn) y rotar ±90° en X, Y, Z (Q/A, W/S, E/D) con una pieza plana y dos no planas (tornillo y esquina 3D). Mostrar el rechazo al chocar con la pared. Señalar `R` y `t` en el panel | Estudiante 1 |
| 3:00–4:30 | **Cámara móvil**: órbita (arrastrar), distancia (rueda), FOV (`[` `]`), reset (`R`). Mostrar que las coordenadas de las piezas no cambian (`t` de la pieza activa) y cómo cambian `K` y `[R|t]`. Acercar la cámara hasta entrar al contenedor para enseñar el recorte contra el plano cercano (contador «recortadas contra el plano cercano») | Juan |
| 4:30–5:30 | **Animación de victoria** (`V`) moviendo la cámara mientras corre | Yohan |
| 5:30–6:30 | **Modo demostración** (`M`, 36 s, determinista): se ve la escena, transformaciones, cámara y victoria en orden; repetirlo para mostrar que es idéntico | Yohan |
| 6:30–8:30 | **Homografía** (`H`): plano `Z = 0`, `H = K[r₁ r₂ t]`, errores ≈ 1e-13 px, DLT con σ (deslizador), fallo fuera del plano con segmentos rojos y caso de rotación pura | Juan |
| 8:30–9:30 | **Traza de un punto** del objeto a la pantalla (sección 2) y **problema de integración resuelto** (sección 4) | todos |
| 9:30–10:00 | Tests: `node app/tests/run.js` (o `app/tests/index.html`), mostrando la salida | todos |

Línea de tiempo de la demo (para sincronizar lo que se dice): 0–3 s escena; 3–15.8 s transformaciones (L: +XY, +Z; tornillo: rot X y Z; esquina 3D: rot Y y +XY; tricubo recto: rot Z y Y); 15.8–28 s cámara (órbita 360°, zoom, FOV); 28–36 s victoria (vuelo en espiral → torre → giro → regreso).

## 4. Problema de integración resuelto (elegir uno **que el equipo haya vivido**)

El enunciado pide describir un problema de integración que el equipo resolvió. **No lo inventen**: usen uno real de su proceso. Estas son decisiones de interfaz que sí exigieron acuerdo entre módulos en esta base de código y que pueden servir de punto de partida si coinciden con lo que les pasó:

1. **Dirección de los ejes y signo de `fy`**: el módulo de cámara usa `y_c` hacia abajo (como `v`), por lo que `fy > 0`; si la escena hubiera usado `Z` hacia abajo o `v` hacia arriba, la imagen saldría invertida.
2. **Unidades de ángulo**: radianes en toda la API, grados solo en la interfaz.
3. **Cómo entra la animación en la escena**: por la acción `set_pose` (que exige `R` ortonormal con `det = +1`), no tocando coordenadas de pantalla.
4. **Pivote y retícula**: un pivote cualquiera deja los giros de 90° fuera de la retícula; el pivote debe ser el centro de una celda.
5. **Qué módulo posee la cámara**: la proyección construye `K, R, t`, pero los parámetros de órbita los guarda la aplicación (tabla de propiedad del estado en INTERFACES.md §8).

Anoten aquí el problema real: `[descripción]`, `[PR/commit donde se resolvió]`.

## 5. Preguntas frecuentes de la sustentación

- *¿Por qué no es una homografía la proyección de la cámara?* `P` es 3×4: relaciona 3D con 2D. La homografía 3×3 relaciona dos imágenes de un plano.
- *¿Por qué `H` no sirve fuera del plano si cambia el centro?* Ver INFORME.md §2: predice la imagen del punto donde el rayo corta el plano.
- *¿Qué pasa si un vértice está detrás de la cámara?* Su `z_c < near`; la arista se recorta antes de dividir y solo se dibuja la parte delante del plano cercano.
- *¿Cómo garantizan la rigidez?* `R` ortonormal con `det = +1` (comprobado en `set_pose`); los giros de 90° se redondean a matrices enteras; hay tests de conservación de distancias.
- *¿Es determinista la demo?* Sí: `Demo.state_at(t, escena, cámara)` es una función pura; no usa `Math.random` ni el reloj salvo para elegir `t` (lo hace el `Controller`).
