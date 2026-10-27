# Flujo de trabajo con Git (plantillas)

> Este repositorio **no** contiene historial de Git, *commits*, PR ni revisiones preparados de antemano, y no se debe fingir ninguno. El flujo de ramas y revisión lo ejecutan los estudiantes con **sus propias cuentas** (el enunciado exige que cada integrante contribuya desde una cuenta identificable y que el docente vea el historial, las ramas y las revisiones). Aquí solo hay plantillas.

## 1. Reglas del enunciado (resumen)

- Un único repositorio compartido; `main` siempre ejecutable.
- Cambios en ramas de funcionalidad; integración por solicitudes de integración (*pull requests*, PR).
- Cada PR requiere la aprobación de **al menos un compañero distinto de su autor**; proteger `main` si la plataforma lo permite.
- Resolver los comentarios de revisión antes de integrar; cada PR lleva descripción y evidencia de funcionamiento.
- Integrar pronto una versión mínima de extremo a extremo y ampliarla.
- Conservar el historial individual al integrar (no aplastar el trabajo de varios en un solo *commit* ajeno).
- Los cambios generados por IA siguen el mismo proceso de PR y revisión humana, y se registran en `AI_USAGE.md`.
- La nota considera la evidencia de trabajo progresivo, la sustancia de las contribuciones y la calidad de las revisiones; **no** la cantidad de *commits* ni de líneas.

## 2. Ramas

Una rama por PR del [plan de integración](PLAN_INTEGRACION.md), con estos nombres. Ramas cortas, PR pequeños.

| Rama | Dueño | PR del plan | Contenido |
|---|---|---|---|
| `main` | todos | — | siempre ejecutable y en verde; solo recibe PR aprobados |
| `chore/entorno` | Estudiante 1 | PR-01 | Entorno de desarrollo: configuración, plantillas, CI, README inicial y declaración de IA |
| `docs/arquitectura` | Estudiante 1 | PR-02 | Arquitectura en capas, roles del equipo y reglas |
| `docs/interfaces` | Juan | PR-03 | Documento de interfaces: convenciones, estructuras, contratos y ejemplo dorado |
| `feature/core-algebra` | Juan | PR-04 | Álgebra lineal propia y runner de verificaciones |
| `feature/escena` | Estudiante 1 | PR-05 | Módulo escena: piezas, mallas, contenedor y API create_scene / apply_action / get_geometry |
| `feature/camara-proyeccion` | Juan | PR-06 | Módulo proyección: cámara (K, R, t, P), recorte y perspectiva |
| `feature/hito2-prototipo` | Yohan | PR-07 | Hito 2: un contenedor y una pieza proyectados con la matriz de cámara y dibujados en pantalla |
| `feature/entrada` | Yohan | PR-08 | Entrada: teclado y ratón a comandos |
| `feature/homografia` | Juan | PR-09 | Experimento de homografía: derivación, DLT, ruido, paralaje y rotación pura |
| `feature/animacion-base` | Estudiante 1 | PR-10 | Animación: curvas, interpolación de poses y victoria (torre) |
| `feature/hud` | Yohan | PR-11 | HUD: texto de la pieza activa, cámara, matrices y estado |
| `feature/demo` | Yohan | PR-12 | Modo demostración determinista |
| `feature/controlador` | Yohan | PR-13 | Controlador de la aplicación (modos, animaciones, avisos) sin DOM |
| `feature/interfaz-final` | Yohan | PR-14 | Interfaz final: panel de homografía, main definitivo y página principal |
| `docs/informe` | Juan | PR-15 | Informe: cadena de proyección, derivación de la homografía y resultados |
| `feature/pruebas-arquitectura` | Estudiante 1 | PR-16 | Pruebas de arquitectura, grafo de dependencias y runner en el navegador |
| `docs/final` | Estudiante 1 | PR-17 | Documentación final: README, guía de sustentación y declaración de IA |
| `docs/verificacion-linux` | quien pruebe en Linux | PR-18 | resultado real de la verificación en Linux (README) |

## 3. Cómo se incorpora la base preparada, **sin falsear la autoría**

El código y los documentos se prepararon con asistencia de IA y se incorporan **por etapas, en PR revisados** (orden, autores y revisores en [PLAN_INTEGRACION.md](PLAN_INTEGRACION.md)). Para que el historial refleje lo que de verdad pasó:

