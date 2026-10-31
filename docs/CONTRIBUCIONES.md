# Declaración de contribuciones

Versión entregada: etiqueta `v1.0` (**todavía no creada**: se crea al cerrar la issue [#19](https://github.com/AlejandroRuiz444/blockout-UTP/issues/19)) — https://github.com/AlejandroRuiz444/blockout-UTP

> **Estado: borrador.** Lo preparó Claude Code a petición de Alejandro (Estudiante 1) a partir del historial de GitHub: PR, *commits* y revisiones, todos con enlace real. **Cada integrante debe verificar y completar su sección** (casilla al final de cada una). Lo que no consta en GitHub figura como pendiente entre `<…>`. Las fechas de GitHub están en UTC.
>
> **Sobre la autoría del código base:** el código y los documentos base se prepararon con asistencia de un agente de IA y se incorporaron por etapas (ver [../AI_USAGE.md](../AI_USAGE.md)). Por eso la contribución de cada integrante se describe con lo que se puede comprobar: los PR que subió, sus cambios propios en *commits* aparte y las revisiones que hizo.

## Estudiante 1 (Alejandro): rol A, escena y geometría (cuenta: @AlejandroRuiz444)

- **Contribución principal** (lo que subió e integró): el entorno del repositorio (T0) y la arquitectura en capas con los roles; el módulo escena; la animación base con la victoria; las pruebas de arquitectura y el runner en el navegador; la documentación final (README, guía de sustentación y `AI_USAGE.md`); y la coordinación del seguimiento.
- **PR propios** (revisados por Yohan): [#20](https://github.com/AlejandroRuiz444/blockout-UTP/pull/20) (PR-01 entorno), [#22](https://github.com/AlejandroRuiz444/blockout-UTP/pull/22) (PR-02 arquitectura y roles), [#24](https://github.com/AlejandroRuiz444/blockout-UTP/pull/24) (PR-05 escena), [#26](https://github.com/AlejandroRuiz444/blockout-UTP/pull/26) (PR-10 animación), [#35](https://github.com/AlejandroRuiz444/blockout-UTP/pull/35) (PR-16 pruebas de arquitectura), [#36](https://github.com/AlejandroRuiz444/blockout-UTP/pull/36) (PR-17 documentación final) y el PR del cierre documental que añade este archivo.
- **Cambios propios** (en *commits* aparte, con su cuenta, escritos con Claude Code):
  - [`91f5885`](https://github.com/AlejandroRuiz444/blockout-UTP/commit/91f5885): test de `tower_layout` (#26).
  - [`7c7d6df`](https://github.com/AlejandroRuiz444/blockout-UTP/commit/7c7d6df): la regla «sin WebGL» detecta `getContext('webgl')`; con la regla anterior, 4 de 18 mutaciones pasaban sin detectarse (#35).
  - [`17c56eb`](https://github.com/AlejandroRuiz444/blockout-UTP/commit/17c56eb): el grafo de dependencias de `ARQUITECTURA.md` coincide con la salida de `deps.js` (#35).
  - [`08b59e7`](https://github.com/AlejandroRuiz444/blockout-UTP/commit/08b59e7), [`d02cc9d`](https://github.com/AlejandroRuiz444/blockout-UTP/commit/d02cc9d) y [`ceaa377`](https://github.com/AlejandroRuiz444/blockout-UTP/commit/ceaa377): correcciones del README, la guía y `AI_USAGE.md` tras contrastarlos con el código y con el historial (#36).
- **Revisiones realizadas (a Juan).** Las preparó Claude Code ejecutando los tests y scripts propios; Alejandro envió las aprobaciones:
  - #21: [informe](https://github.com/AlejandroRuiz444/blockout-UTP/pull/21#pullrequestreview-5693012646) y [aprobación](https://github.com/AlejandroRuiz444/blockout-UTP/pull/21#pullrequestreview-5693112250). Recalculó el ejemplo dorado con un script propio; observó que `INTERFACES.md` §11 atribuye mal la reorganización del 2026-10-23 y deja una fecha sin completar.
  - #23: [informe](https://github.com/AlejandroRuiz444/blockout-UTP/pull/23#pullrequestreview-5702160308) y [aprobación](https://github.com/AlejandroRuiz444/blockout-UTP/pull/23#pullrequestreview-5702189699). Tests 13/13 y pruebas propias del álgebra.
  - #25: [aprobación](https://github.com/AlejandroRuiz444/blockout-UTP/pull/25#pullrequestreview-5705930840). Tests 52/52, tabla de `near` reproducida y prueba de control (fallan 2 tests si el recorte descarta en vez de recortar).
  - #27: [informe](https://github.com/AlejandroRuiz444/blockout-UTP/pull/27#pullrequestreview-5706607578) y [aprobación](https://github.com/AlejandroRuiz444/blockout-UTP/pull/27#pullrequestreview-5706612725). Observó que `dlt` no detecta puntos colineales (devuelve `ok: true`).
  - #29: [informe](https://github.com/AlejandroRuiz444/blockout-UTP/pull/29#pullrequestreview-5707223218) y [aprobación](https://github.com/AlejandroRuiz444/blockout-UTP/pull/29#pullrequestreview-5707234143). Recalculó a mano los centros de cámara, `H₂₁` y la traza; observó que el informe cita Chrome 155 y describe funciones aún no integradas.
- **Problema de integración que ayudó a resolver:** `<a confirmar por Alejandro>`. Candidato con enlace: en el #35, la regla de arquitectura «sin WebGL» no veía `getContext('webgl')` porque el test descarta las cadenas y cuatro módulos de la interfaz están exentos de la regla del DOM; se detectó con controles de mutación y se corrigió en [`7c7d6df`](https://github.com/AlejandroRuiz444/blockout-UTP/commit/7c7d6df).
- [ ] Verificado por Alejandro.

## Juan: rol B, cámara y proyección (cuenta: @juanjose-gh)

- **Contribución principal** (lo que subió e integró): el documento de interfaces con el ejemplo dorado; el álgebra lineal propia y el runner de verificaciones; el módulo de cámara y proyección (`K`, `R`, `t`, `P`, recorte contra el plano cercano y el viewport); el experimento de homografía; y el informe con la cadena de proyección, la derivación de `H` y los resultados.
- **PR propios** (revisados por Alejandro): [#21](https://github.com/AlejandroRuiz444/blockout-UTP/pull/21) (PR-03 interfaces), [#23](https://github.com/AlejandroRuiz444/blockout-UTP/pull/23) (PR-04 álgebra), [#25](https://github.com/AlejandroRuiz444/blockout-UTP/pull/25) (PR-06 cámara y proyección), [#27](https://github.com/AlejandroRuiz444/blockout-UTP/pull/27) (PR-09 homografía) y [#29](https://github.com/AlejandroRuiz444/blockout-UTP/pull/29) (PR-15 informe).
- **Cambios propios:**
  - [`62916d2`](https://github.com/AlejandroRuiz444/blockout-UTP/commit/62916d2): corrige en el informe (§3.1) la comparación del DLT sin normalizar con la tolerancia: el RMS es 2.25e-6 px, **por encima** de 1e-6 px, no por debajo (#29).
  - La tabla de `near` (#25) y la tabla de disposición de puntos (#27) están en las descripciones de esos PR, no como código.
- **Revisiones realizadas (a Yohan):**
  - #28: [aprobación](https://github.com/AlejandroRuiz444/blockout-UTP/pull/28#pullrequestreview-5707059357). Tests 52/52; abrió `app/index.html` en Opera GX con la consola abierta.
  - #30: [aprobación](https://github.com/AlejandroRuiz444/blockout-UTP/pull/30#pullrequestreview-5713775422). Tests 73/73; comprobó que `map_key` es pura.
  - #31: [aprobación](https://github.com/AlejandroRuiz444/blockout-UTP/pull/31#pullrequestreview-5714123167). Tests 77/77; comprobó que los constructores de texto del HUD son puros.
  - #32: [aprobación](https://github.com/AlejandroRuiz444/blockout-UTP/pull/32#pullrequestreview-5715540185). Tests 100/100; comprobó que `state_at` es determinista (dos llamadas en 11 instantes dan lo mismo).
  - #33: [aprobación](https://github.com/AlejandroRuiz444/blockout-UTP/pull/33#pullrequestreview-5715864382). Tests 111/111; comprobó que el controlador no usa el DOM ni el reloj y simuló la victoria y la demo.
  - #34: [aprobación](https://github.com/AlejandroRuiz444/blockout-UTP/pull/34#pullrequestreview-5716741921). Tests 111/111; probó la aplicación en Opera GX con la consola abierta (controles, cámara, victoria, demo y panel de homografía).
- **Problema de integración que ayudó a resolver:** `<a confirmar por Juan>`. Candidato con enlace: en el #29 se vio que el informe decía que el DLT sin normalizar quedaba por debajo de la tolerancia de los tests, y no era cierto; Juan lo comparó con la salida de `report.js` y lo corrigió en [`62916d2`](https://github.com/AlejandroRuiz444/blockout-UTP/commit/62916d2).
- [ ] Verificado por Juan.

## Yohan: rol C, interfaz y animación (cuenta: @Yohan205)

- **Contribución principal** (lo que subió e integró): el prototipo del Hito 2 (contenedor y una pieza en pantalla); la entrada de teclado y ratón; el HUD; el modo demostración; el controlador de la aplicación; y la interfaz final con el panel de homografía.
- **PR propios** (revisados por Juan): [#28](https://github.com/AlejandroRuiz444/blockout-UTP/pull/28) (PR-07 prototipo), [#30](https://github.com/AlejandroRuiz444/blockout-UTP/pull/30) (PR-08 entrada), [#31](https://github.com/AlejandroRuiz444/blockout-UTP/pull/31) (PR-11 HUD), [#32](https://github.com/AlejandroRuiz444/blockout-UTP/pull/32) (PR-12 demo), [#33](https://github.com/AlejandroRuiz444/blockout-UTP/pull/33) (PR-13 controlador) y [#34](https://github.com/AlejandroRuiz444/blockout-UTP/pull/34) (PR-14 interfaz final).
- **Cambios propios:** en el #34, `ui/main.js` difiere del paquete: con el panel de homografía abierto ignora todos los comandos salvo `H` y `Esc` (antes `V` y `M` llegaban al controlador), según la descripción del PR. Ese cambio está dentro del *commit* [`5c4c8a5`](https://github.com/AlejandroRuiz444/blockout-UTP/commit/5c4c8a5), junto con el `main.js` definitivo, y no en uno aparte: `<pendiente: describirlo o separarlo en un commit propio>`.
- **Revisiones realizadas (a Alejandro):**
  - #20: [cambios solicitados](https://github.com/AlejandroRuiz444/blockout-UTP/pull/20#pullrequestreview-5677341008) (pidió el nombre del Estudiante 1) y [aprobación](https://github.com/AlejandroRuiz444/blockout-UTP/pull/20#pullrequestreview-5685607756).
  - #22: [aprobación](https://github.com/AlejandroRuiz444/blockout-UTP/pull/22#pullrequestreview-5698385649) («Cambio en el md de arquitectura aprobado»).
  - #24: [aprobación](https://github.com/AlejandroRuiz444/blockout-UTP/pull/24#pullrequestreview-5703724842) («Ok»).
  - #26: [aprobación](https://github.com/AlejandroRuiz444/blockout-UTP/pull/26#pullrequestreview-5712243402) y [aprobación con revisión](https://github.com/AlejandroRuiz444/blockout-UTP/pull/26#pullrequestreview-5713498152): tests 82/82; comprobó que la animación emite solo `set_pose` y que `actions` devuelve `[]` fuera de (0, 8 s).
  - #35: [comentario](https://github.com/AlejandroRuiz444/blockout-UTP/pull/35#pullrequestreview-5718846390) y [aprobación](https://github.com/AlejandroRuiz444/blockout-UTP/pull/35#pullrequestreview-5718902559): abrió `tests/index.html` («TODO CORRECTO») y comprobó que `deps.js` coincide con la tabla de `ARQUITECTURA.md`.
  - #36: [aprobación](https://github.com/AlejandroRuiz444/blockout-UTP/pull/36#pullrequestreview-5719689547) («Ok»).
- **Problema de integración que ayudó a resolver:** `<a confirmar por Yohan>`. Candidato con enlace: el caso de `V` y `M` con el panel de homografía abierto (#34, descrito arriba).
- [ ] Verificado por Yohan.

## Seguimiento y coordinación: Estudiante 1

- **Plan, cronograma y tablero:** [PLAN_TRABAJO.md](PLAN_TRABAJO.md) (tareas con sus PR, hitos con fecha real, tablero y registro de seguimiento). Tablero en GitHub: las *issues* #1 a #19 con etiquetas `estado:*`, `rol:*` y `tipo:*`, y los [hitos 1 a 4](https://github.com/AlejandroRuiz444/blockout-UTP/milestones?state=all).
- **Actualizaciones semanales:** hay un solo registro (2026-10-28 a 2026-10-30), en [PLAN_TRABAJO.md §5](PLAN_TRABAJO.md); no hay registros semanales anteriores.
- **Fechas previstas:** siguen como `[fecha]` en [PLAN_TRABAJO.md §3](PLAN_TRABAJO.md); el equipo no las registró.
- [ ] Verificado por Alejandro.

## Uso de IA

Ver [../AI_USAGE.md](../AI_USAGE.md). Cambios generados con IA integrados por PR con revisión humana: los PR #20 a #36 (la tabla de `AI_USAGE.md` §6 resume lo que cada integrante declaró en los suyos).

## Qué falta para cerrar la issue #19

- [ ] Que cada integrante verifique su sección y complete su «problema de integración».
- [x] Verificación en Linux: Ubuntu 24.04.3 sobre WSL2, con Firefox y Chromium (PR #38, issue #18).
- [ ] Video grabado en Linux por los tres, publicado en YouTube (cuenta UTP, acceso restringido) y su enlace en el README.
- [ ] Crear la etiqueta `v1.0` y actualizar la primera línea de este archivo.
