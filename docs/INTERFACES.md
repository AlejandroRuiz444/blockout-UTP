# Documento de interfaces

Contrato entre los tres módulos. Si cambia algo aquí, hay que actualizar el código de los módulos afectados **y** el registro de cambios del §11. Todo lo que aparece con valores numéricos está verificado por `app/tests/` (ver §9 y §10).

## 1. Convenciones

### 1.1 Sistemas de coordenadas

| Sistema | Origen | Ejes | Unidades |
|---|---|---|---|
| **Objeto (local)** | esquina de la caja envolvente de la pieza | `X`, `Y`, `Z` de la retícula; el cubo `(i,j,k)` ocupa `[i,i+1]×[j,j+1]×[k,k+1]` | 1 celda = 1 unidad |
| **Mundo** | esquina inferior del contenedor, `(0,0,0)` | mano **derecha**; `X` e `Y` horizontales, **`Z` hacia arriba**. El piso del contenedor es el plano `Z = 0`; el contenedor por defecto ocupa `[0,5]×[0,5]×[0,12]` | 1 celda = 1 unidad |
| **Cámara** | centro óptico `C` | mano derecha, convención "OpenCV": `x_c` a la **derecha**, `y_c` **hacia abajo**, `z_c` **hacia adelante** (eje óptico) | las del mundo |
| **Imagen** | esquina superior izquierda del viewport | `u` a la **derecha**, `v` **hacia abajo** | píxeles |

Como `y_c` y `v` apuntan en el mismo sentido, **`fy > 0`**. (Si se usara `y_c` hacia arriba habría que usar `fy < 0`.)

Mover la cámara **solo** cambia `R, t` y `K`. Las coordenadas del mundo de las piezas no se tocan.

### 1.2 Cadena de transformación (convención columna)

```
λ · [u v 1]ᵀ  =  K · [R | t] · M · [X Y Z 1]ᵀ          con  P = K·[R | t]  (3×4)
```

Orden de aplicación (de derecha a izquierda): objeto → `M` → mundo → `[R|t]` → cámara → `K` → píxeles homogéneos → división por `λ = z_c`.

| Matriz | Dimensión | Significado | Módulo que la construye |
|---|---|---|---|
| `M` | 4×4 | local → mundo, `M = T(p+t)·[R 0; 0 1]·T(−p)` (`p` = pivote local) | escena (`model_matrix`, aplicada en `get_geometry`) |
| `R` | 3×3 | mundo → cámara, ortonormal, `det = +1` | cámara (`build_camera` → `look_at`) |
| `t` | 3 | mundo → cámara, `t = −R·C` | cámara |
| `[R\|t]` | 3×4 | extrínsecos | cámara |
| `K` | 3×3 | intrínsecos `[[fx,0,cx],[0,fy,cy],[0,0,1]]` | cámara |
| `P` | 3×4 | `K·[R\|t]` | cámara |
| `H` | 3×3 | **homografía** entre imágenes de un plano | proyección (`homography.js`) |

### 1.3 Unidades y ángulos

- 1 celda del contenedor = 1 unidad.
- **Todos los ángulos del código y de la API están en RADIANES** (la interfaz de usuario los muestra en grados). Los pasos de rotación de las piezas se expresan en **cuartos de vuelta** (`turns`, enteros), que equivalen a `turns·90°`.
- Pantalla en píxeles. `cx = width/2`, `cy = height/2`, `fy = (height/2)/tan(fov_y/2)`, `fx = fy` (píxeles cuadrados).

### 1.4 Precisión terminológica

- La proyección de la cámara (3D→2D, 3×4) **no es una homografía**.
- Una transformación proyectiva 3D es una matriz 4×4 no singular; las rígidas (`M`) son un caso particular.
- Una **homografía** es una matriz 3×3 entre las imágenes de puntos de un **plano** (p. ej. `Z = 0`).

## 2. Estructuras de datos (todas JSON-friendly)

### 2.1 Definición de pieza (`Scene.PIECE_DEFS[type]`)

