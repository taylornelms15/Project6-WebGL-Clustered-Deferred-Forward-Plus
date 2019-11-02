export default function(params) {
  return `
  // TODO: This is pretty much just a clone of forward.frag.glsl.js

  #version 100
  precision highp float;

  uniform sampler2D u_colmap;
  uniform sampler2D u_normap;
  uniform sampler2D u_lightbuffer;

  // TODO: Read this buffer to determine the lights influencing a cluster
  uniform sampler2D u_clusterbuffer;

  uniform mat4 u_viewMatrix;
  uniform ivec3 u_numslices;
  uniform vec4 u_filmextents;/*0: width, 1: height, 2: near, 3: far */ 

  varying vec3 v_position;
  varying vec3 v_normal;
  varying vec2 v_uv;

  vec3 applyNormalMap(vec3 geomnor, vec3 normap) {
    normap = normap * 2.0 - 1.0;
    vec3 up = normalize(vec3(0.001, 1, 0.001));
    vec3 surftan = normalize(cross(geomnor, up));
    vec3 surfbinor = cross(geomnor, surftan);
    return normap.y * surftan + normap.x * surfbinor + normap.z * geomnor;
  }

  struct Light {
    vec3 position;
    float radius;
    vec3 color;
  };

  float ExtractFloat(sampler2D texture, int textureWidth, int textureHeight, int index, int component) {
    float u = float(index + 1) / float(textureWidth + 1);
    int pixel = component / 4;
    float v = float(pixel + 1) / float(textureHeight + 1);
    vec4 texel = texture2D(texture, vec2(u, v));
    int pixelComponent = component - pixel * 4;
    if (pixelComponent == 0) {
      return texel[0];
    } else if (pixelComponent == 1) {
      return texel[1];
    } else if (pixelComponent == 2) {
      return texel[2];
    } else if (pixelComponent == 3) {
      return texel[3];
    }
  }

  Light UnpackLight(int index) {
    Light light;
    float u = float(index + 1) / float(${params.numLights + 1});
    vec4 v1 = texture2D(u_lightbuffer, vec2(u, 0.3));
    vec4 v2 = texture2D(u_lightbuffer, vec2(u, 0.6));
    light.position = v1.xyz;

    // LOOK: This extracts the 4th float (radius) of the (index)th light in the buffer
    // Note that this is just an example implementation to extract one float.
    // There are more efficient ways if you need adjacent values
    light.radius = ExtractFloat(u_lightbuffer, ${params.numLights}, 2, index, 3);

    light.color = v2.rgb;
    return light;
  }

  // Cubic approximation of gaussian curve so we falloff to exactly 0 at the light radius
  float cubicGaussian(float h) {
    if (h < 1.0) {
      return 0.25 * pow(2.0 - h, 3.0) - pow(1.0 - h, 3.0);
    } else if (h < 2.0) {
      return 0.25 * pow(2.0 - h, 3.0);
    } else {
      return 0.0;
    }
  }

  /* $slice = \lfloor log(Z) * \frac{numSlices}{log(\frac{Far_z}{Near_z})} - \frac{numSlices*log(Near_z)}{log(\frac{Far_z}{Near_z})} \rfloor$ */
  int indexZ(float near, float far, int numslices, float pos){
	float logFarOverNear = log(far / near); 
	float sliceNum = log(pos) * (float(numslices) / logFarOverNear) - ((float(numslices) * log(near)) / logFarOverNear);
	return int(sliceNum);
  }

  int indexLinear(float min, float width, int numslices, float pos){
	float percentageAcross = (pos - min) / width;
	return int(percentageAcross * float(numslices));
  }

  ivec3 index3ForScreenPosition(vec3 screenPos){
	float xMin = -1.0 * (u_filmextents.x / 2.0);
	float yMin = -1.0 * (u_filmextents.y / 2.0);
	float z = -1.0 * screenPos.z;
	int xIndex = indexLinear(xMin, u_filmextents.x, u_numslices.x, screenPos.x);
	int yIndex = indexLinear(yMin, u_filmextents.y, u_numslices.y, screenPos.y);
	int zIndex = indexZ(u_filmextents.z, u_filmextents.w, u_numslices.z, z);
	return ivec3(xIndex, yIndex, zIndex);
  }

  int indexForScreenPosition(vec3 screenPos){
  
	return 0;
  }

  void main() {
    vec3 albedo = texture2D(u_colmap, v_uv).rgb;
    vec3 normap = texture2D(u_normap, v_uv).xyz;
    vec3 normal = applyNormalMap(v_normal, normap);

    vec3 fragColor = vec3(0.0);

    //Note: gl_FragCoord's z component has some kind of screen-space depth in it
	vec4 screenSpaceCoord = u_viewMatrix * vec4(v_position, 1.0);
	ivec3 indices = index3ForScreenPosition(screenSpaceCoord.xyz);
    for (int i = 0; i < ${params.numLights}; ++i) {
      Light light = UnpackLight(i);
      float lightDistance = distance(light.position, v_position);
      vec3 L = (light.position - v_position) / lightDistance;

      float lightIntensity = cubicGaussian(2.0 * lightDistance / light.radius);
      float lambertTerm = max(dot(L, normal), 0.0);

      fragColor += albedo * lambertTerm * light.color * vec3(lightIntensity);
    }
	//fragColor.x = float(indices.x) / float(u_numslices.x);
	//fragColor.y = float(indices.y) / float(u_numslices.y);
	//fragColor.z = float(indices.z) / float(u_numslices.z);

    const vec3 ambientLight = vec3(0.025);
    fragColor += albedo * ambientLight;

    gl_FragColor = vec4(fragColor, 1.0);
  }
  `;
}
