import { makeRenderLoop, camera, cameraControls, gui, gl } from './init';
import ForwardRenderer from './renderers/forward';
import ForwardPlusRenderer from './renderers/forwardPlus';
import ClusteredRenderer from './renderers/clustered';
import Scene from './scene';
import {SPLITS_XY, SPLITS_Z} from './scene';

const FORWARD = 'Forward';
const FORWARD_PLUS = 'Forward+';
const CLUSTERED = 'Clustered';

const params = {
  renderer: CLUSTERED,
  _renderer: null,
};

setRenderer(params.renderer);

function setRenderer(renderer) {
  switch(renderer) {
    case FORWARD:
      params._renderer = new ForwardRenderer();
      break;
    case FORWARD_PLUS:
      params._renderer = new ForwardPlusRenderer(SPLITS_XY[0], SPLITS_XY[1], SPLITS_Z[0]);
      break;
    case CLUSTERED:
      params._renderer = new ClusteredRenderer(SPLITS_XY[0], SPLITS_XY[1], SPLITS_Z[0]);
      break;
  }
}

gui.add(params, 'renderer', [FORWARD, FORWARD_PLUS, CLUSTERED]).onChange(setRenderer);

const scene = new Scene();
scene.loadGLTF('models/sponza/sponza.gltf');

camera.position.set(-10, 8, 0);
cameraControls.target.set(0, 2, 0);
gl.enable(gl.DEPTH_TEST);

function render() {
  scene.update();
  params._renderer.render(camera, scene);
}

makeRenderLoop(render)();