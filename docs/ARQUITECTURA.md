# Arquitectura y roles

Documento de referencia del equipo. Define **cómo está organizado el código**, **quién es dueño de qué** y **qué reglas no se rompen**. Los contratos de cada función están en [INTERFACES.md](INTERFACES.md); aquí está el panorama.

## 1. Equipo y roles

Los tres roles son los del enunciado (A: escena y geometría · B: cámara y proyección · C: interfaz y animación). Asignación acordada:

| # | Integrante | Rol | Carpetas propias | Entrega a los demás | Recibe de los demás |
|---|---|---|---|---|---|
| 1 | Estudiante 1: Alejandro (@AlejandroRuiz444) | **A: escena y geometría** — y coordinación del seguimiento (plan, cronograma, tablero) y configuración del entorno (T0) | `app/src/scene/` y `app/src/animation/{easing,motion,victory}.js` | **`Geometry3D`** (vértices y aristas en coordenadas del mundo) y la API `create_scene / apply_action` | acciones (`select`, `translate`, `rotate`, `set_pose`) que llegan de C |
| 2 | Juan | **B: cámara y proyección** | `app/src/projection/` y, junto con los demás, `app/src/core/` | **`Camera`** (`K, R, t, P`) y **`DrawPrimitives2D`** (líneas 2D ya recortadas), y el experimento de homografía | `Geometry3D` de A; parámetros de órbita/FOV de C |
| 3 | Yohan | **C: interfaz y animación** | `app/src/animation/demo.js`, `app/src/ui/`, `app/index.html`, `app/css/` | pantalla, entrada, victoria, demo | `Geometry3D` (A) y `DrawPrimitives2D` (B) |

- **Rotación de revisión** (enunciado): Estudiante 1 revisa a Juan, Juan revisa a Yohan, Yohan revisa a Estudiante 1.
- **`core/`** (álgebra compartida) la mantiene B, pero **cualquier cambio exige la aprobación de los tres** porque lo usan todos.
- **Tests**: cada integrante es dueño de los tests de su carpeta (§7). Los de arquitectura son de todos.
- **Coordinación**: Estudiante 1 mantiene `docs/PLAN_TRABAJO.md` (cambiable por acuerdo del equipo; el enunciado pide designar a una persona).
- **Carga de trabajo**: para equilibrarla, A es dueño de `animation/easing.js`, `motion.js` y `victory.js` (solo consumen y producen poses de la escena); C conserva `demo.js` y toda la interfaz. El enunciado permite que un rol abarque varios submódulos y exige que **todos** entiendan la cadena completa.

Lo que cada persona debe poder explicar y modificar en vivo está en [GUIA_DEMO.md §1](GUIA_DEMO.md).

## 2. Vista general

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ui/  (C)      main ─► controller ─► hud / render / homography_panel     input            │  capa 3
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ animation/ (A+C) demo ─► victory ─► motion ─► easing                                     │  capa 2
├─────────────────────────────────────────┬────────────────────────────────────────────────┤
│ scene/  (A)  MÓDULO ESCENA              │ projection/  (B)  MÓDULO PROYECCIÓN            │  capa 1
│ pieces · mesh · container · scene       │ camera · projection · homography               │
│ create_scene / apply_action /           │ build_camera / project /                       │
│ get_geometry                            │ experimento de homografía                      │
├─────────────────────────────────────────┴────────────────────────────────────────────────┤
│ core/  álgebra lineal propia (linalg.js)                                                 │  capa 0
└──────────────────────────────────────────────────────────────────────────────────────────┘
        Las dependencias solo bajan.  scene ⟂ projection: no se conocen entre sí.
```

Flujo de datos de **cada fotograma** (la misma cadena para la escena normal, la victoria y la demo):

```
 teclado / ratón ──► Input.map_key ──► comando ──► Controller.dispatch
                                                         │
                                     Controller.tick(now)│  ── escena de VISUALIZACIÓN (poses 3D, set_pose)
                                                         ▼
   Scene.get_geometry(scene)           ──►  Geometry3D            (MUNDO; aquí se aplica M)       [A]
   Camera.build_camera(params)         ──►  Camera {K, R, t, P}                                   [B]
   Projection.project(geom, cam, vp)   ──►  DrawPrimitives2D     (recorte z_c ≥ near + perspectiva) [B]
   Render.draw_scene / Hud.render      ──►  canvas + panel lateral                                [C]
