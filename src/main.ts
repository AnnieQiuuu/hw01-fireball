import {vec3} from 'gl-matrix';
import {vec4} from 'gl-matrix';
const Stats = require('stats-js');
import * as DAT from 'dat.gui';
import Icosphere from './geometry/Icosphere';
import Square from './geometry/Square';
import Cube from './geometry/Cube';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  tesselations: 5,
  transparency: 0.85,
  bias: 0.03,
  'Load Scene': loadScene, // A function pointer, essentially
};

let icosphere: Icosphere;
let square: Square;
let cube: Cube;
let prevTesselations: number = 5;
let prevBias: number = 0.03;
let prevColor1: number[] = [ 0, 128, 255 ];
let prevColor2: number[] = [ 0, 128, 255 ];
let time: number = 0;
let background: Icosphere;

function loadScene() {
  icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, controls.tesselations);
  icosphere.create();
  square = new Square(vec3.fromValues(0, 0, 0));
  square.create();
  cube = new Cube(vec3.fromValues(0, 0, 0));
  cube.create();
  background = new Icosphere(vec3.fromValues(0, 0, 0), 1.21, controls.tesselations);
  background.create();
}

function main() {
  // Initial display for framerate

  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);
  
  // references to the dat.gui example
  var colors = { 
    outFireCol: [ 255, 255, 255 ], // RGB array
     // RGB array
  };

  var colors2 = {
    inFireCol: [ 255, 0, 0 ],
  };

  function resetParameters() {
    controls.tesselations = 5;
    controls.transparency = 0.85;
    controls.bias = 0.03;
    // Reset color values to their default
    colors.outFireCol = [255, 255, 255]; 
    colors2.inFireCol = [255, 0, 0]; 
    outColor = vec4.fromValues(colors.outFireCol[0]/255, colors.outFireCol[1]/255, colors.outFireCol[2]/255, 1);
    inColor = vec4.fromValues(colors2.inFireCol[0]/255, colors2.inFireCol[1]/255, colors2.inFireCol[2]/255, 1);
  
    loadScene();
    gui.updateDisplay();
  }

  // Add controls to the gui
  const gui = new DAT.GUI();
  gui.add(controls, 'tesselations', 0, 8).step(1);
  gui.addColor(colors, 'outFireCol');
  gui.addColor(colors2, 'inFireCol');
  gui.add(controls, 'transparency', 0.7, 1);
  gui.add(controls, 'bias', 0, 0.1);
  gui.add({ reset: resetParameters }, 'reset');
  var outColor = vec4.fromValues(colors.outFireCol[0]/255,colors.outFireCol[1]/255,colors.outFireCol[2]/255,1);
  var inColor = vec4.fromValues(colors2.inFireCol[0]/255,colors2.inFireCol[1]/255,colors2.inFireCol[2]/255,1);

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();

  const camera = new Camera(vec3.fromValues(0, 0, 5), vec3.fromValues(0, 0, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.2, 0.2, 0.2, 1);
  gl.enable(gl.DEPTH_TEST);

  const custom = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/custom-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/custom-frag.glsl')),
  ]);

  const fire = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/fire-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/fire-frag.glsl')),
  ]);

  const flat = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/flat-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/flat-frag.glsl')),
  ]);

  const currentShader = custom;

  // This function will be called every frame
  function tick() {
    time++;

    camera.update();
    stats.begin();
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    if(controls.tesselations != prevTesselations)
    {
      prevTesselations = controls.tesselations;
      icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, prevTesselations);
      icosphere.create();
    }

    //check if the color has changed
    if(colors.outFireCol != prevColor1){
      prevColor1 = colors.outFireCol;
      outColor = vec4.fromValues(colors.outFireCol[0]/255,colors.outFireCol[1]/255,colors.outFireCol[2]/255,1);
      //currentShader.setGeometryColor(outColor);
      fire.setGeometryColor(outColor);
    }

    if(colors2.inFireCol != prevColor2){
      prevColor2 = colors2.inFireCol;
      inColor = vec4.fromValues(colors2.inFireCol[0]/255,colors2.inFireCol[1]/255,colors2.inFireCol[2]/255,1);
      currentShader.setGeometryColor(outColor);
      //fire.setGeometryColor(inColor);
    }


    if(controls.bias != prevBias)
    {
      prevBias = controls.bias;
      currentShader.setBias(controls.bias);
      fire.setBias(controls.bias);
    }

    currentShader.setTime(time);
    fire.setTime(time);
    flat.setTime(time);

    // Enable transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    
   gl.disable(gl.DEPTH_TEST);  
    renderer.render(camera, flat, [
      square,
    ], outColor, 1.0);
   gl.enable(gl.DEPTH_TEST); 

   renderer.render(camera, currentShader, [
    icosphere,
  ],inColor, controls.transparency * 1.02);

    renderer.render(camera, fire, [
      icosphere,
    ],outColor, controls.transparency);
    


    stats.end();


    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  // Start the render loop
  tick();
}

main();
