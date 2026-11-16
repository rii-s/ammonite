import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { config } from './config';
import { createGui } from './gui';
import { ParticleSystem } from './particles/ParticleSystem';

// ---- Renderer --------------------------------------------------------------
// three.js r163+ is WebGL2-only, which gives us float render targets for GPGPU.
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ---- Scene & camera --------------------------------------------------------
const scene = new THREE.Scene();
const background = new THREE.Color(config.render.background);
scene.background = background;

// The shell coils in the XY plane, so looking down -Z shows it face-on.
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.set(1.5, -1.2, 6);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotateSpeed = 0.6;

// ---- Particles -------------------------------------------------------------
let particles = new ParticleSystem(renderer, config);
scene.add(particles.points);

function rebuild(): void {
  scene.remove(particles.points);
  particles.dispose();
  particles = new ParticleSystem(renderer, config);
  scene.add(particles.points);
}

createGui(config, {
  onRebuild: rebuild,
  onScatter: () => particles.scatter(),
});

// ---- Resize ----------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- Render loop -----------------------------------------------------------
const timer = new THREE.Timer();

renderer.setAnimationLoop((timestamp) => {
  timer.update(timestamp);
  // Clamp dt so a backgrounded tab doesn't produce one giant, explosive step.
  const dt = Math.min(timer.getDelta(), 1 / 30);

  controls.autoRotate = config.render.autoRotate;
  controls.update(dt);
  background.set(config.render.background);

  particles.update(config, dt, renderer.getPixelRatio());
  renderer.render(scene, camera);
});