```

## 3. Estructura de carpetas

```
Blockout/
├─ README.md · AI_USAGE.md · proyecto_blockout.pdf
├─ docs/            ARQUITECTURA · INTERFACES · INFORME · GUIA_DEMO · PLAN_TRABAJO · GIT_WORKFLOW
├─ BlockOut/ ImageLib/                 juego original (solo referencia, NO se modifica)
└─ app/
   ├─ index.html · css/style.css
   ├─ src/
   │  ├─ core/        linalg.js                              álgebra lineal (Mat3/Mat4/Vec, inversa, Jacobi, rotaciones)
   │  ├─ scene/       pieces.js  mesh.js  container.js  scene.js          ← A
   │  ├─ projection/  camera.js  projection.js  homography.js             ← B
   │  ├─ animation/   easing.js  motion.js  victory.js  demo.js           ← A (easing, motion, victory) · C (demo)
   │  └─ ui/          input.js  render.js  hud.js  controller.js  homography_panel.js  main.js   ← C
   └─ tests/          harness · manifest · run.js · index.html · test_*.js · trace.js · report.js · deps.js
```

Cada archivo tiene **una responsabilidad** y exporta **un namespace**:

| Archivo | Namespace | Responsabilidad |
|---|---|---|
| `core/linalg.js` | `LinAlg` | matrices y vectores, `inverse`, `solve`, `det`, rotaciones (`axisAngle`, `rotationAxisAngle`), Jacobi |
| `scene/pieces.js` | `Pieces` | catálogo de las 7 piezas (datos del juego original) y su pivote |
| `scene/mesh.js` | `Mesh` | aristas visibles de un policubo; malla de alambre |
| `scene/container.js` | `Container` | marco, rejilla y ejes del mundo |
| `scene/scene.js` | `Scene` | **estado** de la escena y su API pública (`create_scene`, `apply_action`, `get_geometry`) |
| `projection/camera.js` | `Camera` | `K, R, t, P` desde la órbita (look-at propio) |
| `projection/projection.js` | `Projection` | recorte contra el plano cercano y el viewport + perspectiva |
| `projection/homography.js` | `Homography` | `H = K[r₁ r₂ t]`, DLT, ruido, paralaje, rotación pura |
| `animation/easing.js` | `Easing` | curvas de suavizado |
| `animation/motion.js` | `Motion` | interpolación de poses con matrices de rotación reales (`set_pose`) |
| `animation/victory.js` | `Victory` | animación de victoria (torre) como función pura del tiempo |
| `animation/demo.js` | `Demo` | guion determinista de la demostración |
| `ui/input.js` | `Input` | tecla/ratón → comando (función pura) |
| `ui/controller.js` | `Controller` | **estado de la aplicación** (modo, animaciones, cámara) sin DOM |
| `ui/hud.js` | `Hud` | texto del panel lateral (puro) + montaje en el DOM |
| `ui/render.js` | `Render` | dibuja `DrawPrimitives2D` y marcadores en el canvas |
| `ui/homography_panel.js` | `HomographyPanel` | panel del experimento de homografía |
| `ui/main.js` | — | arranque: cablea DOM ↔ controlador ↔ cadena de proyección |

## 4. Reglas de la arquitectura (las hace cumplir `test_architecture.js`)

1. **Capas**: una capa solo depende de capas **inferiores**. `scene` y `projection` están en la misma capa y **no se conocen** (la escena no sabe de cámara ni pantalla; la proyección no sabe de piezas).
2. **Un solo dueño del estado**: la escena la posee `Scene` (se cambia solo con `apply_action`); el estado de la aplicación lo posee `Controller`; `K, R, t, P` no se guardan, se recalculan por fotograma.
3. **Funciones puras donde se pueda**: `Input.map_key`, `Easing`, `Motion`, `Victory.actions(scene, t)`, `Demo.state_at(t, scene, cam)`, `Projection.project`, los textos del HUD. Por eso la demo es determinista y todo se prueba sin navegador.
4. **Solo `ui/` toca el DOM** (`input`, `main`, `hud.mount`, `homography_panel`). El controlador y la animación no usan `document`, `window` ni `canvas`.
5. **Las animaciones modifican poses 3D, nunca coordenadas de pantalla**: entran por `apply_action({type:'set_pose'})` y pasan por la misma cadena de proyección.
6. **Sin dependencias**: scripts clásicos (`<script src>`), sin módulos ES (bloqueados en `file://`), sin CDN, sin WebGL/three.js ni CSS 3D.
7. **Ninguna función pública lanza**: devuelven un valor degradado y un diagnóstico (`last.ok`, `warnings`, `sanitized`, `stats`, `error`). Ver [INTERFACES.md §6](INTERFACES.md).
8. **Datos JSON-friendly**: escena, acciones, geometría, cámara y primitivas son objetos y arreglos simples.

