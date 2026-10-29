/*
 * manifest.js — fuente única (para Node) del orden de carga de los módulos y de sus capas.
 * Debe coincidir con los <script> de app/index.html (lo comprueba test_architecture.js).
 *
 * Capas (las dependencias solo pueden ir hacia capas con número MENOR; scene y projection no se conocen entre sí):
 *   0 core        álgebra lineal compartida
 *   1 scene       MÓDULO ESCENA (rol A)          1 projection   MÓDULO PROYECCIÓN (rol B)
 *   2 animation   animaciones y demo (rol C)
 *   3 ui          controlador, HUD, dibujo y arranque (rol C)
 */
'use strict';

const MODULES = [
  'core/linalg',
  'scene/pieces', 'scene/mesh', 'scene/container', 'scene/scene',
  'projection/camera', 'projection/projection', 'projection/homography',
  'animation/easing', 'animation/motion', 'animation/victory', 'animation/demo',
  'ui/input', 'ui/render', 'ui/hud', 'ui/controller', 'ui/homography_panel', 'ui/main',
];

// namespace global que exporta cada archivo -> capa
const NAMESPACES = {
  LinAlg: { file: 'core/linalg', layer: 'core' },
  Pieces: { file: 'scene/pieces', layer: 'scene' }, Mesh: { file: 'scene/mesh', layer: 'scene' },
  Container: { file: 'scene/container', layer: 'scene' }, Scene: { file: 'scene/scene', layer: 'scene' },
  Camera: { file: 'projection/camera', layer: 'projection' }, Projection: { file: 'projection/projection', layer: 'projection' },
  Homography: { file: 'projection/homography', layer: 'projection' },
  Easing: { file: 'animation/easing', layer: 'animation' }, Motion: { file: 'animation/motion', layer: 'animation' },
  Victory: { file: 'animation/victory', layer: 'animation' }, Demo: { file: 'animation/demo', layer: 'animation' },
  Input: { file: 'ui/input', layer: 'ui' }, Render: { file: 'ui/render', layer: 'ui' }, Hud: { file: 'ui/hud', layer: 'ui' },
  Controller: { file: 'ui/controller', layer: 'ui' }, HomographyPanel: { file: 'ui/homography_panel', layer: 'ui' },
};

const LEVEL = { core: 0, scene: 1, projection: 1, animation: 2, ui: 3 };

module.exports = { MODULES, NAMESPACES, LEVEL };
