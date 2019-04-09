// Golbal variables used in this program:
var renderer = null,
scene = null,
camera = null,
root = null,
robot_idle = null,
group = null,
killed = false,
raycaster,
mouse = new THREE.Vector2(), CLICKED,
floor = null,
loader = null,
tgaLoader = null,
objLoader = null,
robots = [],
robotsIS = null,
spots = [],
anomations = {},
mixers = [],
started = false,
score = 0,
initialTime = (Date.now()/1000),
elapsedTime = 0,
maxTime = 60,
duration = 10,
spawn = 1,
spawnTime = (Date.now()/1000) + spawn,
ttl = 4,
deleteTime = (Date.now()/1000) + ttl,
currentTime = Date.now()

var animation = "idle"

// When the user presses the "Start" button:
function startGame(){
    // Initializing default values:
    spawnTime = (Date.now()/1000) + spawn
    deleteTime = (Date.now()/1000) + ttl
    currentTime = Date.now()
    initialTime = (Date.now()/1000)
    elapsedTime = 0
    score = 0
    started = true
    updateTimer(maxTime)
    updateScore(0)
    // Removing "Start" button:
    document.getElementById("startButton").style.display = "none"
}

// Once the game is over or the player wants to restart it:
function restartGame(){
    document.getElementById("startButton").style.display = "none"
    startGame()
}

// Event detector:
function onDocumentMouseDown(event){
    event.preventDefault()
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1
    
    // Setting the place where the ray spawns in order to detect clicks
    raycaster.setFromCamera(mouse, camera)
    var intersects = raycaster.intersectObjects( robots, true)

    if (intersects.length > 0){
        if(!killed && !intersects[ 0 ].object.parent.clicked){
            killed = true
            CLICKED = intersects[ 0 ].object
            CLICKED.parent.death.start()
            mixers[mixers.indexOf(CLICKED.parent.mixer)].clipAction(anomations.dead).play()
            CLICKED.parent.clicked = true
            var spotNum = CLICKED.parent.spotN
            
            // Time in game:
            setTimeout(function(){
              spots[spotNum].occupied = false
              robotsIS.remove(CLICKED.parent)
              robots.splice(robots.indexOf(CLICKED.parent), 1)
              score++
              updateScore(score)
              killed = false
            }, 800)
        }
    }
}

// Functions to setting the ground and respawn
function settingGorund(obj){
  this.spawnPlace = obj
  this.occupied = false
}
// The spots where the bot can spawn
function respawn(){
  loadObj(0, -50)
  loadObj(-30, -50)
  loadObj(30, -50)
  loadObj(-60, -50)
  loadObj(60, -50)
}

// Loading the floor:
function loadObj(x, z){
    if(!objLoader)
        objLoader = new THREE.OBJLoader()
    if(!tgaLoader)
        tgaLoader = new THREE.TGALoader()
    
    objLoader.load(
        'models/scifipanel_obj.obj',
        function(object){
            object.traverse( function ( child ){
                if (child instanceof THREE.Mesh){
                    child.castShadow = true
                    child.receiveShadow = true
                }
            })
            floor = new settingGorund(object)
            floor.spawnPlace.scale.set(8,8,8)
            floor.spawnPlace.position.z = z
            floor.spawnPlace.position.x = x
            floor.spawnPlace.position.y = -4
            spots.push(floor)
            scene.add(object)
        })
}

// Kill a robot:
function removeRobot(){
    if(robotsIS.children.length > 0){
      var fled = robotsIS.children[0]
      spots[fled.spotN].occupied = false
      robotsIS.remove(fled)
      robots.splice(robots.indexOf(fled), 1)
    }
}

// The robots can only appear in 5 different spawns. And two robots cannot appear in the same spot
function loadRobot(spot){
    if(spots[spot].occupied)
        return
    // If it's not occupied
    spots[spot].occupied = true
    var newRobot = cloneFbx(robot_idle)
    newRobot.position.x = spots[spot].spawnPlace.position.x
    newRobot.position.z = spots[spot].spawnPlace.position.z
    newRobot.spotN = spot
    newRobot.death = deadAnimation(newRobot)
    newRobot.moving = atackAnimation(newRobot)
    newRobot.clicked = false
    var newmixer = new THREE.AnimationMixer(newRobot)
    newmixer.clipAction(anomations.idle).play()
    mixers.push(newmixer)
    newRobot.mixer = newmixer
    robots.push(newRobot)
    robotsIS.add(newRobot)
}

// Getting the coordenates:
function getSpot(){
    for (var i = 0; i < spots.length; i++)
        if(!spots[i].occupied)
          return i
    return Math.floor(Math.random() * (9))
}

// Loading the robots:
function loadFBX(){
    var loader = new THREE.FBXLoader()
    loader.load( 'models/Robot/robot_run.fbx', function ( object ){
        object.scale.set(0.02, 0.02, 0.02)
        object.position.y -= 4
        object.traverse( function ( child ) {
            if ( child.isMesh ) {
                child.castShadow = true
                child.receiveShadow = true
            }
        } )

        robot_idle = object
        anomations.idle = object.animations[0]
        // If the robot dies:
        loader.load( 'models/Robot/robot_atk.fbx', function ( object ){anomations.dead = object.animations[0]})
    })
}

