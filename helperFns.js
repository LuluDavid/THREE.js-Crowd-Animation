// INIT FUNCTION: I recommend you to play with the boid motion parameters, it is quite funny

function initParameters() {

	// BULB PARAMETERS : 
	// gravity constant, time, light intensity, pulsation of an approximate simple pendulum (small oscillations hypothesis), motion Ratio to decide
	// of the speed ratio with real life (motionRatio = 1) at max speed, shiftRatio to decide how strong the wire bends around its middle point, and roomSize
	g = 9.81
	t = 0
	lightIntensity = 2
	theta = view.theta0*Math.PI/180;
	length = view.length
	z0 = view.z0
	theorethicalPulse = Math.sqrt(g/length)
	motionRatio = 3
	w0 = theorethicalPulse*motionRatio
	shiftRatio = 1/10
	roomSize = 150

	// BOIDS MOTION PARAMETERS :
	// boids SpeedScale, number of boids, width of repartition of boids at t=0, surrounding distance, minimum distance to light, and continuityRatio, 
	// the proportion of old speed vector kept in the new one
	SpeedScale = 1
	numberOfBoids = 50
	boidSize = 0.4
	startWidth = 200
	surrounding_distance = 1.5
	minDistanceLight = 1.5
	continuityRatio = 0.7

	// CAMERA MOTION PARAMETERS : 
	// up camera motion boolean, period and pulsation of rotation, ellipse axe sizes, initial height, z(t) parameters, proportion of lookAt vectors (see updateCamera)
	goingUp = true
	T = 15
	omega = 2*Math.PI/(60*T)
	a = view.eye[0]
	b = 40
	z1 = view.eye[2]
	zcons = z1
	zstep = (z0-2*z1)/(60*T) 
	p = 1

	// TIME DILATATION PARAMETERS : 
	// alpha = the time dilatation incrementing time, oscillating from maxTimeDilatation to minTimeDilatation at pulse angular speed 
	// (pulse is defined such as it has a T/2 period and reaches minimum at T/4, thus when the camera is the closest to the bulb) with amp Amplitude with an additive
	// constant cons (defined such as its max is maxTimeDilatation, reached every even*T/4 time, and its min is minTimeDilatation, reached every odd*T/4 time)
	alpha = 1
	maxTimeDilatation = 1
	minTimeDilatation = 0.25
	pulse = 4*Math.PI/(60*T)
	amp = (maxTimeDilatation - minTimeDilatation)/2
	cons = maxTimeDilatation - amp

}

function init() {
	initParameters();
	// Build scene
	container = document.getElementById( 'container' );

	view.camera = new THREE.PerspectiveCamera( view.fov, window.innerWidth / window.innerHeight, view.near, view.far );
	view.camera.position.fromArray( view.eye );
	view.camera.up.fromArray( view.up );

	scene = new THREE.Scene();

	// Create bulb mesh attached to a light + a weak ambient hemisphere light 
	let geometry = new THREE.SphereGeometry( 1, 32, 32 );
	var material = new THREE. MeshStandardMaterial({color:0x000000,emissive:0xffffff,emissiveIntensity:lightIntensity});
	bulb = new THREE.Mesh( geometry, material );
	light = new THREE.PointLight(0xF5DCAF,lightIntensity,Infinity,2)
	light.power = lightIntensity*20000
	light.position.set(0,length*Math.sin(theta),z0-length*Math.cos(theta))
	light.add(bulb)
	light.castShadow = true;
	hemiLight = new THREE.HemisphereLight( 0xddeeff, 0x0f0e0d, 0.1 );
	scene.add(hemiLight)
	scene.add(light)

	// Create the wire linking the bulb to the roof
	var curveObject = drawSpline(light.position,{x:0,y:0,z:z0},0xffffff);
	scene.add(curveObject)

	// Create the room
	var room = createRoom(z0)
	scene.add(room)

	//create a group of boids
	boids = new THREE.Group()
	for (let i=0;i<numberOfBoids;i++){
		var boid = addABoid(boidSize,0x110f01,{x:i%2,y:i*startWidth/numberOfBoids-startWidth/2,z:30},boids)
		var bulbPosition = new THREE.Vector3(light.position.x,light.position.y,light.position.z)
		var boidPosition = new THREE.Vector3(boid.position.x,boid.position.y,boid.position.z)
		// initial speed = translation towards the bulb
		boid.speed = bulbPosition.addScaledVector(boidPosition,-1).normalize()
	}
	scene.add(boids)

	// renderer settings
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );

	//realistic lightning renderer
	renderer.physicallyCorrectLights = true;
	renderer.gammaInput = true;
	renderer.gammaOutput = true;
	renderer.shadowMap.enabled = true;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;

	container.appendChild( renderer.domElement );

	animate();
}












