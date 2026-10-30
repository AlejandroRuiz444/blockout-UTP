# Uso de IA

Este archivo registra **lo que realmente se hizo** con IA en la preparación del código base. Cada integrante debe completar la sección 6 con su propio uso a partir de ahora, y los cambios generados por IA deben seguir el mismo proceso de PR y revisión humana que el resto (enunciado, §7).

## 1. Herramientas y agentes utilizados

| Herramienta | Uso |
|---|---|
| Claude Code (agente de programación de Anthropic, extensión de VS Code, modelo Claude Sonnet 5.5), en dos tramos de trabajo: la preparación inicial y, el 2026-10-23, la reorganización en capas, la ficha 7 simple, la nueva animación y los roles | Diseño, código, tests y documentación del repositorio, a partir del enunciado `proyecto_blockout.pdf`, de un prompt de especificación del equipo y de las indicaciones posteriores de un integrante |
| Chrome 155 headless controlado por un script de Node propio (protocolo CDP; el script está en el directorio temporal de la sesión, **no** forma parte del repositorio) | Cargar `app/index.html` y `app/tests/index.html` por `file://`, enviar teclas/ratón, leer el DOM, leer la consola y tomar capturas |

No se usaron otros modelos ni subagentes. La extensión «Claude in Chrome» no estaba conectada, por eso se usó el script CDP.

## 2. Tareas delegadas

Todo lo que hay en `app/`, `docs/`, `README.md` y este archivo lo escribió el agente en dos tramos de trabajo:

- Lectura del enunciado y del código original (`InitPolyCube.cpp`, `BlockOrientation.h`, `PolyCube.cpp`, `Game.cpp`) como referencia; selección de las 7 piezas y sus pivotes.
- Diseño de los tres módulos y de las interfaces; álgebra lineal propia; escena; cámara y proyección con recorte; experimento de homografía (derivación, DLT con normalización, ruido con semilla, paralaje, rotación pura); animación de victoria; modo demo; entrada, dibujo e interfaz.
- Tests ejecutables, scripts `trace.js` y `report.js`, y todos los documentos.

**Segundo tramo (2026-10-23), a petición de un integrante del equipo:**

- **Roles**: se asignaron Estudiante 1 → A (escena y geometría, y coordinación del seguimiento), Juan → B (cámara y proyección) y Yohan → C (interfaz y animación). *La correspondencia 1→A, 2→B, 3→C y la coordinación en el Estudiante 1 fueron una suposición del agente a partir del orden en que se nombró a las personas: el equipo debe confirmarla o cambiarla.* El Estudiante 1 es Alejandro (@AlejandroRuiz444); su nombre se completó en un commit posterior, tras la revisión de Yohan205 en el PR #20.
- **Ficha 7**: se sustituyó el pentacubo 3D (`PENT3D`) por el tricubo recto (`I3`, `allPolyCube[2]`, 3 orientaciones), con la demo y los tests ajustados.
- **Reorganización modular**: el código pasó de `app/js/` (archivos sueltos) a `app/src/{core,scene,projection,animation,ui}/`; `scene.js` se dividió en `pieces/mesh/container/scene`, `anim.js` en `easing/motion/victory`, y `main.js` en `controller` (estado sin DOM), `hud`, `homography_panel` y un `main.js` de solo cableado. Se añadió `docs/ARQUITECTURA.md`, `tests/manifest.js`, `tests/deps.js` y una prueba de arquitectura por capas.
- **Plan de integración y entorno (2026-10-24)**: a petición de un integrante, se preparó el plan para incorporar el código por etapas en 17 PR revisados entre los integrantes (`docs/PLAN_INTEGRACION.md`), un documento para que un agente configure el entorno de GitHub (tarea T0), plantillas de PR/tareas, un *workflow* de CI (Linux) y un simulador que reproduce el plan en un repositorio temporal y comprueba que cada *commit* y cada *merge* dejan los tests en verde. La suposición de roles (1→A, 2→B, 3→C) sigue pendiente de confirmación.
- **Animación**: victoria nueva de 8 s (vuelo en espiral → torre → giro → regreso, con interpolación geodésica de orientaciones); traslaciones y giros del usuario animados con `out_cubic`; aviso visible sobre la escena cuando una acción se rechaza.

