# Informe: Blockout desde una cámara móvil

Cadena de proyección, derivación de la homografía, resultados numéricos y limitaciones. Todos los números de las tablas los produce el código (`node app/tests/report.js`); no se editaron a mano. Las convenciones de ejes y unidades están en [INTERFACES.md](INTERFACES.md).

## 1. Cadena de proyección

La escena vive en **coordenadas 3D del mundo** en memoria (módulo escena). La pantalla se calcula a partir de ella:

```
λ·[u v 1]ᵀ = K · [R | t] · M · [X Y Z 1]ᵀ ,    P = K·[R|t]  (3×4)
```

1. **`M` (4×4, local → mundo)**: `M = T(p+t)·[R 0; 0 1]·T(−p)`, con `p` el pivote local de la pieza. Para giros de 90° `R` es una matriz entera, así que los pasos finales caen exactamente en la retícula (`R' = round(Rot·R)`).
2. **`[R | t]` (mundo → cámara)**: look-at propio a partir de la órbita (acimut `θ`, elevación `φ`, distancia `d`, objetivo `T`): `C = T + d(cosφ cosθ, cosφ sinθ, sinφ)`, `f = (T−C)/‖T−C‖`, `r = f×Z/‖f×Z‖`, `y_c = f×r` (hacia abajo), `R = [rᵀ; y_cᵀ; fᵀ]`, `t = −R·C`.
3. **`K`**: `fy = (alto/2)/tan(fov/2) = fx`, `cx, cy` en el centro del viewport; `fy > 0` porque `y_c` y `v` apuntan hacia abajo.
4. **Perspectiva**: `X_c = R·X_w + t`, `p = K·X_c`, `λ = p₃ = z_c`, `(u,v) = (p₁/λ, p₂/λ)`.
5. **Casos límite**: cada arista se recorta contra `z_c ≥ near` **antes** de dividir (la parte visible se conserva); después se recorta contra el viewport (Liang–Barsky). Los vértices NaN/±Infinity descartan la arista; los puntos con `z_c < near` no se dividen.

Mover la cámara solo cambia `R, t` y `K`; los vértices de `get_geometry` no cambian (verificado por tests). La animación de victoria y la demo modifican **poses 3D** (`set_pose`) y pasan por esta misma cadena.

**No es una homografía.** `P` es 3×4 y proyecta 3D → 2D; una transformación proyectiva 3D es una 4×4 no singular (las rígidas son un caso particular); una homografía es una 3×3 entre imágenes de un plano.

## 2. Derivación de la homografía

Sea el plano `Z = z₀` del mundo (el piso del contenedor es `Z = 0`). Un punto del plano es `X = [X, Y, z₀]ᵀ`. Con `P = K[r₁ r₂ r₃ t]`:

```
λ·x = K(r₁X + r₂Y + r₃z₀ + t) = K·[r₁ r₂ (z₀r₃ + t)]·[X Y 1]ᵀ     ⇒     Hᵢ = Kᵢ·[r₁ r₂ (z₀r₃ + tᵢ)]
```

Para `z₀ = 0`: `Hᵢ = Kᵢ[r₁ r₂ tᵢ]`, es decir, **las columnas 1, 2 y 4 de `Pᵢ`** (el código lo comprueba: diferencia 0). `Hᵢ` es 3×3 y no singular mientras el plano no pase por el centro de cámara. Dos vistas del mismo plano:

```
x₁ ~ H₁·[X Y 1]ᵀ ,  x₂ ~ H₂·[X Y 1]ᵀ     ⇒     x₂ ~ H₂·H₁⁻¹·x₁ = H₂₁·x₁
```

**Por qué falla fuera del plano.** `H₂₁` proviene de invertir `H₁`, que asume `Z = z₀`. Dado `x₁`, `H₁⁻¹x₁` es el punto donde el **rayo** de la vista 1 corta el plano, `X₀`. Entonces `H₂₁x₁ = P₂X₀` (verificado numéricamente). Si el punto real `X` tiene `Z ≠ z₀`, `X ≠ X₀` y `P₂X ≠ P₂X₀` salvo que `X₀` y `X` estén sobre un mismo rayo de la cámara 2. Con centros de cámara distintos eso no ocurre: la diferencia es el **paralaje**, que crece con la altura sobre el plano y con la línea base.

**Caso especial: mismo centro de cámara.** Si `C₁ = C₂`, los rayos de las dos cámaras coinciden y `x₂ ~ K₂·R₂₁·K₁⁻¹·x₁` con `R₂₁ = R₂R₁ᵀ`, para **cualquier** punto 3D. En ese caso la `H` inducida por el plano coincide con `K₂R₂₁K₁⁻¹`.