```js
{ type: 'SCREW', name: 'Tornillo (3D)', orig: 32, orig_orientations: 12,
  cubes: [[1,0,0],[1,0,1],[0,0,1],[0,1,1]],   // celdas enteras, sistema local
  size: [2,2,2], planar: false, pivot: [1.5,0.5,1.5] }
```

El catálogo vive en `scene/pieces.js`. `orig` es el índice en `allPolyCube[]` de `BlockOut/InitPolyCube.cpp` (referencia; no se modifica el original). **Pivote de rotación**: centro del cubo *ocupado* más cercano al centroide de la pieza (empate: el primero de la lista). Al ser el centro de una celda, sus tres coordenadas son semienteras, y por eso un giro de 90° `R·(c−p)+p` cae exactamente en el centro de otra celda: la rotación respeta la retícula y no se acumulan errores. (El juego original usa otro centro, `(ancho−1, 1, profundidad−1)`; aquí se eligió el centro de un cubo ocupado para conservar exactitud y simetría visual.)

| Tipo | Pieza | Cubos | ¿Plana? | Orientaciones (original) | Pivote local `p` |
|---|---|---|---|---|---|
| `L3` | tricubo L | 3 | sí | 12 | (1.5, 0.5, 0.5) |
| `T4` | tetracubo T | 4 | sí | 12 | (1.5, 0.5, 0.5) |
| `S4` | tetracubo S | 4 | sí | 12 | (1.5, 0.5, 0.5) |
| `O4` | cuadrado 2×2 | 4 | sí | 3 | (0.5, 0.5, 0.5) |
| `SCREW` | tornillo | 4 | **no** | 12 | (1.5, 0.5, 1.5) |
| `CORNER3D` | esquina 3D (trípode) | 4 | **no** | 8 | (1.5, 0.5, 1.5) |
| `I3` | tricubo recto (la más simple) | 3 | sí | 3 | (0.5, 1.5, 0.5) |

El test `escena: nº de orientaciones…` cuenta las orientaciones de cada pieza bajo las 24 rotaciones de la retícula y comprueba que coinciden con `BlockOrientation.h` del juego original (valida que los cubos están bien transcritos).

### 2.2 Pieza en la escena y pose

```js
{ id: 'p5', type: 'SCREW', R: [[1,0,0],[0,1,0],[0,0,1]], t: [3,3,2] }
```

Pose rígida: `X_w = R·(X_l − p) + p + t`, es decir `M = T(p+t)·[R 0;0 1]·T(−p)`. El **pivote en el mundo** es `p + t` (punto fijo de `R`). En estado "de retícula" `R` tiene entradas enteras (matriz de permutación con signos, `det = +1`) y `t` es entera. Las poses intermedias de una animación pueden ser continuas (ver `set_pose`).

### 2.3 Escena (`Scene`)

```js
{ version: 1,
  container: { size: [5,5,12] },
  pieces: [ {id,type,R,t}, ... ],
  active: 'p1',                                   // id de la pieza activa o null
  last: { ok: true, action: 'translate', error: null },   // resultado de la última apply_action
  warnings: [] }                                  // avisos de create_scene
```

### 2.4 Acción (`Action`) — entrada de `apply_action`

| `type` | Campos | Efecto |
|---|---|---|
| `select` | `id` **o** `index` (0-based) | cambia la pieza activa |
| `select_next`, `select_prev` | — | recorre las piezas cíclicamente |
| `translate` | `id?` (por defecto la activa), `delta:[dx,dy,dz]` **enteros** | traslada en la retícula |
| `rotate` | `id?`, `axis:'x'\|'y'\|'z'`, `turns` **entero** | gira `90°·turns` alrededor del eje del **mundo** que pasa por el pivote. Se calcula `R' = round(Rot·R)` (redondeo de las entradas: resultado exacto) |
| `set_pose` | `id`, `R` (3×3), `t` (3) | pose rígida arbitraria (la usan las animaciones). Exige `R` ortonormal con `det = +1` (tolerancia 1e-9) y `t` finita; **no** exige retícula ni límites del contenedor |