**Lo que el agente NO hizo** (y no se debe fingir): `git init`, *commits*, ramas, PR, revisiones, nombres completos/fechas/enlaces reales, video, ni verificación en Linux. Los marcadores `[fecha]` y `[enlace]` están vacíos a propósito.

## 3. Cómo se verificó el código y las afirmaciones matemáticas

1. **Ejemplo dorado calculado a mano** antes de ejecutar nada (cámara az = −90°, el = 30°, d = 10, fov = 90°, 640×480; vértice local (1,0,1) de la pieza O4 con `Rz(90°)`, `t = (1,1,0)`): `C`, `R`, `t`, `K`, `M`, `X_w = (2,2,1)`, `X_c`, `(u,v)`. El resultado del código coincide: `(362.7348, 200.1278)`, `z_c = 11.2321`. Quedó como test.
2. **117 verificaciones en Node** (`node app/tests/run.js`: 117 correctos, 0 fallidos) y **110 en el navegador** (`app/tests/index.html` en Chrome headless: 110/110, sin mensajes de consola; las de arquitectura leen archivos y solo corren en Node). Cubren álgebra (`A·A⁻¹ = I`), rotaciones (`RᵀR = I`, `det = +1`), rigidez de piezas, que mover la cámara no cambia `get_geometry`, puntos en el plano de la cámara y detrás (sin NaN ni excepciones), recorte del segmento contra el plano cercano con valores calculados a mano, un barrido aleatorio con semilla fija de 300 cámaras × aristas, homografía (error < 1e-6 px en el plano; error de decenas/cientos de px fuera del plano; error ≈ 1e-13 px en rotación pura), crecimiento aproximadamente lineal del error con σ, victoria (torre centrada y sin solapes, giro, regreso simétrico en el tiempo, continuidad sin saltos) y demo deterministas con poses finales calculadas a mano, controlador (animaciones, avisos, victoria/demo, restauración), texto del HUD, y arquitectura por capas (cada módulo solo usa capas inferiores; la escena y la proyección no se conocen; solo `ui` toca el DOM; sin WebGL, CDN ni módulos ES).
3. **Verificación cruzada con el juego original**: el número de orientaciones de cada pieza bajo las 24 rotaciones de la retícula coincide con `BlockOrientation.h` (12, 12, 12, 3, 12, 8, 3 para L3, T4, S4, O4, tornillo, esquina 3D e I3), lo que valida la transcripción de los cubos y el grupo de rotaciones.
4. **Identidades matemáticas comprobadas numéricamente**: `H_i` = columnas 1, 2, 4 de `P_i` para `Z = 0` (diferencia 0); `H₂₁·x₁` = imagen en la vista 2 del punto donde el rayo de la vista 1 corta el plano (paralaje); la `H` de rotación pura coincide con la inducida por el plano; el DLT recupera una `H` conocida con 4 y 9 puntos, con y sin normalización.
5. **Ejecución real de la aplicación** en Chrome 155 headless sobre Windows 11 (`file://`): carga, selección/traslación/rotación de piezas (incluido el rechazo contra la pared), órbita con ratón, rueda, FOV, reset, victoria con la cámara moviéndose, demo completa (36 s) y panel de homografía en sus tres modos; repetido tras la reorganización en capas. Sin errores ni avisos de consola tras corregir el error 2 de abajo (el aviso del `favicon.ico` que aparecía al servir por `http://localhost` se eliminó con un icono vacío). Se revisaron capturas de pantalla de la victoria en sus cuatro fases.
6. **No verificado**: Linux, Firefox, Edge, Safari. Las tablas del informe se copiaron de la salida de `node app/tests/report.js`; no se editaron a mano.

## 4. Errores significativos encontrados y corregidos