// ANIMATE AND UPDATE FUNCTIONS

function animate(){
	// Updating time dilatation parameter, and then the time
	alpha = cons+amp*Math.cos(pulse*t)
	t += alpha


	// Update the camera motion sense (going up for t in [2kT;(2k+1)T] or going down for t in [(2k+1)T;(2k+2)T] for k >= 0)
	if (Math.floor(t/(T*60))%2 == 0){
		if (goingUp == false){
			goingUp=true;
			console.log("going up")
		}
		zcons=z1;
		zstep=(z0-2*z1)/(60*T);
	}
	else if (Math.floor(t/(T*60))%2 == 1){
		if (goingUp == true){
			goingUp=false;
			console.log("going down")
		}
		zcons=z0-z1;
		zstep=(2*z1-z0)/(60*T);
	}

	// Boids update relies on next bulb position, thus update boids positions before bulb position
	animateBoids();
	animateBulb(); 

	// Update the camera position
	animateCamera();

	render();
	requestAnimationFrame( animate );

	
}

function animateBulb(){

	// Recompute theta (motionRatio is an arbitrary parameter set to make the motion realistic)
	theta = Math.PI/180*view.theta0*Math.cos(w0*t/60)
	light.position.set(0,length*Math.sin(theta),z0-length*Math.cos(theta))

	scene.children[2] = drawSpline(light.position,{x:0,y:0,z:z0},0xffffff)
}

function animateBoids(){

	for (let i=0;i<boids.children.length;i++){
		var boid = boids.children[i]
		animateBoid(boid)
	}
}

function animateBoid(boid){
	// Update boid speed to time distortion
	let TemporarySpeedScale = alpha*SpeedScale

	// Get Speed Vector for the first rule (Avoid Obstacle & Pursuit)
	let res = avoidObstacleSpeed(boid,minDistanceLight,continuityRatio)
	let SpeedVector = res[0]
	let NextBulbPosition = res[1]


	// Get Speed Vector for the third rule (Avoid Collision)
	let res2 = avoidCollisionSpeed(boid)
	let SpeedVectorCollision = res2[0]
	let surrounding_boids = res2[1]
	// Add it to the first one
	let SpeedVector2 = SpeedVector.clone().multiplyScalar(1).addScaledVector(SpeedVectorCollision,1).normalize()
	// Check the first rule is still respected
	if (checkObstacleAvoidanceRule(boid,SpeedVector2,NextBulbPosition,minDistanceLight,SpeedScale)){
		SpeedVector = SpeedVector2
	}


	// Get Speed Vector for the fourth rule (Alignment)
	let SpeedVectorAlignment  = ensureAlignmentSpeed(boid,surrounding_boids)
	// Add it to the previous one
	let SpeedVector3 = SpeedVector.clone().addScaledVector(SpeedVectorAlignment,1).normalize()
	// Check the first rule is still respected
	if (checkObstacleAvoidanceRule(boid,SpeedVector3,NextBulbPosition,minDistanceLight,SpeedScale)){
		SpeedVector = SpeedVector3
	}


	// Get Speed Vector for the fifth rule (Cohesion)
	let SpeedVectorCohesion  = ensureCohesionSpeed(boid,surrounding_boids)
	// Add it to the previous one
	let SpeedVector4 = SpeedVector.clone().addScaledVector(SpeedVectorCohesion,0).normalize()
	// Check the first rule is still respected
	if (checkObstacleAvoidanceRule(boid,SpeedVector4,NextBulbPosition,minDistanceLight,SpeedScale)){
		SpeedVector = SpeedVector4
	}

	// Apply the final speed vector to the boid (rotate it towards its direction, then translate it of dilated time speed, and update its speed attribute)
	boid.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),SpeedVector)
	boid.translateY(TemporarySpeedScale)
	boid.speed = SpeedVector
}

