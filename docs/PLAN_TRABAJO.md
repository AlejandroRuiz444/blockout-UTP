# Plan de trabajo y seguimiento

> **Estado (actualizado el 2026-10-30).** Este archivo tiene el estado real que consta en GitHub: PR integrados, *issues* y sus fechas, todo en **UTC** (Colombia es UTC−5). Las **fechas previstas** no se registraron antes de implementar: figuran como «no registrada» y no se reconstruyen a posteriori (desviación que se reconoce en la sección 3). El enunciado pide actualizar el seguimiento al menos semanalmente, registrar fechas reales, bloqueos, decisiones y ajustes del cronograma, y vincular cada tarea con sus *commits* y solicitudes de integración (PR).
>
> **Nota de honestidad:** el código base de este repositorio fue preparado con asistencia de un agente de IA (ver [../AI_USAGE.md](../AI_USAGE.md)). Una tarea solo pasa a **terminada** cuando su responsable humano la revisó, la entiende, la explica y la integró por PR con revisión de otro compañero.

El orden concreto de los *pull requests*, quién sube cada uno y quién lo revisa está en [PLAN_INTEGRACION.md](PLAN_INTEGRACION.md). Quién hizo qué, con enlaces, está en [CONTRIBUCIONES.md](CONTRIBUCIONES.md).

## 1. Roles

| Rol | Responsable | Módulo |
|---|---|---|
| A: escena y geometría | Estudiante 1: Alejandro (@AlejandroRuiz444) | `app/src/scene/` y, por equilibrio de carga, `app/src/animation/` (`easing`, `motion`, `victory`) |
| B: cámara y proyección | Juan | `app/src/projection/` y `app/src/core/` |
| C: interfaz y animación | Yohan | `app/src/animation/demo.js`, `app/src/ui/`, `index.html`, `css/` |
| Coordinación del seguimiento (además de su rol técnico) | Estudiante 1 (cambiable por acuerdo del equipo) | este plan, el cronograma y el tablero |

Rotación de revisión de PR: **A revisa a B, B revisa a C, C revisa a A** (Estudiante 1 revisa a Juan, Juan a Yohan, Yohan a Estudiante 1) (pueden participar revisores adicionales).

## 2. Tareas, dependencias y criterios de finalización