`translate` y `rotate` se **rechazan** si la pieza saldría del contenedor, colisionaría con otra pieza o su pose actual no está sobre la retícula.

### 2.5 Geometría 3D (`Geometry3D`) — salida de `get_geometry`

```js
{ objects: [ Object3D, ... ], error: null }

Object3D = { id: 'p5', role: 'piece',        // 'container' | 'grid' | 'axis' | 'piece'
             type: 'SCREW', active: true,    // type solo en piezas
             M: [[…4×4…]],                    // local -> mundo
             vertices_local: [[x,y,z], …],
             vertices:       [[x,y,z], …],    // MUNDO = M · vertices_local
             edges: [[i,j], …] }              // índices en vertices
```

Las aristas de una pieza son sus aristas **visibles unitarias** (se descartan interiores y entre caras coplanares). Los objetos estáticos: `container` (12 aristas del marco), `grid` (rejilla del piso y de las paredes), `axis_x/y/z` (ejes del mundo en el origen, longitud 2).

### 2.6 Cámara

Entrada (`parameters` de `build_camera`, ángulos en radianes):

```js
{ azimuth, elevation, distance, target:[x,y,z], fov_y, near, viewport:{width,height},
  eye?: [x,y,z] }       // opcional: fija el centro de cámara (se ignoran azimuth/elevation/distance)
```

Salida (`Camera`): `{ K, R, t, P, C, near, viewport, intrinsics:{fx,fy,cx,cy}, params, sanitized }`.

**Obtención de `K, R, t`:**

1. Posición: `C = target + distance·(cosφ·cosθ, cosφ·sinθ, sinφ)` con `θ = azimuth`, `φ = elevation`.
2. Look-at propio: `f = normalize(target − C)` (`z_c`), `r = normalize(f × [0,0,1])` (`x_c`), `d = f × r` (`y_c`, hacia abajo), `R = [rᵀ; dᵀ; fᵀ]` (filas), `t = −R·C`. Si `f ∥ Z` se usa `[0,1,0]` como "arriba" alternativo.
3. `fy = (height/2)/tan(fov_y/2)`, `fx = fy`, `cx = width/2`, `cy = height/2`.
4. `P = K·[R|t]`.

Límites (se recortan y se anotan en `sanitized`): `elevation ∈ [−89°, 89°]`, `distance ∈ [0.5, 100]`, `fov_y ∈ [10°, 120°]`, `near ∈ [0.001, 10]`, viewport `∈ [1, 16384]` px.

### 2.7 Primitivas 2D (`DrawPrimitives2D`) — salida de `project`

```js
{ viewport: {width,height},
  lines: [ { id, role, type, active, x1,y1,x2,y2, z1,z2 } ],   // (x,y) = (u,v) en píxeles; z = profundidad z_c de los extremos
  stats: { edges_total, edges_drawn, clipped_near, culled_behind, offscreen, invalid, objects_skipped },
  error: null }
```

## 3. Módulo escena (rol A) — `app/src/scene/` (`pieces.js`, `mesh.js`, `container.js`, `scene.js`)

| Función | Entrada | Salida | Comportamiento ante errores |
|---|---|---|---|
| `create_scene(config?)` | `{size:[W,H,D] enteros 1..64, pieces:[{type, t:[x,y,z] enteros, R?}], active?}`; sin `config` usa `default_config()` (5×5×12, 7 piezas) | `Scene` | **No lanza.** `size` inválido → `[5,5,12]` con aviso; pieza con tipo desconocido, pose no entera/no rígida, fuera del contenedor o solapada → se omite y se anota en `scene.warnings` |
| `apply_action(scene, action)` | `Scene`, `Action` | `Scene` **nueva** (la entrada no se modifica) | **No lanza.** Acción inválida o bloqueada → copia de la escena con las piezas **sin cambios** y `last = {ok:false, error:'…'}`. Si `scene` no es una escena, se devuelve tal cual |
| `get_geometry(scene)` | `Scene` | `Geometry3D` (mundo) | **No lanza.** Escena inválida → `{objects:[], error:'escena inválida'}`. Piezas con pose no rígida o no finita se omiten |
| `model_matrix(piece)` | pieza | `M` 4×4 | auxiliar para la guía/HUD |
| `pivot_world(piece)`, `piece_cells(piece)` | pieza | `p+t`; celdas enteras o `null` si la pose no está en la retícula | auxiliares |