function animateCamera(){
	// Ellipse in (Oxy) plan
	x = a*Math.cos(omega*t)
	y = b*Math.sin(omega*t)
	// Linear function upon z direction on a period T (up or down)
	z = zcons+zstep*(t%(T*60))
	view.camera.position.set(x,y,z)
}

function render() {

	updateSize();

	var left = Math.floor( windowWidth * view.left );
	var top = Math.floor( windowHeight * view.top );
	var width = Math.floor( windowWidth * view.width );
	var height = Math.floor( windowHeight * view.height );

	renderer.setViewport( left, top, width, height );
	renderer.setScissor( left, top, width, height );
	renderer.setScissorTest( true );
	renderer.setClearColor( view.background );

	view.camera.aspect = width / height;
	view.camera.updateProjectionMatrix();
	// update the lookAt vector, staring p * bulb position + (1-p) * scene center position 
	view.updateCamera(view.camera,scene,bulb);

	renderer.render( scene, view.camera );
}

function updateSize() {

	if ( windowWidth != window.innerWidth ) {

		windowWidth = window.innerWidth;
		windowHeight = window.innerHeight;

		renderer.setSize( windowWidth, windowHeight );

	}

}










// FUNCTIONS TO BUILD OBJECTS

// Build a Sphere and add it to parentNode
function addASphere(size,clr,position,parentNode,shadows=true){
	let geometry = new THREE.SphereGeometry( size, 32, 32 );
	let material = new THREE. MeshPhongMaterial({color:clr});
	if (shadows == false) {
		material = new THREE. MeshBasicMaterial({color:clr});
	}
	let sphere = new THREE.Mesh( geometry, material );
	sphere.position.set(position.x,position.y,position.z);
	parentNode.add(sphere);
	return sphere; //only for other use, if needed
}

// Build a boid (an open cone from 30° to 150°) and add it to parentNode
function addABoid(size,clr,position,parentNode,shadows=true){
	let curveRatio = 0.5
	let wingGeometry = new THREE.ConeGeometry( size*curveRatio, size, 8 , 1, true, Math.PI/6, 5*Math.PI/6);
	let material = new THREE.MeshPhongMaterial({color:clr, side:THREE.DoubleSide});
	if (shadows == false) {
		material = new THREE.MeshBasicMaterial({color:clr, side:THREE.DoubleSide});
	}
	let boidWings = new THREE.Mesh( wingGeometry, material );
	boidWings.position.set(position.x,position.y,position.z);
	parentNode.add(boidWings);
	return boidWings; //only for other use, if needed
}

// Build a plan with z coordinate fixed and length sizex upon x direction, and sizey upon y direction, with a wooden texture on it
function GeneratePlane(z=0,sizex=roomSize,sizey=roomSize){
	let quadGeometry = new THREE.PlaneBufferGeometry(sizex,sizey)

	let texture = new THREE.TextureLoader().load( 'wood_texture.jpg' );
	let material = new THREE.MeshPhysicalMaterial({map:texture, side: THREE.DoubleSide})
	
	let plane = new THREE.Mesh(quadGeometry,material)
	plane.position.set(0,0,z)
	return plane
}

