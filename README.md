# THREE.js Crowd Animation

A demonstration of a THREE.js crowd animation scene.

## The scene

A light bulb swings left to right inside a wooden room, and a group of boids are following the bulb,
as moths would do.
The camera travels around the room with a slow motion when coming closer to the light.

## The crowd settings

I decided of the following parameters to modulate the direction of boids (in order of priority)
* Avoid the collision with the light at all costs
* Pursuie the light
* Avoid collisions between boids
* Ensure boids are moving in the same direction
* Ensure boids are flying close enough to eachother

# How to make it work

To make it work, download the repo, then use the following process: https://threejs.org/docs/index.html#manual/en/introduction/How-to-run-things-locally

To sum it up, just run a localhost on your machine (I personally use python -m http.server), then go to your localhost on your browser and just admire the result.

If you have any suggestion, do not hesitate and leave a comment or a pull request, I'd be happy to add it to the project.
