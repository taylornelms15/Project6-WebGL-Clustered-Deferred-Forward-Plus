WebGL Clustered and Forward+ Shading
======================

**University of Pennsylvania, CIS 565: GPU Programming and Architecture, Project 5**

* Taylor Nelms
  * [LinkedIn](https://www.linkedin.com/in/taylor-k-7b2110191/), [twitter](https://twitter.com/nelms_taylor)
* Tested on: Windows 10, Intel i3 Coffee Lake 4-core 3.6GHz processor, 16GB RAM, NVidia GeForce GTX1650 4GB

### Live Online

[![](img/thumb.png)](http://TODO.github.io/Project5B-WebGL-Deferred-Shading)

### Demo Video/GIF

[![](img/video.png)](TODO)

### Tiled Clustered Renderer

These renderers operate on the idea that, for a given spatial region, only a few lights will have a noticeable effect on the shading of objects in that region. A pre-pass is done to correlate each tile/cluster with a number of lights in the scene. Then, in the fragment shaders themselves, shading is only computed between fragments and the lights that may affect its cluster.

The difference between the Forward+ renderer and the Deferred-Clustered renderer in this project is that the Forward+ renderer does all its memory accesses and shading calculations in a single fragment shader. For the Deferred-Clustered renderer, one fragment shader will write various geometric data for each fragment to a buffer, and then will pass that buffer to the second fragment shader which calculates the effects of each light on that particular fragment.

#### Tile Splits

By default, we split the scene into 15x15x15 tiles, logarithmically in the Z direction, and linearly in the X and Y directions. For our test scene, the tile that each fragment was put into can be seen in the following image; its X index is represented by the red component, Y by green, and Z by blue:

![15 split](img/tilemap_15.png)

That said, other tile split sizes were possible. We could go with fewer tiles (7 shown here):

![7 split](img/tilemap_7.png)

Or more tiles (23 shown here):

![23 split](img/tilemap_23.png)

### Performance Analysis

In comparing my implementation of the Forward+ renderer and a Deferred-Clustered renderer, I actually had an issue finding situations where the Forward+ renderer performed better. It may be due to the testing centering purely on a single geometric model, but the Clustered renderer was faster in pretty much every implementation I had.

A note about all the performance analysis graphs: I was unable to uncap Chrome from a 60fps maximum, and the question posted on Piazza was unresolved at time of writing. As such, all of my graphs top out around 60fps, and I have focused on tuning parameters so that renderer performance ranges from a smooth 60fps down to infuriating slow-the-rest-of-my-computer-down-in-the-process sub-8fps speeds.

#### Light Count

For this scene, there were a few parameters I ended up tuning. One of the most basic ones was the number of lights in the scene. Unsurprisingly, as the number of lights increased, the framerate of the rendered scene decreased.

![Effect of Light Count on Renderer Speed](img/Effect_of_Light_Count_on_Renderering_Speed.png)

As you can see, the Clustered renderer performed significantly better, able to handle more lights before its inevitable decline to unusability.

##### Optimization

I did one particular optimization outside of the normal: I allowed for the maximum number of lights affecting a cluster to be fewer than the maximum number of lights affecting a scene. This was risky, because there was the real chance that more lights would affect a fragment in a cluster than the data structure would allow, but it let me avoid some significant overhead in both how many light indices needed to be passed into a cluster, and how many times a fragment shader might loop over the lights potentially affecting it. This is more relevant with how much loop unrolling and paralellization is going on under the hood, since many shaders likely would go through a worst-case loop length even without that many lights affecting them.

The risks when the numbers were off is that we would end up seeing strange artifacting of tiles lighting up when they had no reasonable business doing so. However, even for large numbers of lights, I found that assuming each cluster would be affected at maximum by half the lights in the scene allowed me to push the number of lights in the scene even higher:

![Effect of Light Count on Rendering Speed fewer lights in cluster](img/Effect_of_Light_Count_on_Renderer_Speed_(fewer_lights_allowed_in_cluster).png)

#### Tile Division

The way in which I split the clustering tiles up also had an effect on rendering speed. This is where I actually noticed a difference between how the Forward+ and the Clustered renderer handled things. For the clustered renderer, the tile splits ended up mattering significantly for performance. However, the Forward+ renderer maintained steady performance across wide ranges of tile divisions.

![Effect of Tile Split Dimensions on Renderer Speed All Dimensions](img/Effects_of_Tile_Split_Dimensions_on_Renderer_Speed_-_All_Dimensions.png)

![Effect of Tile Split Dimensions on Renderer Speed Z Dimension](img/Effects_of_Tile_Split_Dimensions_on_Renderer_Speed_-_Z_Dimension.png)

I did the experiment with both variations in how all dimensions were split, and also with just modifying the split in the Z dimension. We can see that the Forward+ renderer stays steady through multiple variations, while the Clustered renderer has some peak areas, and falls off on either side of them.

#### Light Radius

The radius of each light the model also had an effect on renderer speed; as each light became bigger or smaller, it ends up affecting more clusters of fragments, meaning that the computational workload for each fragment is potentially drastically increased.

I had to measure this performance across different domains of light count in order to both (a) get useful data, and (b) not crash my computer with abysmally slow operation in the worst cases. As such, this graph is a bit messy; the color is correlated to light radius, and line type is correlated to which renderer I used for each run.

![Effect of Light Radius on Renderer Speed](img/Effects_of_Light_Radius_on_Renderer_Speed.png)

As you can see, smaller lights yielded much higher rendering speeds.

### Feature List (for pull request)

Forward+ Renderer
Deferred-Clustered Renderer
Blinn-Phong Rendering Model
Optimization - allow for difference in max lights per cluster and number of lights


### Credits

* [Three.js](https://github.com/mrdoob/three.js) by [@mrdoob](https://github.com/mrdoob) and contributors
* [stats.js](https://github.com/mrdoob/stats.js) by [@mrdoob](https://github.com/mrdoob) and contributors
* [webgl-debug](https://github.com/KhronosGroup/WebGLDeveloperTools) by Khronos Group Inc.
* [glMatrix](https://github.com/toji/gl-matrix) by [@toji](https://github.com/toji) and contributors
* [minimal-gltf-loader](https://github.com/shrekshao/minimal-gltf-loader) by [@shrekshao](https://github.com/shrekshao)