## 3. Resultados numéricos

Configuración (por defecto en `Homography.default_experiment_config`): viewport 640×480 px en ambas vistas; vista 1: acimut −60°, elevación 40°, distancia 15, FOV 40°; vista 2: acimut −5°, elevación 30°, distancia 15, FOV 40°; ambas miran a (2.5, 2.5, 1). Centros: `C₁ = (8.245, −7.451, 10.642)`, `C₂ = (15.441, 1.368, 8.500)`; **línea base = 11.582 unidades**.

Puntos del plano `Z = 0`: 4 para el DLT, (0.6, 0.7), (4.3, 0.9), (3.8, 4.4), (1.1, 3.9), y 6 de comprobación (no usados para estimar). Los 10 están en posición general: el menor área de triángulo entre las 120 ternas posibles es 0.170 (> 0, no hay tres colineales).

`H₂₁` analítica (normalizada con `h₃₃ = 1`):

```
[ 0.19500  -0.86484  442.73151]
[ 0.12873   0.53086   47.53668]
[-0.00091   0.00050    1.00000]
```

### 3.1 Plano `Z = 0`: H analítica vs DLT normalizado (sin ruido)

Error = distancia en px entre `H·x₁` y la proyección real de `X` en la vista 2.

| punto (X, Y, 0) | usado en DLT | x1 (u, v) | x2 real (u, v) | error H analítica [px] | error DLT [px] |
|---|---|---|---|---|---|
| (0.6, 0.7, 0) | sí | (209.40, 290.29) | (244.04, 239.93) | 2.29e-13 | 6.36e-14 |
| (4.3, 0.9, 0) | sí | (356.02, 346.10) | (251.47, 327.39) | 2.34e-13 | 1.02e-13 |
| (3.8, 4.4, 0) | sí | (403.44, 245.07) | (411.09, 304.97) | 2.27e-13 | 5.68e-14 |
| (1.1, 3.9, 0) | sí | (300.25, 222.14) | (369.91, 244.22) | 1.71e-13 | 6.36e-14 |
| (2.2, 0.2, 0) | no | (254.68, 330.35) | (221.95, 274.56) | 2.07e-13 | 1.80e-13 |
| (3.3, 2.1, 0) | no | (341.56, 294.51) | (305.33, 297.19) | 2.84e-13 | 5.68e-14 |
| (1.9, 2.5, 0) | no | (298.41, 263.81) | (317.85, 263.35) | 2.27e-13 | 5.68e-14 |
| (2.7, 3.9, 0) | no | (354.91, 242.04) | (380.33, 278.65) | 1.71e-13 | 0.000 |
| (4.7, 2.7, 0) | no | (408.55, 300.13) | (338.93, 334.58) | 2.27e-13 | 8.04e-14 |
| (0.2, 2.1, 0) | no | (231.10, 250.12) | (297.37, 230.10) | 1.42e-13 | 8.04e-14 |

**RMS** H analítica (10 puntos) = 2.16e-13 px · RMS DLT (10 puntos) = 8.57e-14 px · RMS DLT en los 6 puntos no usados = 9.28e-14 px. Sin la normalización de Hartley, el RMS del DLT en esos 6 puntos es 2.25e-6 px: unos siete órdenes de magnitud peor y ya **por encima** de la tolerancia de 1e-6 px de los tests (más del doble). Por eso el DLT se usa con normalización; con ella, los errores observados son ruido de redondeo en doble precisión.

### 3.2 Ruido gaussiano en las 4 correspondencias del DLT

Se perturban con `N(0, σ²)` las coordenadas `(u, v)` de las 4 correspondencias (en ambas imágenes) y se mide el RMS sobre los 6 puntos de comprobación. Promedio de 300 ensayos por σ, semilla fija (resultados reproducibles).

| σ [px] | RMS medio [px] | desv. típica [px] | RMS/σ |
|---|---|---|---|
| 0 | 9.28e-14 | 5.81e-28 | — |
| 0.1 | 0.186 | 0.066 | 1.86 |
| 0.25 | 0.489 | 0.188 | 1.96 |
| 0.5 | 0.952 | 0.339 | 1.90 |
| 1 | 1.970 | 0.718 | 1.97 |
| 2 | 3.797 | 1.320 | 1.90 |

El error crece de forma aproximadamente **lineal** en σ (RMS ≈ 1.9·σ). Con solo 4 puntos el DLT no tiene redundancia: el ruido de las esquinas se amplifica al extrapolar a los puntos interiores y a los más alejados de las 4 correspondencias.

### 3.3 Fuera del plano: la misma `H₂₁` con puntos `Z > 0`