### Grafo real de dependencias

Salida de `node app/tests/deps.js` (leída del código):

```
[core]
  linalg.js             LinAlg            275 líneas   usa: —

[scene]
  pieces.js             Pieces             60 líneas   usa: LinAlg
  mesh.js               Mesh               71 líneas   usa: LinAlg
  container.js          Container          51 líneas   usa: Mesh
  scene.js              Scene             268 líneas   usa: LinAlg, Pieces, Mesh, Container

[projection]
  camera.js             Camera            166 líneas   usa: LinAlg
  projection.js         Projection        152 líneas   usa: LinAlg
  homography.js         Homography        359 líneas   usa: LinAlg, Camera, Projection

[animation]
  easing.js             Easing             22 líneas   usa: —
  motion.js             Motion             57 líneas   usa: LinAlg, Scene
  victory.js            Victory           115 líneas   usa: LinAlg, Scene, Easing, Motion
  demo.js               Demo              122 líneas   usa: Scene, Camera, Easing, Motion, Victory

[ui]
  input.js              Input              94 líneas   usa: —
  render.js             Render             94 líneas   usa: —
  hud.js                Hud               117 líneas   usa: Scene, Render
  controller.js         Controller        127 líneas   usa: Scene, Camera, Easing, Motion, Victory, Demo
  homography_panel.js   HomographyPanel   113 líneas   usa: Scene, Projection, Homography, Render
  main.js               (arranque)         66 líneas   usa: Scene, Camera, Projection, Input, Render, Hud, Controller, HomographyPanel
```

## 5. Contratos entre roles (resumen)

| De → A | Qué viaja | Estructura |
|---|---|---|
| C → A | acciones del usuario y de la animación | `Action`: `select`, `select_next/prev`, `translate`, `rotate`, `set_pose` |
| A → B / C | geometría en el mundo | `Geometry3D = { objects: [{id, role, M, vertices_local, vertices, edges}] }` |
| C → B | parámetros de cámara | `{azimuth, elevation, distance, target, fov_y, near, viewport}` (radianes) |
| B → C | cámara y primitivas 2D | `Camera {K,R,t,P,C,...}` · `DrawPrimitives2D {lines, stats, error}` |

Si un contrato cambia: se edita [INTERFACES.md](INTERFACES.md) **primero** (con entrada en su registro de cambios), se avisa al módulo afectado y se actualiza el código en el mismo PR.

## 6. Decisiones de diseño y por qué