// Build a spline representing the wire between the roof and the bulb. The new middle point is computed as the middle point shifted orthogonally from the lign by shiftRatio
function drawSpline(beginning,end,clr){
	// Compute y sign to know which way to bend the wire
	let ySign = Math.sign((end.y+beginning.y)/2)
	// Compute the bending strength and multiply per Math.abs(beginning.y) to ensure it decreases as the bulb gets closer to the theta = 0 position, and also to ensure
	// that the shift is null if thete is null (no discontinuity in the wire movement)
	let appliedRatio = -shiftRatio*Math.abs(beginning.y)
	// Compute middle line position vector and the direction vector from the roof to the bulb
	let midVector = new THREE.Vector3( 0, (end.y+beginning.y)/2, (end.z+beginning.z)/2 )
	let positionVector = new THREE.Vector3(0,end.y-beginning.y,end.z-beginning.z)
	// Compute the orthogonal vector to the direction vector (opposite sense to the bending shift)
	let orthogVector = new THREE.Vector3(0,positionVector.z,-positionVector.y).normalize() 


	// Compute the curve passing by the three points
	var curve = new THREE.CatmullRomCurve3( [
		new THREE.Vector3( beginning.x, beginning.y, beginning.z ),
		midVector.clone().addScaledVector(orthogVector,ySign*appliedRatio),
		new THREE.Vector3( end.x, end.y, end.z ),
	]);

	// Build the curve line object
	var points = curve.getPoints( 20 );
	var geometry = new THREE.BufferGeometry().setFromPoints( points );
	var material = new THREE.LineBasicMaterial( { color : clr } );
	
	// Create the final object to add to the scene
	var curveObject = new THREE.Line( geometry, material );
	return curveObject;
}

// Build the room (one roof, one ground, 4 walls)
function createRoom(z0){
	var room = new THREE.Group()
	// Create ground plane
	var ground = GeneratePlane()
	scene.add(ground)

	//create roof
	var roof = GeneratePlane(z = z0)
	scene.add(roof)

	//create walls
	var leftWall = GeneratePlane(z = z0/2,sizex=roomSize,sizey=z0)
	leftWall.translateY(-roomSize/2)
	leftWall.rotateX(Math.PI/2)

	var rightWall = GeneratePlane(z = z0/2,sizex=roomSize,sizey=z0)
	rightWall.translateY(roomSize/2)
	rightWall.rotateX(Math.PI/2)

	var frontWall = GeneratePlane(z = z0/2,sizex=z0,sizey=roomSize)
	frontWall.translateX(-roomSize/2)
	frontWall.rotateY(Math.PI/2)

	var backWall = GeneratePlane(z = z0/2,sizex=z0,sizey=roomSize)
	backWall.translateX(roomSize/2)
	backWall.rotateY(Math.PI/2)

	room.add(rightWall)
	room.add(leftWall)
	room.add(frontWall)
	room.add(backWall)

	return room
}









// CROWD ANIMATION VECTOR CONSTRUCTION
// First rule : follow the bulb if it doesn't lead to collision, otherwise, flee the bulb
function avoidObstacleSpeed(boid,minDistanceLight,continuityRatio){
	// Compute Next Bulb Position
	let length = view.length
	let z0 = view.z0
	let w0 = Math.sqrt(g/length)
	let theta = Math.PI/180*view.theta0*Math.cos(w0*(t+1)*1/20)
	var NextBulbPosition = new THREE.Vector3(0,length*Math.sin(theta),z0-length*Math.cos(theta))

	// Compute Next Boid Position : continuityRatio is the proportion of old speed vector kept in new speed vector
	var boidPosition = new THREE.Vector3(boid.position.x,boid.position.y,boid.position.z)
	var NextBoidSpeed = ((NextBulbPosition.clone().addScaledVector(boidPosition,-1)).multiplyScalar(1-continuityRatio)).addScaledVector(boid.speed,continuityRatio).normalize()
	var NextBoidPosition = boidPosition.clone().addScaledVector(NextBoidSpeed,SpeedScale)

	 // Check if there is no collision with bulb
	if (NextBoidPosition.distanceTo(NextBulbPosition)<=minDistanceLight){
		NextBoidSpeed = boidPosition.clone().addScaledVector(NextBulbPosition,-continuityRatio).addScaledVector(boid.speed,continuityRatio).normalize()
	}
	return [NextBoidSpeed, NextBulbPosition]
}

