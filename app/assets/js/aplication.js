var stats;
var camera, scene, renderer,
    material_depth;
var clock = new THREE.Clock();
var targetRotation = 0;
var targetRotationOnMouseDown = 0;
var mouseXOnMouseDown = 0;
var mouseX = 0,
    mouseY = 0;
var mouseDown = false;
var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;
var distance = 100;
var target = new THREE.Vector3(0, 20, -50);
var container = document.getElementById('container');
var ship, group, ground, planet, star_system, hemiLight;
var renderPass, copyPass, effectFocus, composer, hblur, vblur;
var postprocessing = {};
var isAnimating = false;
var meshes = {};




function init() {


    
    //CAMERA    
    camera = new THREE.PerspectiveCamera(20, window.innerWidth / window.innerHeight, 1, 3000);
    camera.position.y = 0;
    camera.position.x = 30;
    camera.position.z = 200;

    // SCENE
    scene = new THREE.Scene();

    // OBJECTS   
    initObjects();

    //RENDERER
    renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false
    });
    renderer.setSize($(window).width(), $(window).height());
    
    if (BrowserDetect.browser != 'Explorer' && BrowserDetect.browser != 'Other') {

        renderer.shadowCameraFov = 20;
        renderer.shadowMapWidth = 1024;;
        renderer.shadowMapHeight = 1024;
        renderer.shadowMapEnabled = true;
        renderer.shadowMapType = THREE.PCFSoftShadowMap;
    }

    container.appendChild(renderer.domElement);
    renderer.sortObjects = false;
    renderer.autoClear = false;

    //POST PROCESSING
    initPostprocessing();
    clock.start();
   // var enabled = true;
    
   // if (BrowserDetect.browser == "Chrome" || BrowserDetect == "Firefox"){
        enabled =  false;
   // }
   // else{
    //    enabled = true;
   // }
    
   // postprocessing.enabled = enabled;

    //GUI CONTROLS
    effectController = {

        sampleDistance: .94,
        enableFXAA: true,
        enableFocus: false,
        enableBloom: true,
        enableFilm: true,
        enableTiltShift: true,
        tiltBlur: 3.5,
        enableVignette: true,
        disableEffects: false
    };

    var matChanger = function () {

        postprocessing.enabled = effectController.disableEffects;

        for (var e in effectController) {

            if (effectFocus && e in effectFocus.uniforms)
                effectFocus.uniforms[e].value = effectController[e];
            else if (vblur && e == 'tiltBlur') {
                var bluriness = effectController[e];
                hblur.uniforms['h'].value = bluriness / window.innerWidth;
                vblur.uniforms['v'].value = bluriness / window.innerHeight;
                hblur.uniforms['r'].value = vblur.uniforms['r'].value = 0.5;
            }
        }
    };

    var gui = new dat.GUI({ autoPlace: false });
    gui.add(effectController, "enableFXAA").onChange(toggleEffects);
    gui.add(effectController, "enableBloom").onChange(toggleEffects);
    gui.add(effectController, "enableFocus").onChange(toggleEffects);
    gui.add(effectController, "sampleDistance", 0.0, 10.0).listen().onChange(matChanger);
    gui.add(effectController, "enableFilm").onChange(toggleEffects);
    gui.add(effectController, "enableTiltShift").onChange(toggleEffects);
    gui.add(effectController, "tiltBlur", 0.0, 10.0).listen().onChange(matChanger);
    gui.add(effectController, "enableVignette").onChange(toggleEffects);
    gui.add(effectController, "disableEffects").onChange(matChanger);    
    gui.close();    
    var customContainer = document.getElementById('guiControls');
    customContainer.appendChild(gui.domElement);

    matChanger();
    toggleEffects();
    


    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('mousedown', onDocumentMouseDown, false);
    document.addEventListener('touchstart', onDocumentTouchStart, false);
    document.addEventListener('MSPointerDown', onMSPointerDown, false);
    document.addEventListener('touchleave', onDocumentTouchLeave, false);
    document.addEventListener('touchmove', onDocumentTouchMove, false);
};



function onWindowResize() {


    SCREEN_WIDTH = window.innerWidth;
    SCREEN_HEIGHT = window.innerHeight;

    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);

    camera.aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
    camera.updateProjectionMatrix();

}