// If the robot dies it will fall:
function deadAnimation(obj){
    var deadAnimator = new KF.KeyFrameAnimator
    deadAnimator.init({
        interps:
            [
                {
                    keys:[0, .1666, .3322, 0.4988, .6444, .8, 1],
                    values:[
                            { x : 0 },
                            { x : -0.25 },
                            { x : -0.5 },
                            { x : -0.75 },
                            { x : -1.0 },
                            { x : -1.25 },
                            { x : -1.5 },
                            ],
                    target:obj.rotation
                },
            ],
        loop: false,
        duration:duration * 50,
    })
    return deadAnimator
}

// Displacement animation:
function atackAnimation(obj){
    var movingAnimator = new KF.KeyFrameAnimator
    movingAnimator.init({
        interps:
            [
                {
                    keys:[0, 1],
                    values:[
                            { z : obj.position.z + 0, y : 0 },
                            { z : obj.position.z + 100, y : 0 }
                            ],
                    target:obj.position
                },
            ],
        loop: false,
        duration:duration * 500,
    })
    movingAnimator.start()
    return movingAnimator
}

function animate() {
    var now = Date.now()
    var deltat = now - currentTime
    currentTime = now
    var second = (Date.now()/1000)
    elapsedTime = second - initialTime

    if(robot_idle){
        for(var mixer of mixers)
          mixer.update(deltat * 0.001)
    }

    KF.update()

    if((Date.now()/1000) >= spawnTime){
        if(robot_idle)
          loadRobot(getSpot())
        spawnTime += spawn
    }

    if((Date.now()/1000) >= deleteTime){
        removeRobot()
        deleteTime += ttl
    }

    if(elapsedTime > maxTime)
    {
        started = false
        robots = []
        mixers = []
        scene.remove(robotsIS)
        robotsIS = new THREE.Object3D
        scene.add(robotsIS)
        for (var i = 0; i < spots.length; i++)
            spots[i].occupied = false

        updateTimer(0)
        document.getElementById("startButton").innerHTML = "Restart Game"
        document.getElementById("startButton").style.display = "block"
    }
    else
        updateTimer(Math.trunc(maxTime - elapsedTime) + 1)
}

// Update function:
function run() {
    requestAnimationFrame(function() { run()})

        // Render the scene
        renderer.render( scene, camera )

        // Spin the cube for next frame
        if(started)
          animate()
}

function setLightColor(light, r, g, b){
    r /= 255
    g /= 255
    b /= 255

    light.color.setRGB(r, g, b)
}

// Clock in the html:
function updateTimer(time){
    document.getElementById("timer").innerHTML = "Time: "+ time
}

// Score in the html:
function updateScore(num){
    document.getElementById("score").innerHTML = "Score: "+ num
}

// Floor and lights:
var directionalLight = null
var spotLight = null
var ambientLight = null
var mapUrl = "images/floor.jpg"

var SHADOW_MAP_WIDTH = 2048, SHADOW_MAP_HEIGHT = 2048

// Creating the scene, same function as seen in class:
function createScene(canvas) {
    // Create the Three.js renderer and attach it to our canvas
    renderer = new THREE.WebGLRenderer( { canvas: canvas, antialias: true } )

    // Set the viewport size
    renderer.setSize(canvas.width, canvas.height)

    // Turn on shadows
    renderer.shadowMap.enabled = true
    // Options are THREE.BasicShadowMap, THREE.PCFShadowMap, PCFSoftShadowMap
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    // Create a new Three.js scene
    scene = new THREE.Scene()

    // Add  a camera so we can view the scene
    camera = new THREE.PerspectiveCamera( 45, canvas.width / canvas.height, 1, 4000 )
    camera.position.set(0, 80, 65)
    camera.rotation.set(-0.9,0,0)
    scene.add(camera)

    // Create a group to hold all the objects
    root = new THREE.Object3D

    spotLight = new THREE.SpotLight (0xffffff)
    spotLight.position.set(0, 80, 0)
    spotLight.target.position.set(0, -4, 0)
    root.add(spotLight)

    spotLight.castShadow = true

    spotLight.shadow.camera.near = 1
    spotLight.shadow.camera.far = 200
    spotLight.shadow.camera.fov = 45

    spotLight.shadow.mapSize.width = SHADOW_MAP_WIDTH
    spotLight.shadow.mapSize.height = SHADOW_MAP_HEIGHT

    ambientLight = new THREE.AmbientLight ( 0xffffff )
    root.add(ambientLight)

    // Create the objects
    loadFBX()
    respawn()

    // Create a group to hold the objects
    group = new THREE.Object3D
    root.add(group)

    robotsIS = new THREE.Object3D

    // Create a texture map
    var map = new THREE.TextureLoader().load(mapUrl)
    map.wrapS = map.wrapT = THREE.RepeatWrapping
    map.repeat.set(8, 8)
    var color = 0xffffff

    // Put in a ground plane to show off the lighting
    geometry = new THREE.PlaneGeometry(200, 200, 50, 50)
    var mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({color:color, map:map, side:THREE.DoubleSide}))
    mesh.rotation.x = -Math.PI / 2
    mesh.position.y = -4

    // Add the mesh to our group
    group.add( mesh )
    mesh.castShadow = false
    mesh.receiveShadow = true

    // Now add the group to our scene
    scene.add( root )
    scene.add(robotsIS)

    raycaster = new THREE.Raycaster()
    document.addEventListener('mousedown', onDocumentMouseDown)
}