Los mismos 10 pares `(X, Y)` elevados a altura `Z`; se transforma `x₁` con `H₂₁` y se compara con la proyección real en la vista 2.

| Z | RMS [px] | máximo [px] |
|---|---|---|
| 0.5 | 22.378 | 26.012 |
| 1 | 45.936 | 53.583 |
| 2 | 97.059 | 114.100 |
| 4 | 219.755 | 263.343 |
| 8 | 617.427 | 790.678 |

Detalle para `Z = 2`:

| punto (X, Y, Z) | x2 real (u, v) | x2 predicho por H21 (u, v) | error [px] |
|---|---|---|---|
| (0.6, 0.7, 2.0) | (239.29, 168.55) | (311.75, 205.91) | 81.516 |
| (4.3, 0.9, 2.0) | (246.12, 245.16) | (338.26, 297.78) | 106.107 |
| (3.8, 4.4, 2.0) | (417.83, 225.31) | (516.29, 273.73) | 109.725 |
| (1.1, 3.9, 2.0) | (373.07, 172.27) | (453.95, 210.30) | 89.378 |
| (2.2, 0.2, 2.0) | (215.23, 198.62) | (293.69, 241.67) | 89.491 |
| (3.3, 2.1, 2.0) | (304.27, 218.46) | (393.40, 265.47) | 100.766 |
| (1.9, 2.5, 2.0) | (317.70, 188.85) | (399.84, 230.00) | 91.872 |
| (2.7, 3.9, 2.0) | (384.51, 202.20) | (474.32, 245.94) | 99.891 |
| (4.7, 2.7, 2.0) | (340.43, 251.55) | (440.94, 305.57) | 114.100 |
| (0.2, 2.1, 2.0) | (296.00, 160.08) | (369.41, 195.90) | 81.687 |

El error es de decenas de píxeles incluso a media celda de altura y aumenta de forma monótona con `Z`: la homografía de un plano **no** sirve para puntos fuera de él cuando cambia el centro de cámara.

### 3.4 Mismo centro de cámara (rotación pura)

Vista 2' con el mismo centro `C₁` (distancia entre centros = 0), otra orientación (mira a `T + (3, −2, 2)`) y otra focal (FOV 55°). `H = K₂R₂₁K₁⁻¹`. La `H` inducida por el plano coincide con ella salvo 5.68e-14 (matrices con `h₃₃ = 1`).

| Z | RMS [px] | máximo [px] |
|---|---|---|
| 0 | 8.14e-14 | 1.14e-13 |
| 1 | 9.38e-14 | 1.27e-13 |
| 2 | 9.51e-14 | 1.21e-13 |
| 4 | 8.31e-14 | 1.21e-13 |
| 8 | 8.31e-14 | 1.35e-13 |

Con el mismo centro de cámara la homografía predice correctamente **todos** los puntos 3D (error de redondeo), también los de `Z > 0`: es el único caso en que no hay paralaje.

### 3.5 Visualización en la aplicación

El botón/tecla **Homografía (H)** abre un panel con la vista 1 y la vista 2: puntos reales (verde), predichos por `H₂₁` (cruces y `×`) y el error de paralaje (segmentos rojos); un control deslizante de σ muestra la predicción del DLT con ruido. Permite elegir como vista 2: otra cámara (centros distintos), la cámara principal actual, o rotación pura. Las mismas tablas se imprimen debajo.

## 4. Limitaciones conocidas

- Solo se dibujan aristas (alambre); no hay caras rellenas ni eliminación de líneas ocultas. Con muchas piezas superpuestas la lectura de la profundidad es difícil; se atenúan las aristas lejanas como ayuda visual.
- No hay caída automática, línea completa, puntuación ni sonido (opcionales del enunciado). La detección de colisiones es solo la mínima para las acciones de usuario (límites del contenedor y solape entre piezas); las rotaciones no usan "wall kicks" (si chocan, se rechazan).
- Los pasos de pieza son por retícula entera; las poses continuas existen únicamente durante animaciones.
- Distorsión de lente no modelada (cámara pinhole ideal). El experimento usa puntos sin ruido y ruido gaussiano isótropo e independiente; no se estima la homografía con RANSAC ni con más de 4 puntos en el ruido.
- Los valores numéricos de la tabla dependen de la configuración indicada; con otra cámara cambian los errores, no las conclusiones.
- Verificado en Chrome 156 (headless) sobre Windows 11. En Linux se ejecutó en Ubuntu 24.04 mediante el CI de GitHub (tests de Node y de Chrome headless) y, a mano, en Firefox y Chromium sobre WSL2 (declaración de un integrante); el detalle, y lo que no consta, está en el README. Edge y Safari no se probaron.