1. **No** se hace un único *commit* con todo. Cada responsable **lee, ejecuta y entiende** su paquete y lo sube en su rama, desde su cuenta, en *commits* pequeños (uno por archivo o responsabilidad).
2. Todo *commit* que incorpora esa base lleva en el cuerpo la línea estándar: *«Base preparada con asistencia de IA (ver AI_USAGE.md); leída, ejecutada y revisada por <nombre>.»* `AI_USAGE.md` existe desde el primer PR.
3. Las modificaciones propias (correcciones, ajustes, tests nuevos, explicaciones) van en *commits* **separados**, con la cuenta de quien los hizo y un mensaje que diga lo que realmente hizo. El enunciado exige que cada estudiante pueda explicar **y modificar** su módulo en la demostración.
4. Cada PR lo revisa el compañero que corresponde por la rotación (§4); la revisión debe tener comentarios sustantivos (¿se ejecutaron los tests? ¿se verificó el ejemplo dorado? ¿se probó en Linux?). **Un PR se integra solo con la aprobación de ese revisor y el check `tests` en verde.**
5. Las fechas de los *commits* son las reales de cada integración. Está **prohibido** `git commit --date`, `--no-verify`, `push --force` y reescribir historial ya publicado.
6. Integración con ***merge commit* (o *rebase*), nunca *squash***, para conservar los *commits* individuales. Los ajustes del repositorio lo imponen cuando la plataforma lo permite.
7. Cada integrante registra en `AI_USAGE.md` su uso real de IA desde ahora.

**Entorno y CI.** `.github/` contiene la plantilla de PR, la plantilla de tareas y el *workflow* `tests`, que corre en Linux en cada PR y en cada *push* a `main`: tests de Node, tests del navegador (Chrome *headless*) y apertura de la aplicación sin mensajes de consola. Mientras el repositorio está en construcción, esos pasos se omiten solos. El *workflow* **no sustituye** la prueba manual de la aplicación en Linux que exige el enunciado.

**Identidad.** Antes del primer *commit*, cada integrante comprueba `git config user.name` y `git config user.email` (el correo debe estar asociado a su cuenta de GitHub para que los *commits* queden atribuidos). `.gitattributes` fija los saltos de línea a LF para que Windows y Linux no ensucien las revisiones.

## 4. Rotación de revisión

| Autor del PR | Revisor principal |
|---|---|
| Estudiante 1 (A) | Yohan (C revisa a A) |
| Juan (B) | Estudiante 1 (A revisa a B) |
| Yohan (C) | Juan (B revisa a C) |

(Rotación inicial del enunciado: A revisa a B, B revisa a C, C revisa a A. Pueden participar revisores adicionales.)

## 5. Convención de mensajes de *commit*

`<módulo>: <qué cambia y por qué>` — p. ej. `proyeccion: recortar aristas contra z_c ≥ near antes de dividir`. Un commit = un cambio coherente. Enlacen el PR o la tarea (`T6`) en el cuerpo.

## 6. Plantilla de descripción de PR

(La versión vigente está en `.github/PULL_REQUEST_TEMPLATE.md`; GitHub la carga sola al abrir un PR.)

```markdown
## Qué cambia
<resumen en 2–4 líneas; módulo(s) afectado(s)>

## Por qué
<tarea del plan (T#) / problema / requisito del enunciado>

## Cambios de interfaz
- [ ] No cambia contratos
- [ ] Cambia contratos → actualicé docs/INTERFACES.md (§11) y avisé a los módulos afectados

## Evidencia de funcionamiento
- [ ] `node app/tests/run.js` → <pegar la salida final: N correctos, 0 fallidos>
- [ ] `app/tests/index.html` en el navegador: <resultado>
- [ ] Captura / GIF / video corto: <enlace>
- [ ] Probado en: <SO + navegador (indicar si es Linux)>

## Uso de IA
- [ ] No usé IA
- [ ] Usé IA (herramienta, qué parte, cómo lo verifiqué) → registrado en AI_USAGE.md

## Revisión
Revisor/a asignado/a según la rotación: @<compañero>
Comentarios resueltos antes de integrar: [ ]
```

## 7. Plantilla de la declaración de contribuciones

> Entregable: declaración breve de contribuciones de cada estudiante, con enlaces a *commits*, PR y revisiones **representativos**. Completarla solo con enlaces reales.

```markdown
# Declaración de contribuciones

Versión entregada: etiqueta `v[X.Y]` — <URL del repositorio>

## Estudiante 1 — rol A, escena y geometría (cuenta: @[usuario])
- Contribución principal: <qué diseñó/implementó/verificó>
- Commits representativos: <enlace>, <enlace>
- PR propios: <enlace>, <enlace>
- Revisiones realizadas (a Juan): <enlace a la revisión>, <qué se encontró/corrigió>
- Problema de integración que ayudó a resolver: <descripción + enlace>

## Juan — rol B, cámara y proyección (cuenta: @[usuario])
- (misma estructura)

## Yohan — rol C, interfaz y animación (cuenta: @[usuario])
- (misma estructura)

## Seguimiento y coordinación — Estudiante 1
- Plan, cronograma y tablero: <enlace>; actualizaciones semanales: <enlace>

## Uso de IA
Ver AI_USAGE.md. Cambios generados con IA integrados por PR con revisión humana: <enlaces>.
```

## 8. Etiqueta de versión

Al terminar la integración final, crear una etiqueta anotada (`git tag -a v1.0 -m "Entrega final"`) y subirla (`git push origin v1.0`). Es la versión que se entrega junto con la URL del repositorio.