// Second Rule : avoid collisions bewteen boids
function avoidCollisionSpeed(boid){
	// Get surrounding boids
	let surrounding_boids = surroundingBoids(boid, surrounding_distance)
	let speedVector = new THREE.Vector3(0,0,0)
	let boidPosition = new THREE.Vector3(boid.position.x,boid.position.y,boid.position.z)
	var currentBoidPosition
	for (let i=0;i<surrounding_boids.length;i++){
		currentBoid = surrounding_boids[i]
		currentBoidPosition = new THREE.Vector3(currentBoid.position.x,currentBoid.position.y,currentBoid.position.z)
		speedVector.add(boidPosition.clone().addScaledVector(currentBoidPosition,-1))
	}
	return [speedVector.normalize(),surrounding_boids]
}

// Third Rule : ensure boids tend to have the same alignment
function ensureAlignmentSpeed(boid,surrounding_boids){
	let speedVector = new THREE.Vector3(0,0,0)
	for (let i=0;i<surrounding_boids.length;i++){
		speedVector.add(surrounding_boids[i].speed)
	}
	return speedVector.normalize()
}

// Fourth Rule : ensure boids group has cohesion
function ensureCohesionSpeed(boid,surrounding_boids){
	let averagePositionVector = new THREE.Vector3(0,0,0)
	let boidPosition = new THREE.Vector3(boid.position.x,boid.position.y,boid.position.z)
	for (let i=0;i<surrounding_boids.length;i++){
		currentBoid = surrounding_boids[i]
		currentBoidPosition = new THREE.Vector3(currentBoid.position.x,currentBoid.position.y,currentBoid.position.z)
		averagePositionVector.add(currentBoidPosition)
	}
	averagePositionVector.multiplyScalar(1/surrounding_boids.length)
	let speedVector = averagePositionVector.addScaledVector(boidPosition,-1)
	return speedVector.normalize()
}

// Check if bulb avoidance and pursuit rule is still respected
function checkObstacleAvoidanceRule(boid,SpeedVector,NextBulbPosition,minDistanceLight,SpeedScale){
	// Check if the first rule is still respected
	let boidPosition = new THREE.Vector3(boid.position.x,boid.position.y,boid.position.z)
	let NextBoidPosition = boidPosition.clone().addScaledVector(SpeedVector,SpeedScale)
	return NextBoidPosition.distanceTo(NextBulbPosition)>minDistanceLight

	
}

// Return all the boids surrounding boid (distance from boid inferior to surrounding_distance)
function surroundingBoids(boid, surrounding_distance){

	let res = []
	let boidPosition = new THREE.Vector3(boid.position.x,boid.position.y,boid.position.z)
	var currentBoid, currentBoidPosition, distance
	
	for (let i=0;i<boids.children.length;i++){

		currentBoid = boids.children[i]

		if (currentBoid != boid){

			currentBoidPosition = new THREE.Vector3(currentBoid.position.x,currentBoid.position.y,currentBoid.position.z)
			distance = boidPosition.distanceTo(currentBoidPosition)

			if (distance <= surrounding_distance){
				res.push(currentBoid)
			}
		} 
	}
	return res
}



















console.log("DBG: helperFns.js loaded");
