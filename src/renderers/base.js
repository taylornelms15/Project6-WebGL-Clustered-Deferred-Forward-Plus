import TextureBuffer from './textureBuffer';
import { matrix } from 'mathjs'

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

	console.log(viewMatrix);
	let xformedLights = [];
	let viewMat = matrix([[viewMatrix[0], viewMatrix[1], viewMatrix[2], viewMatrix[3]],
						  [viewMatrix[4], viewMatrix[5], viewMatrix[6], viewMatrix[7]],
						  [viewMatrix[8], viewMatrix[9], viewMatrix[10], viewMatrix[11]],
						  [viewMatrix[12], viewMatrix[13], viewMatrix[14], viewMatrix[15]]);
	for(let i = 0; i < MAX_LIGHTS_PER_CLUSTER; i++){
		xformedLights[i] = matrix(viewMatrix) * Vec4(scene.lights[i].position, 1.0);
	}

    for (let z = 0; z < this._zSlices; ++z) {
      for (let y = 0; y < this._ySlices; ++y) {
        for (let x = 0; x < this._xSlices; ++x) {
          let i = x + y * this._xSlices + z * this._xSlices * this._ySlices;
          // Reset the light count to 0 for every cluster
          this._clusterTexture.buffer[this._clusterTexture.bufferIndex(i, 0)] = 0;
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