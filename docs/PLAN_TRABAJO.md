# Plan de trabajo y seguimiento (plantilla)

> **Plantilla.** Roles asignados: Estudiante 1 = A (y coordinación), Juan = B, Yohan = C. Los marcadores `[fecha]` y `[enlace]` los completa el equipo. Este archivo **no** contiene fechas, avances ni commits reales: se llenan a medida que se trabaja. El enunciado pide actualizar el seguimiento al menos semanalmente, registrar fechas reales, bloqueos, decisiones y ajustes del cronograma, y vincular cada tarea con sus *commits* y solicitudes de integración (PR).
>
> **Nota de honestidad:** el código base de este repositorio fue preparado con asistencia de un agente de IA (ver [../AI_USAGE.md](../AI_USAGE.md)). Una tarea solo pasa a **terminada** cuando su responsable humano la revisó, la entiende, la explica y la integró por PR con revisión de otro compañero.

El orden concreto de los *pull requests*, quién sube cada uno y quién lo revisa está en [PLAN_INTEGRACION.md](PLAN_INTEGRACION.md).

## 1. Roles

| Rol | Responsable | Módulo |
|---|---|---|
| A: escena y geometría | Estudiante 1: Alejandro (@AlejandroRuiz444) | `app/src/scene/` y, por equilibrio de carga, `app/src/animation/` (`easing`, `motion`, `victory`) |
| B: cámara y proyección | Juan | `app/src/projection/` y `app/src/core/` |
| C: interfaz y animación | Yohan | `app/src/animation/demo.js`, `app/src/ui/`, `index.html`, `css/` |
| Coordinación del seguimiento (además de su rol técnico) | Estudiante 1 (cambiable por acuerdo del equipo) | este plan, el cronograma y el tablero |

Rotación de revisión de PR: **A revisa a B, B revisa a C, C revisa a A** (Estudiante 1 revisa a Juan, Juan a Yohan, Yohan a Estudiante 1) (pueden participar revisores adicionales).

## 2. Tareas, dependencias y criterios de finalización

| ID | Tarea | Resp. | Depende de | Criterio de finalización | PR / commits |
|---|---|---|---|---|---|
| T0 | **Configurar el entorno de desarrollo**: repositorio de GitHub, permisos, ajustes de integración sin *squash*, protección de `main`, plantillas de PR e *issues*, CI en Linux, etiquetas, hitos, *issues* del plan y PR-01 (con apoyo de un agente de IA, bajo su supervisión; la guía del agente está en la carpeta `proceso/` del paquete de trabajo, que no se sube al repositorio) | Estudiante 1 | — | repositorio configurado según los criterios de aceptación de la tarea; PR-01 aprobado por Yohan e integrado; check `tests` en verde | `[enlace]` |
| T1 | Convenciones de coordenadas y documento de interfaces con ejemplo dorado | todos | — | `docs/INTERFACES.md` aprobado por los 3; el ejemplo dorado da el `(u,v)` esperado a mano | `[enlace]` |
| T2 | Plan de trabajo, cronograma y tablero | Estudiante 1 | — | este archivo completado con fechas y publicado | `[enlace]` |
| T3 | Álgebra lineal propia (`linalg.js`) y sus tests | Juan | T1 | tests de álgebra y rotaciones en verde | `[enlace]` |
| T4 | Escena: contenedor, 7 piezas (≥ 2 no planas; la ficha 7 es el tricubo recto), pivotes, `create_scene`/`apply_action`/`get_geometry` | Estudiante 1 | T1, T3 | tests de escena y rigidez en verde; geometría en coordenadas del mundo | `[enlace]` |
| T5 | Cámara: `build_camera` (`K`, `R`, `t`, `P`), órbita, distancia, FOV, reset | Juan | T1, T3 | ejemplo dorado coincide; mover la cámara no altera `get_geometry` | `[enlace]` |
| T6 | Proyección: perspectiva, recorte contra el plano cercano y el viewport, inmunidad a NaN/Infinity | Juan | T5 | tests de casos límite en verde | `[enlace]` |
| T7 | **Hito 2:** un contenedor y una pieza proyectados y dibujados en pantalla | Yohan | T4, T6 | captura/video del contenedor y una pieza en pantalla | `[enlace]` |
| T8 | Entrada (teclado/ratón) → acciones; HUD con controles, pieza activa y estado | Yohan | T4 | todos los controles del README funcionan | `[enlace]` |
| T9 | Todas las piezas, controles de pieza y de cámara en la interfaz | Estudiante 1 + Yohan | T7, T8 | demo en vivo del prototipo | `[enlace]` |
| T10 | Experimento de homografía: derivación, DLT, ruido, fuera del plano, rotación pura, panel en la UI | Juan | T6 | tests de homografía en verde; tablas en `INFORME.md` | `[enlace]` |
| T11 | Animación de victoria (poses 3D, misma cadena de proyección, cámara activa) | Estudiante 1 | T4, T6 | tests de victoria en verde | `[enlace]` |
| T12 | Modo demostración determinista | Yohan | T11 | dos ejecuciones idénticas; muestra los 4 bloques en orden | `[enlace]` |
| T13 | Documentación: README, INFORME, GUIA_DEMO, AI_USAGE | todos | T10, T12 | revisados por pares y consistentes con el código | `[enlace]` |
| T14 | Verificación en Linux (Firefox y Chromium) | todos | T9, T12 | app y tests ejecutados en Linux; anotado en README | `[enlace]` |
| T15 | Video de sustentación (YouTube, cuenta UTP, acceso del docente verificado) | todos | T14 | URL en el README | `[enlace]` |
| T16 | Integración final, etiqueta de versión y declaración de contribuciones | Estudiante 1 | T13–T15 | etiqueta `v[X.Y]` creada; declaración con enlaces | `[enlace]` |