**La escena no sabe nada de cámara, proyección ni pantalla** (el test `arquitectura` lo comprueba por inspección del código).

## 4. Módulo proyección (rol B) — `app/src/projection/` (`camera.js`, `projection.js`, `homography.js`)

| Función | Entrada | Salida | Comportamiento ante errores |
|---|---|---|---|
| `build_camera(parameters)` | ver §2.6 | `Camera` | **No lanza.** Valor no finito → valor por defecto; fuera de rango → recortado; ambos listados en `camera.sanitized`. `eye == target` → se retrocede 1 unidad en −Y |
| `Camera.adjust(params, delta)` | `delta = {d_azimuth, d_elevation, distance_factor, d_fov}` | parámetros nuevos (recortados) | deltas no finitos o factor ≤ 0 se ignoran |
| `project(geometry3D, camera, viewport)` | `Geometry3D`, `Camera`, `{width,height}` | `DrawPrimitives2D` | **No lanza.** Viewport/cámara/geometría inválidos → primitivas vacías con `error`. Vértices NaN/±Inf → arista descartada y contada en `stats.invalid`. Aristas totalmente detrás del plano cercano → `stats.culled_behind` |
| `project_point(X, camera)` | punto mundo `[x,y,z]` | `{ok, u, v, z_cam, X_cam, reason}` | `ok:false` con `reason:'behind_near'` (si `z_c < near`; **no** se divide) o `'invalid'` (NaN/Inf/cámara inválida). Sin `u,v` |
| `clip_segment_near(A, B, near)` | extremos en coords. de cámara | `{A,B,clipped}` o `null` | región visible `z_c ≥ near`; el extremo exterior se sustituye por la intersección `P = A + s(B−A)`, `s=(near−z_A)/(z_B−z_A)` |
| `clip_segment_viewport(x1,y1,x2,y2,w,h)` | píxeles | segmento recortado o `null` | Liang–Barsky |
| `Homography.plane_homography(cam, z0=0)` | `Camera` | `H = K[r1 r2 (z0·r3+t)]` 3×3 o `null` | cámara inválida → `null` |
| `Homography.between_views(c1,c2,z0=0)` | 2 cámaras | `H21 = H2·H1⁻¹` o `null` | `H1` singular → `null` |
| `Homography.dlt(src,dst,{normalize})` | ≥ 4 pares `[u,v]` | `{ok, H, error}` | entradas inválidas/degeneradas → `ok:false`, sin lanzar |
| `Homography.run_experiment(config?)` | opcional | informe (ver INFORME.md) | **No lanza**: `{error:'…'}` |

La proyección **no sabe nada de piezas ni reglas**: recibe vértices y aristas del mundo y una cámara como datos.

## 5. Módulo aplicación (rol C) — `app/src/animation/` y `app/src/ui/`

