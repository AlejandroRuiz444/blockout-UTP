# Blockout desde una cámara móvil

Visualización 3D interactiva inspirada en [BlockOut](https://codeberg.org/shuang886/BlockOut) para la actividad **«Blockout desde una cámara móvil»** (Visión por Computador, Universidad Tecnológica de Pereira, 2026-II). La escena vive en coordenadas 3D del mundo en memoria y se proyecta a una pantalla 2D con una cadena de proyección **implementada explícitamente por el equipo** (matrices `M`, `[R|t]`, `K`, recorte contra el plano cercano y división en perspectiva). No se usa WebGL, three.js, transformaciones 3D de CSS ni la cámara de ningún motor gráfico.

Equipo y roles (ver [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)): **Alejandro (Estudiante 1, @AlejandroRuiz444)**, rol A, escena y geometría, y coordinación del seguimiento · **Juan**, rol B, cámara y proyección · **Yohan**, rol C, interfaz y animación.

## Instalación y dependencias

**Ninguna.** HTML + JavaScript + Canvas 2D, scripts clásicos, todos los recursos locales (sin servidor, sin npm, sin CDN, sin módulos ES).
Node.js solo se usa, opcionalmente, para ejecutar los tests desde la terminal.

## Ejecutar

Abrir **`app/index.html`** con doble clic (o arrastrarlo al navegador; funciona con `file://`).

En Linux: `xdg-open app/index.html` o `firefox app/index.html` / `chromium app/index.html`.

## Controles

| Acción | Tecla / ratón |
|---|---|
| Seleccionar pieza | `1`–`7` · `Tab` / `Shift+Tab` · botones del panel |
| Trasladar la pieza activa en X / Y / Z | `←` `→` / `↓` `↑` / `PgDn` `PgUp` (o `Shift+↓` `Shift+↑`) |
| Rotar ±90° alrededor de X / Y / Z (ejes del mundo por el pivote) | `Q` `A` / `W` `S` / `E` `D` |
| Orbitar la cámara (acimut / elevación) | arrastrar con el ratón · `J` `L` / `I` `K` |
| Distancia de la cámara | rueda del ratón · `-` `=` |
| Campo de visión (distancia focal) | `[` `]` |
| Reiniciar la vista | `R` |
| Animación de victoria | `V` |
| Modo demostración (36 s, determinista) | `M` (otra vez `M` o `Esc` lo detiene) |
| Experimento de homografía | `H` (cerrar con `H` o `Esc`) |
| Detener animación / cerrar panel | `Esc` |

Las piezas no se pueden mover durante la victoria ni la demo; la cámara sí. Los pasos de pieza son sobre la retícula entera: una acción que sacaría la pieza del contenedor o la haría chocar con otra se rechaza y el panel «Estado» lo indica.

Piezas (tomadas de `InitPolyCube.cpp` del BlockOut original, que no se incluye en este repositorio): tricubo L, tetracubos T, S y cuadrado y el **tricubo recto (I3, la más simple)**, todas planas, más **tornillo y esquina 3D (no planas)**. El pivote de rotación de cada una está documentado en [docs/INTERFACES.md](docs/INTERFACES.md).

## Tests

```
node app/tests/run.js          # desde la terminal (probado con Node 20.19.0 en Windows 11, 20.20.2 en Ubuntu 24.04 vía GitHub Actions y 18.19.1 en Ubuntu 24.04.3 sobre WSL2; no se probaron otras versiones)
```

o abrir `app/tests/index.html` en el navegador (ejecuta las mismas verificaciones salvo las de arquitectura, que leen archivos). Cubren: álgebra (`A·A⁻¹ = I`, transpuesta), rotaciones (`RᵀR = I`, `det = +1`), rigidez de las piezas, ejemplo dorado compartido, que mover la cámara no altera `get_geometry`, puntos en/ tras el plano de la cámara, recorte contra el plano cercano, NaN/Infinity, homografía (error < 1e-6 px en el plano y claramente > 0 fuera de él), animación de victoria (torre, giro y regreso, continuidad), determinismo de la demo, controlador, HUD y reglas de arquitectura por capas.

Scripts auxiliares: `node app/tests/trace.js` (traza numérica de un vértice), `node app/tests/report.js` (tablas del experimento de homografía) y `node app/tests/deps.js` (grafo real de dependencias entre módulos).

## Estructura

```
blockout-UTP/
├─ README.md · AI_USAGE.md
├─ docs/   ARQUITECTURA · INTERFACES · INFORME · GUIA_DEMO · PLAN_TRABAJO · PLAN_INTEGRACION · GIT_WORKFLOW
├─ .github/   plantillas de PR y de tareas, y CI (GitHub Actions en Linux: tests de Node y del navegador)
└─ app/
   ├─ index.html · css/style.css
   ├─ src/
   │  ├─ core/        linalg.js                                  álgebra lineal propia
   │  ├─ scene/       pieces · mesh · container · scene          MÓDULO ESCENA      (rol A)
   │  ├─ projection/  camera · projection · homography           MÓDULO PROYECCIÓN  (rol B)
   │  ├─ animation/   easing · motion · victory · demo           MÓDULO APLICACIÓN  (rol C)
   │  └─ ui/          input · render · hud · controller · homography_panel · main     (rol C)
   └─ tests/          verificaciones (run.js, index.html, test_*.js) y scripts trace.js · report.js · deps.js
```

Capas (las dependencias solo bajan): `core` ← `scene` y `projection` (no se conocen entre sí) ← `animation` ← `ui`. Detalle, reglas y cómo extender: [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

## Documentación

- [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md): capas, roles del equipo, reglas, grafo de dependencias, cómo extender.
- [docs/PLAN_INTEGRACION.md](docs/PLAN_INTEGRACION.md): cómo entra el código al repositorio (PR por etapas, autores, revisores y dependencias).
- [docs/INTERFACES.md](docs/INTERFACES.md): coordenadas, estructuras, contratos de cada función, errores, propiedad del estado, ejemplo dorado.
- [docs/INFORME.md](docs/INFORME.md): cadena de proyección, derivación de la homografía, resultados numéricos, limitaciones.
- [docs/GUIA_DEMO.md](docs/GUIA_DEMO.md): sustentación, traza de un vértice y guion del video.
- [docs/PLAN_TRABAJO.md](docs/PLAN_TRABAJO.md): tareas con sus PR, hitos con fecha real, tablero y registro de seguimiento.
- [docs/CONTRIBUCIONES.md](docs/CONTRIBUCIONES.md): declaración de contribuciones con enlaces a PR, *commits* y revisiones (borrador: cada integrante verifica su sección).
- [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md), [AI_USAGE.md](AI_USAGE.md).

## Estado de verificación

| Plataforma | Estado |
|---|---|
| Node 20.19.0 (Windows 11) | **Probado**: `node app/tests/run.js` → 118 correctos, 0 fallidos (sobre `main` tras integrar el PR-16, `a30fcc8`) |
| Chrome 156 (headless, Windows 11, `file://`) | **Probado**: `app/tests/index.html` → «TODO CORRECTO: 111 verificaciones» y `app/index.html` abre y dibuja la escena sin mensajes de consola (sin interacción) |
| Ubuntu 24.04 en GitHub Actions: Node 20.20.2 y Chrome headless | **Probado en el CI**, en cada PR y en cada push a `main`: tests de Node (118/118), tests del navegador (111/111) y la aplicación abre sin mensajes de consola. El log no registra la versión de Chrome de esa imagen |
| Interacción (teclado, ratón, victoria, demo, panel de homografía) | **Probada a mano por los revisores del PR-14 ([#34](https://github.com/AlejandroRuiz444/blockout-UTP/pull/34))**: Juan en Opera GX (sin errores en la consola, según su reseña) y Yohan en el navegador integrado de VS Code (según la descripción del PR); ambos con `file://`. Versiones y sistemas operativos de esos navegadores: no registrados. Con eventos sintéticos de Chrome 155, antes de subir el código, se probó lo mismo (ver [AI_USAGE.md](AI_USAGE.md) §3) |
| Ubuntu 24.04.3 LTS en WSL2 (Windows 11, kernel 6.6.87.2-microsoft-standard-WSL2): Node 18.19.1 | **Probado** sobre `e402e1f` (repositorio clonado dentro de Ubuntu): `node app/tests/run.js` → 118 correctos, 0 fallidos. Pasan también con Node 18 (el de `apt` en Ubuntu 24.04), no solo con Node 20. Es Linux dentro de Windows (WSL2), no una instalación nativa en un equipo |
| Ubuntu 24.04.3 en WSL2 (ventanas por WSLg): Firefox 159.0 y Chromium 156.0.8078.47 (ambos `snap`), con `file://` | **Probado**: `app/tests/index.html` → «TODO CORRECTO: 111 verificaciones» en los dos (en modo headless) y `app/index.html` dibuja la escena y el panel en los dos (capturas). En Chromium headless no apareció ningún mensaje de consola al cargar la app ni los tests; la consola de Firefox no se revisó |
| Interacción en Linux (Firefox y Chromium: teclado, ratón, victoria, demo, panel de homografía, choque con la pared) | **Sin detalle.** Alejandro abrió la app en ambos navegadores y comunicó que funciona, pero no registró qué teclas ni qué acciones probó en cada uno, ni revisó la consola (F12) a mano; por eso solo consta como «funciona, sin detalle» y lo demás como **no probado** |
| Edge, Safari; Firefox en Windows o macOS | No probados |

## Limitaciones conocidas

- Solo aristas (alambre): sin caras rellenas ni eliminación de líneas ocultas.
- Sin caída automática, líneas completas, puntuación ni sonido (opcionales). La colisión es solo la mínima para las acciones del usuario; las rotaciones bloqueadas se rechazan (no hay «wall kick»).
- Cámara pinhole ideal (sin distorsión de lente).
- `Homography.dlt` no comprueba que los puntos estén en posición general: con puntos colineales devuelve `ok: true` sin avisar (comprobado con 6 puntos sobre una recta). El panel y los tests usan un conjunto fijo cuyo menor triángulo tiene área > 0.1, así que no se ven afectados.
- La demo y la victoria reutilizan la escena actual/por defecto; la demo restaura al terminar la escena y la cámara previas.
- Ver también [docs/INFORME.md §4](docs/INFORME.md).

El juego original (C++, SDL 1.2 y OpenGL de pila fija) no se incluye en este repositorio: solo se tomó como referencia para las piezas y sus orientaciones, y no se reutiliza su cámara.