## 3. Cronograma e hitos

| Hito (enunciado) | Contenido | Fecha prevista | Fecha real | Revisión/integración prevista | Notas |
|---|---|---|---|---|---|
| 1. Diseño | repositorio y entorno, roles, convenciones, interfaces, plan de integración (T0–T3) | `[fecha]` | `[fecha]` | `[fecha]` | |
| 2. Primera integración | contenedor y una pieza proyectados con la matriz de cámara (T4–T7) | `[fecha]` | `[fecha]` | `[fecha]` | |
| 3. Prototipo interactivo | todas las piezas, controles de objeto y cámara, experimento de homografía (T8–T10) | `[fecha]` | `[fecha]` | `[fecha]` | |
| 4. Integración final | victoria, demo reproducible, verificaciones y documentación, Linux, video (T11–T16) | `[fecha]` | `[fecha]` | `[fecha]` | |

No se pospone la integración hasta que los tres módulos estén terminados: integrar pronto una versión mínima de extremo a extremo y ampliarla.

## 4. Tablero (estados: pendiente · en curso · en revisión · terminada)

| ID | Estado | Responsable | Última actualización | Bloqueos / decisiones / ajustes |
|---|---|---|---|---|
| T0 | pendiente | Estudiante 1 | `[fecha]` | |
| T1 | pendiente | todos | `[fecha]` | |
| T2 | pendiente | Estudiante 1 | `[fecha]` | |
| T3 | pendiente | Juan | `[fecha]` | |
| T4 | pendiente | Estudiante 1 | `[fecha]` | |
| T5 | pendiente | Juan | `[fecha]` | |
| T6 | pendiente | Juan | `[fecha]` | |
| T7 | pendiente | Yohan | `[fecha]` | |
| T8 | pendiente | Yohan | `[fecha]` | |
| T9 | pendiente | Estudiante 1 + Yohan | `[fecha]` | |
| T10 | pendiente | Juan | `[fecha]` | |
| T11 | pendiente | Estudiante 1 | `[fecha]` | |
| T12 | pendiente | Yohan | `[fecha]` | |
| T13 | pendiente | todos | `[fecha]` | |
| T14 | pendiente | todos | `[fecha]` | |
| T15 | pendiente | todos | `[fecha]` | |
| T16 | pendiente | Estudiante 1 | `[fecha]` | |

## 5. Registro de seguimiento (una fila por actualización semanal)

| Semana / fecha | Avances reales | Bloqueos | Decisiones y ajustes del cronograma | Evidencia (commits / PR) |
|---|---|---|---|---|
| `[fecha]` | | | | `[enlaces]` |