function toggleEffects() {

    composer = new THREE.EffectComposer(renderer);
    var renderModel = new THREE.RenderPass(scene, camera);
    composer.addPass(renderModel);

    

    if (effectController.enableFXAA) {
        var effectFXAA = new THREE.ShaderPass(THREE.FXAAShader);
        var width = window.innerWidth || 2;
        var height = window.innerHeight || 2;
        effectFXAA.uniforms['resolution'].value.set(1 / width, 1 / height);
        composer.addPass(effectFXAA);
    }

    if (effectController.enableFocus) {

        effectFocus = new THREE.ShaderPass(THREE.FocusShader);
        effectFocus.uniforms["screenWidth"].value = window.innerWidth;
        effectFocus.uniforms["screenHeight"].value = window.innerHeight;
        effectFocus.uniforms["sampleDistance"].value = .5;
        effectFocus.uniforms["waveFactor"].value = 0.00100;
        composer.addPass(effectFocus);
    }
    if (effectController.enableFilm) {
        var effectFilm = new THREE.FilmPass(0.1, 0, 448, false);
        composer.addPass(effectFilm);
    }

    if (effectController.enableBloom) {
        var effectBloom = new THREE.BloomPass(0.3);
        composer.addPass(effectBloom);
    }

    if (effectController.enableTiltShift) {

        hblur = new THREE.ShaderPass(THREE.HorizontalTiltShiftShader);
        vblur = new THREE.ShaderPass(THREE.VerticalTiltShiftShader);
        var bluriness = 5;

        hblur.uniforms['h'].value = bluriness / window.innerWidth;
        vblur.uniforms['v'].value = bluriness / window.innerHeight;
        hblur.uniforms['r'].value = vblur.uniforms['r'].value = 0.5;

        composer.addPass(hblur);
        composer.addPass(vblur);
    }

    if (effectController.enableVignette) {

        vignettePass = new THREE.ShaderPass(THREE.VignetteShader);
        vignettePass.uniforms["darkness"].value = 1.2;
        vignettePass.uniforms["offset"].value = 1;
        composer.addPass(vignettePass);
    }


    composer.addPass(copyPass);
    copyPass.renderToScreen = true;

}

function initPostprocessing() {

    //Create Shader Passes
    var renderModel = new THREE.RenderPass(scene, camera);
    copyPass = new THREE.ShaderPass(THREE.CopyShader);
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderModel);
    composer.addPass(copyPass);
    copyPass.renderToScreen = true;

}

function onMSPointerDown(event) {

}

function onDocumentMouseDown(event) {

    event.preventDefault();
    mouseDown = true;
    document.addEventListener('mousemove', onDocumentMouseMove, false);
    document.addEventListener('mouseup', onDocumentMouseUp, false);
    document.addEventListener('mouseout', onDocumentMouseOut, false);

    mouseXOnMouseDown = event.clientX - windowHalfX;
    targetRotationOnMouseDown = targetRotation;

}

function onDocumentMouseMove(event) {

    mouseX = event.clientX - windowHalfX;
    targetRotation = targetRotationOnMouseDown + (mouseX - mouseXOnMouseDown) * 0.02;
}

function onDocumentMouseUp(event) {

    document.removeEventListener('mousemove', onDocumentMouseMove, false);
    document.removeEventListener('mouseup', onDocumentMouseUp, false);
    document.removeEventListener('mouseout', onDocumentMouseOut, false);
    mouseDown = false;
}

function onDocumentMouseOut(event) {

    document.removeEventListener('mousemove', onDocumentMouseMove, false);
    document.removeEventListener('mouseup', onDocumentMouseUp, false);
    document.removeEventListener('mouseout', onDocumentMouseOut, false);
    mouseDown = false;
}

function onDocumentTouchStart(event) {

    if (event.touches.length == 1) {

        event.preventDefault();
        mouseDown = true;
        mouseXOnMouseDown = event.touches[0].pageX - windowHalfX;
        targetRotationOnMouseDown = targetRotation;
    }
}


function onDocumentTouchLeave(event) {

    if (event.touches.length < 1) {
        mouseDown = false;
    }
}

function onDocumentTouchMove(event) {

    if (event.touches.length == 1) {

        event.preventDefault();
        mouseX = event.touches[0].pageX - windowHalfX;
        targetRotation = targetRotationOnMouseDown + (mouseX - mouseXOnMouseDown) * 0.05;
    }
}


function animate() {

    requestAnimationFrame(animate);
    render();    
}

function render() {
    
    var timer = Date.now();//clock.getDelta();//performance.now();
    
    group.rotation.y += (targetRotation - group.rotation.y) * 0.07;
      
    if (planet && star_system) 
        planet.rotation.z = timer * 0.0009;        

    var time = timer * 0.00015;
    //camera.position.x = Math.cos(time) * 100;    
    //camera.lookAt(group.position);
    ship.rotation.y = time * 3;
    star_system.rotation.y = (time * 0.1);
    
    

    if (!postprocessing.enabled) {
        renderer.clear();
        composer.render(0.01);

    } else {

        scene.overrideMaterial = null;
        renderer.clear();
        renderer.render(scene, camera);

    }


}

init();