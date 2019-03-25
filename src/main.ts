import {vec3, vec4, mat4} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Square from './geometry/Square';
import ScreenQuad from './geometry/ScreenQuad';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import LSystem from './lsystem/LSystem';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  'Show pop. density': false,
  'Show terrain elevation': false,
  'Show land vs. water': true,
  'Iterations': 100,
  'Rotation angle': 120
};

let square: Square;
let screenQuad: ScreenQuad;
let lSystem: LSystem;

let highwayT: mat4[] = [];
let roadT: mat4[] = [];

let time: number = 0.0;

let prevIter: number = 100;
let prevRotation: number = 120;


function loadScene() {
  square = new Square();
  square.create();

  // Create terrain map
  screenQuad = new ScreenQuad();
  screenQuad.create();

  // Set up instanced rendering data arrays here.
  // This example creates a set of positional
  // offsets and gradiated colors for a 100x100 grid
  // of squares, even though the VBO data for just
  // one square is actually passed to the GPU
  let offsetsArray = [];
  let colorsArray = [];
  let transform1Array = [];
  let transform2Array = [];
  let transform3Array = [];
  let transform4Array = [];
  let n: number = 1.0;
  for(let i = 0; i < n; i++) {
    for(let j = 0; j < n; j++) {
      offsetsArray.push(i);
      offsetsArray.push(j);
      offsetsArray.push(0);

      transform1Array.push(15.0);
      transform1Array.push(0.0);
      transform1Array.push(0.0);
      transform1Array.push(0.0);

      transform2Array.push(0.0);
      transform2Array.push(10.0);
      transform2Array.push(0.0);
      transform2Array.push(0.0);

      transform3Array.push(0.0);
      transform3Array.push(0.0);
      transform3Array.push(10.0);
      transform3Array.push(0.0);

      transform4Array.push(0.0);
      transform4Array.push(0.0);
      transform4Array.push(0.0);
      transform4Array.push(1.0);

      colorsArray.push(i / n);
      colorsArray.push(j / n);
      colorsArray.push(1.0);
      colorsArray.push(1.0); // Alpha channel
    }
  }
  let offsets: Float32Array = new Float32Array(offsetsArray);
  let colors: Float32Array = new Float32Array(colorsArray);
  let transform1: Float32Array = new Float32Array(transform1Array);
  let transform2: Float32Array = new Float32Array(transform2Array);
  let transform3: Float32Array = new Float32Array(transform3Array);
  let transform4: Float32Array = new Float32Array(transform4Array);
  square.setInstanceVBOs(offsets, colors, transform1, transform2, 
    transform3, transform4);
  square.setNumInstances(n * n); // grid of "particles"
}

function setTransformArrays(transforms: mat4[], col: vec4) {
  // Set up instanced rendering data arrays here.
  // This example creates a set of positional
  // offsets and gradiated colors for a 100x100 grid
  // of squares, even though the VBO data for just
  // one square is actually passed to the GPU

  let offsetsArray = [];
  let colorsArray = [];
  let n: number = 100.0;
  let transform1Array = [];
  let transform2Array = [];
  let transform3Array = [];
  let transform4Array = [];

  // We will no longer need offsets (handled in the transformation array)
  for (let i = 0; i < transforms.length; i++) {
    let T = transforms[i];

    // Dummy - todo, get rid of offsets
    offsetsArray.push(0);
    offsetsArray.push(0);
    offsetsArray.push(0);

    // Column 1
    transform1Array.push(T[0]);
    transform1Array.push(T[1]);
    transform1Array.push(T[2]);
    transform1Array.push(T[3]);

    // Column 2
    transform2Array.push(T[4]);
    transform2Array.push(T[5]);
    transform2Array.push(T[6]);
    transform2Array.push(T[7]);

    // Column 3
    transform3Array.push(T[8]);
    transform3Array.push(T[9]);
    transform3Array.push(T[10]);
    transform3Array.push(T[11]);

    // Column 4
    transform4Array.push(T[12]);
    transform4Array.push(T[13]);
    transform4Array.push(T[14]);
    transform4Array.push(T[15]);

    // Color (brown)
    colorsArray.push(col[0]);
    colorsArray.push(col[1]);
    colorsArray.push(col[2]);
    colorsArray.push(col[3]);
  }

  let offsets: Float32Array = new Float32Array(offsetsArray);
  let colors: Float32Array = new Float32Array(colorsArray);
  let transform1: Float32Array = new Float32Array(transform1Array);
  let transform2: Float32Array = new Float32Array(transform2Array);
  let transform3: Float32Array = new Float32Array(transform3Array);
  let transform4: Float32Array = new Float32Array(transform4Array);

  square.setInstanceVBOs(offsets, colors, transform1, transform2, transform3, transform4);
  square.setNumInstances(transforms.length);
}