- **Entrada → acciones** (`Input.map_key`): comandos `{type:'piece', action}`, `{type:'camera', delta}`, `{type:'camera_reset'}`, `{type:'app', op}`. Teclas en el README.
- **Estado de la aplicación** (`Controller.create()`, sin DOM): `dispatch(comando, ahora_ms)` y `tick(ahora_ms) -> View = {scene, camera_params, caption, mode, note, last}`. La `scene` de la vista es la de visualización (con poses intermedias); la lógica solo cambia por `apply_action`.
- **Tiempo → actualizaciones de animación**: funciones puras del tiempo que devuelven acciones `set_pose`: `Motion` (`rotation_action`, `translation_action`, `interpolate_rotation`, `apply_actions`), `Victory.actions(scene, t)` (8 s: vuelo en espiral → torre → giro → regreso) y `Easing` (curvas). Fuera de la ventana de la animación devuelven `[]`/`null` (no lanzan).
- **Demo** (`Demo.state_at(t, scene0, cam0)`): función pura y determinista (ver §7).
- **Pantalla**: `Render` (canvas), `Hud` (texto del panel lateral: funciones puras + montaje en el DOM), `HomographyPanel` y `main.js` (arranque). El flujo de cada fotograma es siempre `escena de visualización → Scene.get_geometry → Camera.build_camera → Projection.project → Render`.

Dependencias (un solo sentido, por capas): `ui → animation → scene, projection → core`; **`scene` y `projection` no se conocen entre sí** (la escena no depende de cámara/proyección y viceversa). Ver [ARQUITECTURA.md](ARQUITECTURA.md).

## 6. Política de errores (resumen)

| Capa | Política |
|---|---|
| `linalg.js` (bajo nivel) | dimensiones incompatibles → `RangeError` (error de programación); matriz singular o con NaN → `null` |
| Funciones públicas de escena, proyección, homografía, animación y demo | **nunca lanzan**; devuelven un valor degradado y un diagnóstico explícito (`last.ok/error`, `warnings`, `sanitized`, `stats`, `error`, `ok:false`, `null`) |
| Interfaz | el bucle de dibujo captura cualquier excepción inesperada, la muestra en el panel de estado y sigue ejecutándose |

## 7. Cómo modifican la escena las acciones del usuario y la animación

- **Usuario**: teclado/ratón → `Input.map_key` → comando → `Scene.apply_action(scene, action)` → nueva escena (estado lógico). Las rotaciones del usuario se animan ~0.24 s (y las traslaciones ~0.14 s, con `set_pose`): mientras dura, se muestra `apply_action(base, set_pose(R(s)))` con `R(s) = Rot(eje, 90°·s)·R₀` (Rodrigues, matriz de rotación real); al terminar, la escena se confirma con la acción `rotate` exacta (entradas redondeadas).
- **Victoria**: en cada fotograma `Victory.actions(scene, t)` devuelve un `set_pose` por pieza (poses 3D rígidas) y se aplican con `apply_action` sobre una *copia* de la escena. Guion (8 s): las piezas salen en espiral alrededor del eje del contenedor, con un arco vertical, mientras su orientación se interpola (geodésica) hasta ensamblarse en una **torre** centrada; la torre gira 360° (cada capa en sentido alterno); y el vuelo se invierte hasta las poses originales. En `t ≥ 8 s` devuelve `[]`: la escena vuelve exactamente a su pose original. La cámara es independiente y sigue activa.
- **Demo**: `Demo.state_at(t, scene0, cam0)` aplica, para cada paso con `t1 ≤ t`, la acción real (`select/translate/rotate`) y, para el paso en curso, una pose intermedia (`set_pose`); después aplica la victoria. La cámara del guion son *deltas* respecto de `cam0`, así que los controles de cámara del usuario se suman a la demo.

## 8. Propiedad del estado

| Estado | Dueño | Quién lo cambia |
|---|---|---|
| Contenedor, piezas, poses, pieza activa (`Scene`) | **escena (A)** | solo `apply_action` (el usuario, la animación y la demo entran por ahí) |
| Parámetros de cámara (acimut, elevación, distancia, FOV) | **aplicación (C)**, que los guarda; el significado y los límites son de **proyección (B)** | `Camera.adjust` / reset |
| `K, R, t, P` | **proyección (B)** | se recalculan en cada fotograma con `build_camera` (no se guardan) |
| Modo (normal/victoria/demo), animación de giro en curso, tiempos | **aplicación (C)** | `main.js` |
| Informe del experimento de homografía | **proyección (B)** | `run_experiment` (función pura) |

