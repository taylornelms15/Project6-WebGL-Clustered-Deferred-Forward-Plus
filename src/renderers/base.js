import TextureBuffer from './textureBuffer';
import { mat4, vec4, vec3, vec2 } from 'gl-matrix';

export const MAX_LIGHTS_PER_CLUSTER = 100;

export default class BaseRenderer {
  constructor(xSlices, ySlices, zSlices) {
    // Create a texture to store cluster data. Each cluster stores the number of lights followed by the light indices
    this._clusterTexture = new TextureBuffer(xSlices * ySlices * zSlices, MAX_LIGHTS_PER_CLUSTER + 1);
    this._xSlices = xSlices;
    this._ySlices = ySlices;
    this._zSlices = zSlices;
  }

  updateClusters(camera, viewMatrix, scene) {
    // TODO: Update the cluster texture with the count and indices of the lights in each cluster
    // This will take some time. The math is nontrivial...
	//Note: initialized with (15, 15, 15) for relevant renderers
    //For finding tile index in depth, using DOOM method:
    //Z = Near_z * \frac{Far_z}{Near_z}^\frac{slice}{numSlices}
    //Going the opposite way:
    //$slice = \lfloor log(Z) * \frac{numSlices}{log(\frac{Far_z}{Near_z})} - \frac{numSlices*log(Near_z)}{log(\frac{Far_z}{Near_z})} \rfloor$

	let xformedLights = [];
	for(let i = 0; i < MAX_LIGHTS_PER_CLUSTER; i++){
		let posVec = new Float32Array(4);//Eventual TODO: make this function not be garbage
		posVec[0] = scene.lights[i].position[0];
		posVec[1] = scene.lights[i].position[1];
		posVec[2] = scene.lights[i].position[2];
		posVec[3] = 1.0;
		xformedLights[i] = vec4.create();
		vec4.transformMat4(xformedLights[i], posVec, viewMatrix);
		//console.log(scene.lights[i].position);
		//console.log(xformedLights[i]);
	}

	let yMin = -1.0 * (camera.getFilmHeight() / 2.0);
	let xMin = -1.0 * (camera.getFilmWidth() / 2.0);
	let zMin = -1.0 * camera.near;
	let zMax = -1.0 * camera.far;
	//let zTitantic = -1.0 * camera.whereverYouAre;
	let yDelta = camera.getFilmHeight() / this._ySlices;
	let xDelta = camera.getFilmWidth() / this._xSlices;

    for (let z = 0; z < this._zSlices; ++z) {
      for (let y = 0; y < this._ySlices; ++y) {
		let yLo = yMin + yDelta * y;
		let yHi = yMin + yDelta * (y + 1);
        for (let x = 0; x < this._xSlices; ++x) {
          let i = x + y * this._xSlices + z * this._xSlices * this._ySlices;
          // Reset the light count to 0 for every cluster
          this._clusterTexture.buffer[this._clusterTexture.bufferIndex(i, 0)] = 0;

		  let xLo = xMin + xDelta * x;
		  let xHi = xMin + xDelta * (x + 1);

		  //Fill clusterTexture
		  //For each (tile?) cluster, are MAX_LIGHTS_PER_CLUSER + 1 floats at the cluster's coordinate
		  //first float is number of lights at this one, every float after that an index for next light in list
		  // - alternative, set of booleans for "this light present or not" - would work for packing more efficiently, could bitmask inside ints (later)
		  //Clusters are just dividing the screen space
        }
      }
    }

    this._clusterTexture.update();
  }
}