| Decisión | Motivo |
|---|---|
| Carpetas por capa/rol (`scene/`, `projection/`, …) | cada integrante trabaja en su carpeta: casi sin conflictos de Git y revisión por pares natural |
| Un namespace global por archivo (patrón IIFE), sin bundler | funciona abriendo `index.html` con doble clic; el mismo archivo se carga en Node para los tests |
| `Controller` sin DOM | la lógica de modos (victoria, demo, animaciones, avisos) se prueba en Node, sin navegador |
| `Hud` separado en texto puro + montaje | el formato de lo que se muestra (K, `[R|t]`, M, estados) se prueba sin DOM |
| Victoria y demo como funciones puras del tiempo | determinismo y repetibilidad exigidos por el enunciado; se pueden muestrear en tests |
| Poses interpoladas con matrices de rotación reales (geodésica) | rigidez (`R` ortonormal, `det = +1`) en todos los instantes |
| Pivote = centro de un cubo ocupado | los giros de 90° caen exactos en la retícula |
| Aristas visibles unitarias en vez de caras | alcance acotado; sin necesidad de visibilidad de caras |

## 7. Pruebas por capa

| Archivo de test | Cubre | Dueño |
|---|---|---|
| `test_linalg.js` | álgebra, rotaciones, Jacobi, eje–ángulo | B |
| `test_scene.js` | piezas, rigidez, acciones, geometría, inmutabilidad | A |
| `test_camera_projection.js` | ejemplo dorado, cámara, recorte, NaN/Infinity, cámara móvil | B |
| `test_homography.js` | derivación, DLT, ruido, fuera del plano, rotación pura | B |
| `test_animation.js` | easing, interpolación geodésica, victoria (torre, giro, regreso, continuidad) | A |
| `test_demo.js` | determinismo y poses finales de la demo | C |
| `test_input.js`, `test_controller.js`, `test_hud.js` | entrada, máquina de estados, texto del HUD | C |
| `test_architecture.js` | capas, DOM, sin motores 3D/CDN/ES, orden de carga | todos |

`node app/tests/run.js` (Node) o `app/tests/index.html` (navegador). Scripts de apoyo: `trace.js` (traza de un vértice), `report.js` (tablas de homografía), `deps.js` (grafo de dependencias).

## 8. Cómo extender sin romper la arquitectura

| Quiero… | Dónde | Pasos |
|---|---|---|
| **añadir una pieza** | `scene/pieces.js` (A) | agregar una fila a `RAW` (cubos, índice original, nº de orientaciones); el test de orientaciones y de rigidez la cubren solos; añadir su color en `ui/render.js` |
| **cambiar la animación de victoria** | `animation/victory.js` (A) | editar `SCHEDULE`/constantes o las funciones `fly`/`spin`; mantener que devuelva `[]` fuera de `(0, DURATION)` y poses rígidas |
| **añadir una tecla o un botón** | `ui/input.js` → `ui/controller.js` (C) | nuevo comando en `KEYS`; manejarlo en `Controller.dispatch` |
| **cambiar la cámara** | `projection/camera.js` (B) | mantener `build_camera(params) -> {K,R,t,P}`; actualizar el ejemplo dorado |
| **añadir un objeto estático al mundo** | `scene/container.js` (A) | nuevo `Mesh.static_object` en `Container.objects` |
| **un nuevo módulo** | carpeta de su capa + `tests/manifest.js` + `index.html` + `tests/index.html` | el test de arquitectura exige registrarlo y respetar las capas |

## 9. Flujo de integración (hitos del enunciado)

El orden concreto de los PR, sus autores y revisores está en [PLAN_INTEGRACION.md](PLAN_INTEGRACION.md); las reglas de Git, en [GIT_WORKFLOW.md](GIT_WORKFLOW.md).

1. **Diseño** — los tres: este documento, `INTERFACES.md` y el ejemplo dorado. Cada quien revisa que entiende los contratos.
2. **Primera integración** — A entrega `get_geometry` con contenedor y una pieza; B entrega `build_camera` + `project`; C la pantalla mínima. Integrar pronto, aunque sea feo.
3. **Prototipo interactivo** — A: todas las piezas y acciones; B: homografía; C: entrada, HUD y panel.
4. **Integración final** — C: victoria y demo; los tres: tests, Linux, documentación, video.

Cada PR toca principalmente **una** carpeta; los cambios en `core/` o en los contratos van en PR separados y los aprueban los tres.