## 9. Ejemplo dorado compartido (valores a mano, verificados por los tests `dorado:`)

**Cámara**: `azimuth = −90° (−π/2)`, `elevation = 30° (π/6)`, `distance = 10`, `target = (0,0,0)`, `fov_y = 90° (π/2)`, viewport `640×480`, `near = 0.1`.

- `C = (0, −10·cos30°, 10·sin30°) = (0, −8.660254, 5)`.
- `f = (0, 0.866025, −0.5)`; `r = normalize(f × Z) = (1, 0, 0)`; `d = f × r = (0, −0.5, −0.866025)`.
- `R = [[1, 0, 0], [0, −0.5, −0.866025], [0, 0.866025, −0.5]]`; `t = −R·C = (0, 0, 10)` (el objetivo está en el eje óptico a distancia 10).
- `fy = (480/2)/tan 45° = 240 = fx`; `K = [[240, 0, 320], [0, 240, 240], [0, 0, 1]]`.

**Objeto**: pieza `O4` (pivote `p = (0.5, 0.5, 0.5)`), `R = Rz(90°) = [[0,−1,0],[1,0,0],[0,0,1]]`, `t = (1, 1, 0)`.

- `M = T(p+t)·[R 0; 0 1]·T(−p) = [[0,−1,0,2],[1,0,0,1],[0,0,1,0],[0,0,0,1]]` (la columna de traslación es `p + t − R·p = (1.5,1.5,0.5) − (−0.5,0.5,0.5) = (2,1,0)`).

**Un vértice**:

| Paso | Operación | Resultado |
|---|---|---|
| 1. objeto | `X_l` | `(1, 0, 1)` |
| 2. mundo | `M·[1 0 1 1]ᵀ` | `X_w = (2, 2, 1)` |
| 3. cámara | `R·X_w + t` | `X_c = (2, −1.866025, 11.232051)` (`z_c = √3 + 9.5`) |
| 4. píxeles homogéneos | `K·X_c` | `(4074.2563, 2247.8461, 11.232051)`, `λ = 11.232051` |
| 5. perspectiva | `(u,v) = (p₁/λ, p₂/λ)` | **`(u, v) = (362.734849, 200.127843)`** |

Comprobación compacta: `P·M·[1 0 1 1]ᵀ` da el mismo `λ`, `u`, `v`.

**Caso límite de recorte** (coordenadas de cámara, `near = 0.1`): segmento `A = (1,0,2)`, `B = (1,0,−2)` → cruza el plano cercano en `s = (0.1−2)/(−4) = 0.475` → `B' = (1, 0, 0.1)`; el segmento se conserva (no se descarta) y se proyecta con `z_c = near`.

## 10. Verificaciones asociadas

`node app/tests/run.js` o abrir `app/tests/index.html` ejecutan: álgebra, rotaciones, piezas y rigidez, acciones, geometría, ejemplo dorado, cámara móvil (no altera `get_geometry`), puntos en/ tras el plano de la cámara, recorte, homografía (plano, DLT, ruido, paralaje, rotación pura), victoria, demo y arquitectura.

## 11. Registro de cambios de interfaz

| Fecha | Cambio | Módulos afectados | Responsable |
|---|---|---|---|
| 2026-10-29 | Versión inicial del documento de interfaces (integrada en el PR #21) | todos | Estudiante 1, Juan, Yohan |
| 2026-10-23 | Reorganización en capas (`core`, `scene`, `projection`, `animation`, `ui`); la ficha 7 pasa de `PENT3D` a `I3`; `Anim` se divide en `Easing`, `Motion` y `Victory`; nuevos `Controller` y `Hud`; victoria de 8 s (torre); `Scene.polycube_edges` pasa a `Mesh.polycube_edges` (la API pública de escena, cámara y proyección no cambia) | escena, animación, interfaz | Preparado con Claude Code a petición de un integrante, antes de existir el repositorio (ver `AI_USAGE.md` §2); integrado en el PR #21 |