Los PR integrados están en [la lista de PR cerrados](https://github.com/AlejandroRuiz444/blockout-UTP/pulls?q=is%3Apr+is%3Amerged); abajo se enlaza cada uno.

| ID | Tarea | Resp. | Depende de | Criterio de finalización | PR / commits |
|---|---|---|---|---|---|
| T0 | **Configurar el entorno de desarrollo**: repositorio de GitHub, permisos, ajustes de integración sin *squash*, protección de `main`, plantillas de PR e *issues*, CI en Linux, etiquetas, hitos, *issues* del plan y PR-01 (con apoyo de un agente de IA, bajo su supervisión; la guía del agente está en la carpeta `proceso/` del paquete de trabajo, que no se sube al repositorio) | Estudiante 1 | — | repositorio configurado según los criterios de aceptación de la tarea; PR-01 aprobado por Yohan e integrado; check `tests` en verde | [#20](https://github.com/AlejandroRuiz444/blockout-UTP/pull/20) |
| T1 | Convenciones de coordenadas y documento de interfaces con ejemplo dorado | todos | — | `docs/INTERFACES.md` aprobado por los 3; el ejemplo dorado da el `(u,v)` esperado a mano | [#21](https://github.com/AlejandroRuiz444/blockout-UTP/pull/21) (interfaces), [#22](https://github.com/AlejandroRuiz444/blockout-UTP/pull/22) (arquitectura y roles) |
| T2 | Plan de trabajo, cronograma y tablero | Estudiante 1 | — | este archivo completado con fechas y publicado | este archivo |
| T3 | Álgebra lineal propia (`linalg.js`) y sus tests | Juan | T1 | tests de álgebra y rotaciones en verde | [#23](https://github.com/AlejandroRuiz444/blockout-UTP/pull/23) |
| T4 | Escena: contenedor, 7 piezas (≥ 2 no planas; la ficha 7 es el tricubo recto), pivotes, `create_scene`/`apply_action`/`get_geometry` | Estudiante 1 | T1, T3 | tests de escena y rigidez en verde; geometría en coordenadas del mundo | [#24](https://github.com/AlejandroRuiz444/blockout-UTP/pull/24) |
| T5 | Cámara: `build_camera` (`K`, `R`, `t`, `P`), órbita, distancia, FOV, reset | Juan | T1, T3 | ejemplo dorado coincide; mover la cámara no altera `get_geometry` | [#25](https://github.com/AlejandroRuiz444/blockout-UTP/pull/25) |
| T6 | Proyección: perspectiva, recorte contra el plano cercano y el viewport, inmunidad a NaN/Infinity | Juan | T5 | tests de casos límite en verde | [#25](https://github.com/AlejandroRuiz444/blockout-UTP/pull/25) |
| T7 | **Hito 2:** un contenedor y una pieza proyectados y dibujados en pantalla | Yohan | T4, T6 | captura/video del contenedor y una pieza en pantalla | [#28](https://github.com/AlejandroRuiz444/blockout-UTP/pull/28) |
| T8 | Entrada (teclado/ratón) → acciones; HUD con controles, pieza activa y estado | Yohan | T4 | todos los controles del README funcionan | [#30](https://github.com/AlejandroRuiz444/blockout-UTP/pull/30) (entrada), [#31](https://github.com/AlejandroRuiz444/blockout-UTP/pull/31) (HUD), [#33](https://github.com/AlejandroRuiz444/blockout-UTP/pull/33) (controlador) |
| T9 | Todas las piezas, controles de pieza y de cámara en la interfaz | Estudiante 1 + Yohan | T7, T8 | demo en vivo del prototipo | [#31](https://github.com/AlejandroRuiz444/blockout-UTP/pull/31), [#33](https://github.com/AlejandroRuiz444/blockout-UTP/pull/33), [#34](https://github.com/AlejandroRuiz444/blockout-UTP/pull/34) (la demo en vivo está pendiente) |
| T10 | Experimento de homografía: derivación, DLT, ruido, fuera del plano, rotación pura, panel en la UI | Juan | T6 | tests de homografía en verde; tablas en `INFORME.md` | [#27](https://github.com/AlejandroRuiz444/blockout-UTP/pull/27) (experimento), [#34](https://github.com/AlejandroRuiz444/blockout-UTP/pull/34) (panel) |
| T11 | Animación de victoria (poses 3D, misma cadena de proyección, cámara activa) | Estudiante 1 | T4, T6 | tests de victoria en verde | [#26](https://github.com/AlejandroRuiz444/blockout-UTP/pull/26) |
| T12 | Modo demostración determinista | Yohan | T11 | dos ejecuciones idénticas; muestra los 4 bloques en orden | [#32](https://github.com/AlejandroRuiz444/blockout-UTP/pull/32) |
| T13 | Documentación: README, INFORME, GUIA_DEMO, AI_USAGE | todos | T10, T12 | revisados por pares y consistentes con el código | [#29](https://github.com/AlejandroRuiz444/blockout-UTP/pull/29) (informe), [#35](https://github.com/AlejandroRuiz444/blockout-UTP/pull/35) (pruebas de arquitectura), [#36](https://github.com/AlejandroRuiz444/blockout-UTP/pull/36) (README, guía y AI_USAGE) |
| T14 | Verificación en Linux (Firefox y Chromium) | todos | T9, T12 | app y tests ejecutados en Linux; anotado en README | pendiente: issue [#18](https://github.com/AlejandroRuiz444/blockout-UTP/issues/18) |
| T15 | Video de sustentación (YouTube, cuenta UTP, acceso del docente verificado) | todos | T14 | URL en el README | pendiente: issue [#19](https://github.com/AlejandroRuiz444/blockout-UTP/issues/19) |
| T16 | Integración final, etiqueta de versión y declaración de contribuciones | Estudiante 1 | T13–T15 | etiqueta `v[X.Y]` creada; declaración con enlaces | pendiente: issue [#19](https://github.com/AlejandroRuiz444/blockout-UTP/issues/19); borrador en [CONTRIBUCIONES.md](CONTRIBUCIONES.md) |

## 3. Cronograma e hitos

La «fecha real» es la de la última *issue* del hito cerrada en GitHub (UTC). Las **fechas previstas no se registraron** antes de implementar, como pide el enunciado: es una desviación del plan que se reconoce aquí y que no se corrige inventando fechas después.

| Hito (enunciado) | Contenido | Fecha prevista | Fecha real | Revisión/integración prevista | Notas |
|---|---|---|---|---|---|
| 1. Diseño | repositorio y entorno, roles, convenciones, interfaces, plan de integración (T0–T3) | no registrada | 2026-10-29 | no registrada | PR #20 a #23 |
| 2. Primera integración | contenedor y una pieza proyectados con la matriz de cámara (T4–T7) | no registrada | 2026-10-30 | no registrada | PR #24, #25 y #28 |
| 3. Prototipo interactivo | todas las piezas, controles de objeto y cámara, experimento de homografía (T8–T10) | no registrada | 2026-10-30 | no registrada | PR #26, #27, #30 y #31 (según los hitos de GitHub) |
| 4. Integración final | victoria, demo reproducible, verificaciones y documentación, Linux, video (T11–T16) | no registrada | en curso | no registrada | PR #29, #32 a #36 integrados (último: 2026-10-30); faltan las issues #18 (Linux) y #19 (cierre) |

No se pospone la integración hasta que los tres módulos estén terminados: integrar pronto una versión mínima de extremo a extremo y ampliarla.

## 4. Tablero (estados: pendiente · en curso · en revisión · terminada)

| ID | Estado | Responsable | Última actualización | Bloqueos / decisiones / ajustes |
|---|---|---|---|---|
| T0 | terminada | Estudiante 1 | 2026-10-28 | PR #20: Yohan pidió cambios (completar el nombre del Estudiante 1) y aprobó después |
| T1 | terminada | todos | 2026-10-29 | #21 (Juan, revisado por Estudiante 1) y #22 (Estudiante 1, revisado por Yohan) |
| T2 | en curso | Estudiante 1 | 2026-10-30 | este archivo ya tiene el estado real; faltan las fechas previstas, que no se registraron |
| T3 | terminada | Juan | 2026-10-29 | #23 |
| T4 | terminada | Estudiante 1 | 2026-10-29 | #24 |
| T5 | terminada | Juan | 2026-10-29 | #25 (con T6) |
| T6 | terminada | Juan | 2026-10-29 | #25 |
| T7 | terminada | Yohan | 2026-10-30 | #28; la descripción del PR se completó antes de integrar |
| T8 | terminada | Yohan | 2026-10-30 | #30, #31 y #33 |
| T9 | en curso | Estudiante 1 + Yohan | 2026-10-30 | piezas y controles integrados (#31, #33, #34); falta la demo en vivo del prototipo |
| T10 | terminada | Juan | 2026-10-30 | #27 (experimento) y #34 (panel) |
| T11 | terminada | Estudiante 1 | 2026-10-30 | #26; la rama se actualizó con `main` antes de integrar (protección de rama) |
| T12 | terminada | Yohan | 2026-10-30 | #32 (demo) y #33 (controlador) |
| T13 | en curso | todos | 2026-10-30 | integrados #29, #35 y #36; falta que Juan y Yohan confirmen su fila de `AI_USAGE.md` §6 y el problema de integración real de `GUIA_DEMO.md` §4 |
| T14 | pendiente | todos | 2026-10-30 | solo el CI de Ubuntu (Node y Chrome headless); falta la prueba manual en Firefox y Chromium (#18) |
| T15 | pendiente | todos | 2026-10-30 | falta grabar y publicar el video |
| T16 | pendiente | Estudiante 1 | 2026-10-30 | faltan la etiqueta `v1.0` y verificar la declaración de contribuciones (#19) |

## 5. Registro de seguimiento (una fila por actualización semanal)

Este es el primer registro: el seguimiento semanal no se anotó en este archivo antes del 2026-10-30.

| Semana / fecha | Avances reales | Bloqueos | Decisiones y ajustes del cronograma | Evidencia (commits / PR) |
|---|---|---|---|---|
| 2026-10-28 a 2026-10-30 | PR-01 a PR-17 integrados (PR #20 a #36), cada uno con la aprobación de un compañero distinto de su autor; 118 tests en verde en Node y 111 en el navegador; CI de `main` en verde | la protección de rama obliga a «Update branch» antes de integrar si `main` avanzó (#26, #28); las issues #12, #13 y #14 quedaron abiertas porque sus PR no llevaban `Closes` y se cerraron a mano; Linux de escritorio sin probar hasta el 2026-10-31 (ver el registro siguiente) | ninguna registrada en su momento; se reconoce que las fechas previstas no se registraron antes de implementar (§3) | [#20](https://github.com/AlejandroRuiz444/blockout-UTP/pull/20) a [#36](https://github.com/AlejandroRuiz444/blockout-UTP/pull/36) |
| 2026-10-31 | PR #37 integrado (plan de trabajo con el estado real y declaración de contribuciones); PR #38 (PR-18, verificación en Linux: Ubuntu 24.04.3 en WSL2, Firefox y Chromium) abierto y en revisión; se corrigieron las etiquetas `estado:*` de las issues #10 a #14, #16 y #17 (cerradas) y de #18 y #19 | siguen pendientes el video grabado en Linux, el acceso del docente, la etiqueta `v1.0` y que Juan y Yohan confirmen su fila de `AI_USAGE.md` y su sección de `CONTRIBUCIONES.md` | ninguna | [#37](https://github.com/AlejandroRuiz444/blockout-UTP/pull/37), [#38](https://github.com/AlejandroRuiz444/blockout-UTP/pull/38) |