function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // Add controls to the gui
  const gui = new DAT.GUI();
  gui.add(controls, 'Show pop. density');
  gui.add(controls, 'Show terrain elevation').listen().onChange(
    function(){
      controls["Show land vs. water"] = false;
      controls["Show terrain elevation"] = true;
    });
  gui.add(controls, 'Show land vs. water').listen().onChange(
    function() {
      controls["Show terrain elevation"] = false;
      controls["Show land vs. water"] = true;
    });
  gui.add(controls, 'Iterations', 10, 200);
  gui.add(controls, 'Rotation angle', 0, 360);


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

  const camera = new Camera(vec3.fromValues(10, 10, 10), vec3.fromValues(0, 0, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.2, 0.2, 0.2, 1);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE); // Additive blending

  const instancedShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/instanced-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/instanced-frag.glsl')),
  ]);

  const flat = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/flat-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/flat-frag.glsl')),
  ]);

  const mapShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/map-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/map-frag.glsl')),
  ]);

  /// *** Render pass to fill our texture
  const textureShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/map-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/map-frag.glsl')),
  ]);

  const texturecanvas = canvas;

  const textureRenderer = new OpenGLRenderer(texturecanvas);

  if (textureRenderer == null) {
    console.log('texture renderer null');
  }

  // Resolution for the L-system
  const width = window.innerWidth; // TODO: do i need to set this ? 
  const height = window.innerHeight;

  textureRenderer.setSize(width, height);
  textureRenderer.setClearColor(0, 0, 0, 1);
  let textureData: Uint8Array = textureRenderer.renderTexture(camera, textureShader, [screenQuad]);

  lSystem = new LSystem("F", 5, 90, highwayT, roadT, width, height, textureData);
  lSystem.expandHighway(100);
  setTransformArrays(highwayT, vec4.fromValues(0.0, 0.0, 0.0, 1.0));
  console.log('Created lSystem');


  // This function will be called every frame
  function tick() {
    camera.update();
    stats.begin();
    instancedShader.setTime(time);
    flat.setTime(time++);
    mapShader.setTime(time++);
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();

    // Pass user input the LSystem
    if (prevIter != controls.Iterations || prevRotation != controls["Rotation angle"]) {
      prevIter = controls.Iterations;
      prevRotation = controls["Rotation angle"];

      // Clear transformation matrices and make a new L-System
      highwayT = [];
      roadT = [];
      lSystem = new LSystem("F", controls.Iterations, controls["Rotation angle"], highwayT, 
                            roadT, width, height, textureData);
      lSystem.expandHighway(controls.Iterations); 
      setTransformArrays(highwayT, vec4.fromValues(0.0, 0.0, 0.0, 1.0));      
    }

    // Pass user input to shaders
    if (controls["Show pop. density"]) {
      mapShader.setShowPopulation(1.0);
    } else {
      mapShader.setShowPopulation(0.0);
    }

    if (controls["Show terrain elevation"]) {
      mapShader.setShowTerrainGradient(1.0);
    } else {
      mapShader.setShowTerrainGradient(0.0);
    }

    if (controls["Show land vs. water"]) {
      mapShader.setShowTerrainBinary(1.0);
    } else {
      mapShader.setShowTerrainBinary(0.0);
    }
    renderer.render(camera, mapShader, [screenQuad]);

    renderer.render(camera, instancedShader, [
      square,
    ]);
    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
    flat.setDimensions(window.innerWidth, window.innerHeight);
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();
  flat.setDimensions(window.innerWidth, window.innerHeight);

  
  // Start the render loop
  tick();
}

main();
