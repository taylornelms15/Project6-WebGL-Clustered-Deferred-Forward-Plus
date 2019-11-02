import TextureBuffer from './textureBuffer';
import { mat4, vec4, vec3, vec2 } from 'gl-matrix';

export const MAX_LIGHTS_PER_CLUSTER = 6;

function squared(val){return val * val;}
function distBetweenSqrd(point1, point2){
	return (squared(point2[0] - point1[0]) + squared(point2[1] - point1[1])  + squared(point2[2] - point1[2]));
}


function doesSphereEncroachOnCube(cornerArray, center, radius){
	let retval = false;
	let rsquared = radius * radius;
	for(let i = 0; i < 8; i++){
		let thisCorner = cornerArray[i];
		if(distBetweenSqrd(center, thisCorner) < rsquared) {
			return true;
		}
	}

	return retval;
}

export default class BaseRenderer {
  constructor(xSlices, ySlices, zSlices) {
    // Create a texture to store cluster data. Each cluster stores the number of lights followed by the light indices
    this._clusterTexture = new TextureBuffer(xSlices * ySlices * zSlices, MAX_LIGHTS_PER_CLUSTER + 1);
    this._xSlices = xSlices;
    this._ySlices = ySlices;
    this._zSlices = zSlices;
  }

  updateClusters(camera, viewMatrix, scene) {
    // TDO: Update the cluster texture with the count and indices of the lights in each cluster
    // This will take some time. The math is nontrivial...
	//Note: initialized with (15, 15, 15) for relevant renderers
    //For finding tile index in depth, using DOOM method:
    //Z = Near_z * \frac{Far_z}{Near_z}^\frac{slice}{numSlices}
    //Going the opposite way:
    //$slice = \lfloor log(Z) * \frac{numSlices}{log(\frac{Far_z}{Near_z})} - \frac{numSlices*log(Near_z)}{log(\frac{Far_z}{Near_z})} \rfloor$
    var util = require('util');

	let invXform = mat4.create();
	mat4.invert(invXform, viewMatrix);

	let yMin = -1.0 * (camera.getFilmHeight() / 2.0);
	let xMin = -1.0 * (camera.getFilmWidth() / 2.0);
	let zMin = camera.near;
	let zMax = camera.far;
	//let zTitantic = camera.whereverYouAre;
	let yDelta = camera.getFilmHeight() / this._ySlices;
	let xDelta = camera.getFilmWidth() / this._xSlices;

    for (let z = 0; z < this._zSlices; ++z) {
	  let zLo = zMin * Math.pow((zMax / zMin), (z / this._zSlices));
	  let zHi = zMin * Math.pow((zMax / zMin), ((z + 1) / this._zSlices));

      for (let y = 0; y < this._ySlices; ++y) {
		let yLo = yMin + yDelta * y;
		let yHi = yMin + yDelta * (y + 1);
        for (let x = 0; x < this._xSlices; ++x) {
          let i = x + y * this._xSlices + z * this._xSlices * this._ySlices;
          // Reset the light count to 0 for every cluster
		  let bufIdx = this._clusterTexture.bufferIndex(i, 0);
          this._clusterTexture.buffer[bufIdx] = 0;

		  let xLo = xMin + xDelta * x;
		  let xHi = xMin + xDelta * (x + 1);

		  //We'll assume that we've defined a rough cube. This is false, but useful.
		  //As such, we can transform our min/max coords back into world space, and check them against the lights
		  //A better solution would check more than the corners, but fuck that noise.
		  //...ok fine TODO: check against the other interpretation of the cube, too (br to tl)
		  let corner1 = [xLo, yLo, -zLo, 1.0];
		  let corner2 = [xLo, yLo, -zHi, 1.0];
		  let corner3 = [xLo, yHi, -zLo, 1.0];
		  let corner4 = [xLo, yHi, -zHi, 1.0];
		  let corner5 = [xHi, yLo, -zLo, 1.0];
		  let corner6 = [xHi, yLo, -zHi, 1.0];
		  let corner7 = [xHi, yHi, -zLo, 1.0];
		  let corner8 = [xHi, yHi, -zHi, 1.0];
		  let cornerArray = [corner1, corner2, corner3, corner4, corner5, corner6, corner7, corner8];
		  vec4.transformMat4(cornerArray[1], corner2, invXform);
		  vec4.transformMat4(cornerArray[2], corner3, invXform);
		  vec4.transformMat4(cornerArray[3], corner4, invXform);
		  vec4.transformMat4(cornerArray[4], corner5, invXform);
		  vec4.transformMat4(cornerArray[5], corner6, invXform);
		  vec4.transformMat4(cornerArray[6], corner7, invXform);
		  vec4.transformMat4(cornerArray[7], corner8, invXform);

		  let numLights = 0;
		  for(let j = 0; j < MAX_LIGHTS_PER_CLUSTER; j++){
			let lightPos = scene.lights[j].position;
			let radius = scene.lights[j].radius;
			let posVec = [lightPos[0], lightPos[1], lightPos[2], 1.0];
			let doesEncroach = doesSphereEncroachOnCube(cornerArray, posVec, radius);
			if (doesEncroach){
				numLights += 1;
				let wholePart = Math.floor(numLights / 4);
				let lightIndex = this._clusterTexture.bufferIndex(i, wholePart) + numLights % 4;
				this._clusterTexture.buffer[lightIndex] = j;
			}
		  }//for
          this._clusterTexture.buffer[bufIdx] = numLights;

		  //Fill clusterTexture
		  //For each (tile?) cluster, are MAX_LIGHTS_PER_CLUSER + 1 floats at the cluster's coordinate
		  //first float is number of lights at this one, every float after that an index for next light in list
		  // - alternative, set of booleans for "this light present or not" - would work for packing more efficiently, could bitmask inside ints (later)
		  // Clusters are just dividing the screen space
			}
		  }
		}

    this._clusterTexture.update();
  }
}
