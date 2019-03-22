import {vec3} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Square from './geometry/Square';
import ScreenQuad from './geometry/ScreenQuad';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  'Show pop. density': false,
  'Show terrain elevation': false,
  'Show land vs. water': false,
};

let square: Square;
let screenQuad: ScreenQuad;
let background: ScreenQuad;
let time: number = 0.0;

function loadScene() {
  square = new Square();
  square.create();
  screenQuad = new ScreenQuad();
  background = new ScreenQuad();
  screenQuad.create();
  background.create();

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

  // This function will be called every frame
  function tick() {
    camera.update();
    stats.begin();
    instancedShader.setTime(time);
    flat.setTime(time++);
    mapShader.setTime(time++);
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();

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


    //renderer.render(camera, flat, [screenQuad]);
    //renderer.render(camera, flat, [background]);
    renderer.render(camera, mapShader, [square]);
    // renderer.render(camera, instancedShader, [
    //   square,
    // ]);
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
