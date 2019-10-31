import TextureBuffer from './textureBuffer';
import { mat4, vec4, vec3, vec2 } from 'gl-matrix';

export const MAX_LIGHTS_PER_CLUSTER = 100;

function squared(val){return val * val;}

function doesSphereEncroachOnCube(corner1, corner2, center, radius){
	var dist_squared = radius * radius;
    if (center[0] < corner1[0]) dist_squared -= squared(center[0] - corner1[0]);
    else if (center[0] > corner2[0]) dist_squared -= squared(center[0] - corner2[0]);
    if (center[1] < corner1[1]) dist_squared -= squared(center[1] - corner1[1]);
    else if (center[1] > corner2[1]) dist_squared -= squared(center[1] - corner2[1]);
    if (center[2] < corner1[2]) dist_squared -= squared(center[2] - corner1[2]);
    else if (center[2] > corner2[2]) dist_squared -= squared(center[2] - corner2[2]);

	return dist_squared > 0;
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
		  let blCorner = [xLo, yLo, zLo, 1.0];
		  let trCorner = [xHi, yHi, zHi, 1.0];
		  vec4.transformMat4(blCorner, blCorner, invXform);
		  vec4.transformMat4(trCorner, trCorner, invXform);


		  let numLights = 0;
		  for(let j = 0; j < MAX_LIGHTS_PER_CLUSTER; j++){
			let lightPos = scene.lights[j].position;
			let radius = scene.lights[j].radius;
			let posVec = [lightPos[0], lightPos[1], lightPos[2], 1.0];
			let doesEncroach = doesSphereEncroachOnCube(blCorner, trCorner, posVec, radius);
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