| # | Error | Cómo se detectó | Corrección |
|---|---|---|---|
| 1 | El agente **dedujo mal** el número de aristas visibles de L3 (esperaba 12 vértices y 18 aristas; el código da 16 y 22 porque las aristas son unitarias: el perímetro de 8 aristas tiene 8 puntos por cara). El código era correcto; la expectativa del test estaba mal | test `geometría: aristas visibles…` | Se rehízo la deducción por perímetro (vértices = 2P, aristas = 2P + esquinas) y se fijaron 16/22 (L3), 16/20 (O4), 20/28 (T4); se añadió la comprobación de un cubo suelto (12 aristas) |
| 2 | Un `SyntaxError` en `main.js` (saltos de línea reales dentro de literales de cadena) causado por una edición automatizada; los tests de Node no cargan `main.js` | consola del navegador headless | Corregido; se añadió un test que **compila** todos los scripts, incluidos `render.js` y `main.js` |
| 3 | Los puntos de comprobación elegidos para el plano tenían ternas casi colineales (área mínima 0.04 en celdas²), contra el requisito de «posición general» | test `los 10 puntos están en posición general` | Se buscó otro conjunto; área mínima 0.170 y umbral del test > 0.1 |
| 4 | Secuencias de prueba de rigidez/rotación en la escena por defecto chocaban con las paredes, de modo que el test mezclaba rigidez con colisiones | test fallido (`rotación bloqueada: fuera del contenedor`) | Reescritos con escenas de una sola pieza en el centro; las colisiones tienen sus propios tests |
| 5 | Dos expectativas de test erróneas (`select_prev` tras 8 `select_next` no da `p7`; `Infinity` en `Demo.state_at` se trata como 0, no como fin) | tests fallidos | Corregidas las expectativas; el comportamiento documentado no cambió |
| 6 | Afirmaciones del informe sin comprobar: «cuatro órdenes de magnitud» entre el DLT sin y con normalización (son ~7: 2.25e-6 frente a 9.3e-14 px) y «10 ternas» de puntos (son 120) | revisión de las tablas contra la salida de `report.js` | Texto corregido en `INFORME.md` y en el código del informe |
| 7 | Un caso latente en `apply_action`: `'toString' in AXES` aceptaba nombres heredados del prototipo como eje | revisión del código (probado luego en `acciones: entradas inválidas…`) | Se usa `Object.prototype.hasOwnProperty` |
| 8 | El panel de homografía mostraba el piso muy pequeño (contenedor de 12 de alto recortado) | captura de pantalla | Cámaras del experimento más cercanas y contenedor bajo (5×5×3) solo en ese panel; las tablas se regeneraron |
| 9 | **Reporte de un integrante: «las flechas no funcionan».** Al comprobarlo con el navegador, sí funcionaban: la pieza 1 empieza pegada a la esquina del contenedor, así que `←` y `↓` se rechazaban, y el aviso quedaba al final del panel lateral, fuera de vista | prueba en Chrome headless (→ ↑ ← ↓ con la pieza L) | Aviso visible sobre la escena (2.5 s) y panel «Estado» al inicio del lateral; el controlador lo cubre con un test |
| 10 | Prueba del controlador con dos traslaciones seguidas en +X: la segunda choca con la pieza O4 y se rechazaba (error de la prueba, no del código) | test fallido `dos comandos seguidos…` | Se usa +X y luego +Y |
| 11 | El HUD mostraba `-0.000` para valores diminutos negativos durante la victoria | captura de pantalla | Los valores que redondean a cero se muestran como 0; test añadido |
| 12 | Un script de edición con una expresión regular perdió una barra invertida al pasar por el shell y `deps.js` no compilaba | error de sintaxis al ejecutarlo | Archivo reescrito con la herramienta de archivos; los scripts con expresiones regulares ya no se generan por el shell |

## 5. Limitaciones de esta verificación

- Todo lo anterior lo ejecutó el mismo agente que escribió el código; **ninguna persona ha revisado todavía** este trabajo. La revisión por pares es obligatoria antes de integrarlo.
- La corrección geométrica se apoya en el ejemplo dorado calculado a mano, en identidades verificadas numéricamente y en tests; no hay una verificación independiente contra otra implementación (p. ej. OpenCV).
- La interacción con el ratón y los eventos de teclado se probaron con eventos sintéticos de CDP, no con un usuario.
- La reorganización en capas se verificó con los 117 tests y una regresión completa en Chrome, pero nadie del equipo la ha revisado ni ejecutado todavía fuera de esta sesión.
- La estética y la fluidez de la animación (tiempos, arcos, giro) se juzgaron con capturas de cuatro instantes, no a 60 fps con una persona mirando; los tiempos son constantes ajustables en `victory.js`.

## 6. Registro de uso de IA del equipo (completar)

| Fecha | Integrante | Herramienta | Tarea delegada | Cómo se verificó | Errores hallados |
|---|---|---|---|---|---|
| `[fecha]` | Estudiante 1 / Juan / Yohan | | | | |
