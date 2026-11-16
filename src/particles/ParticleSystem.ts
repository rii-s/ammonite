import * as THREE from 'three';
import {
  GPUComputationRenderer,
  type Variable,
} from 'three/examples/jsm/misc/GPUComputationRenderer.js';

import type { Config } from '../config';
import { createSeeds, fillInitialPositions, fillInitialVelocities } from './initPositions';

import velocityShader from '../shaders/compute/velocity.frag.glsl';
import positionShader from '../shaders/compute/position.frag.glsl';
import particleVertexShader from '../shaders/render/particle.vert.glsl';
import particleFragmentShader from '../shaders/render/particle.frag.glsl';

/**
 * GPGPU particle system.
 *
 * Data flow each frame:
 *   1. velocity pass  (velocity.frag.glsl) reads position+velocity → writes velocity
 *   2. position pass  (position.frag.glsl) reads position+velocity → writes position
 *   3. render         (particle.vert.glsl) reads the position texture per vertex
 *
 * Positions/velocities live in float textures of size N×N (one texel per
 * particle) that GPUComputationRenderer ping-pongs between two render targets.
 */
export class ParticleSystem {
  readonly points: THREE.Points;
  readonly count: number;

  private readonly size: number;
  private readonly gpuCompute: GPUComputationRenderer;
  private readonly positionVar: Variable;
  private readonly velocityVar: Variable;
  private readonly seedTexture: THREE.DataTexture;
  private readonly material: THREE.ShaderMaterial;
  private readonly geometry: THREE.BufferGeometry;
  private time = 0;

  constructor(renderer: THREE.WebGLRenderer, config: Config) {
    this.size = config.textureSize;
    this.count = this.size * this.size;

    // ---- Compute setup ------------------------------------------------------
    this.gpuCompute = new GPUComputationRenderer(this.size, this.size, renderer);

    const pos0 = this.gpuCompute.createTexture();
    const vel0 = this.gpuCompute.createTexture();
    fillInitialPositions(pos0.image.data as Float32Array);
    fillInitialVelocities(vel0.image.data as Float32Array);

    // The variable name becomes the sampler uniform name inside the shaders.
    this.velocityVar = this.gpuCompute.addVariable('textureVelocity', velocityShader, vel0);
    this.positionVar = this.gpuCompute.addVariable('texturePosition', positionShader, pos0);

    // Both passes may read both textures.
    this.gpuCompute.setVariableDependencies(this.velocityVar, [this.positionVar, this.velocityVar]);
    this.gpuCompute.setVariableDependencies(this.positionVar, [this.positionVar, this.velocityVar]);

    // Static per-particle random numbers (a plain DataTexture, not simulated).
    this.seedTexture = new THREE.DataTexture(
      createSeeds(this.count),
      this.size,
      this.size,
      THREE.RGBAFormat,
      THREE.FloatType,
    );
    this.seedTexture.needsUpdate = true;

    Object.assign(this.velocityVar.material.uniforms, {
      tSeed: { value: this.seedTexture },
      uTime: { value: 0 },
      uDelta: { value: 0 },
      uSize: { value: 0 },
      uGrowthRate: { value: 0 },
      uWhorls: { value: 0 },
      uTubeRatio: { value: 0 },
      uWhorlWidth: { value: 0 },
      uRibsPerWhorl: { value: 0 },
      uRibAmplitude: { value: 0 },
      uRibSharpness: { value: 0 },
      uRibClumping: { value: 0 },
      uOuterBias: { value: 0 },
      uShellThickness: { value: 0 },
      uSeptaPerWhorl: { value: 0 },
      uSeptaFraction: { value: 0 },
      uBodyChamber: { value: 0 },
      uAttraction: { value: 0 },
      uDamping: { value: 0 },
      uNoiseStrength: { value: 0 },
      uNoiseScale: { value: 0 },
      uNoiseSpeed: { value: 0 },
    });
    Object.assign(this.positionVar.material.uniforms, {
      uDelta: { value: 0 },
    });

    const error = this.gpuCompute.init();
    if (error !== null) {
      throw new Error(`GPUComputationRenderer init failed: ${error}`);
    }

    // ---- Render setup -------------------------------------------------------
    // One vertex per particle. `position` is a dummy (three.js needs it to know
    // the vertex count); `reference` is the texel UV to look the particle up at.
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.count * 3);
    const references = new Float32Array(this.count * 2);
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const i = y * this.size + x;
        // +0.5 samples the texel center
        references[i * 2 + 0] = (x + 0.5) / this.size;
        references[i * 2 + 1] = (y + 0.5) / this.size;
      }
    }
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('reference', new THREE.BufferAttribute(references, 2));

    this.material = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms: {
        texturePosition: { value: null },
        uPointSize: { value: config.render.pointSize },
        uPixelRatio: { value: renderer.getPixelRatio() },
        uOpacity: { value: config.render.opacity },
        uColorInner: { value: new THREE.Color(config.render.colorInner) },
        uColorOuter: { value: new THREE.Color(config.render.colorOuter) },
      },
      transparent: true,
      depthWrite: false, // additive particles shouldn't occlude each other
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    // The dummy positions are all at the origin, so the bounding sphere is
    // meaningless; never cull.
    this.points.frustumCulled = false;
  }

  /** Copy config → uniforms, run both compute passes, and hand the result to the renderer. */
  update(config: Config, deltaSeconds: number, pixelRatio: number): void {
    const dt = deltaSeconds * config.sim.timeScale;
    this.time += dt;

    const s = config.shell;
    const sim = config.sim;
    const vu = this.velocityVar.material.uniforms;
    vu.uTime.value = this.time;
    vu.uDelta.value = dt;
    vu.uSize.value = s.size;
    vu.uGrowthRate.value = s.growthRate;
    vu.uWhorls.value = s.whorls;
    vu.uTubeRatio.value = s.tubeRatio;
    vu.uWhorlWidth.value = s.whorlWidth;
    vu.uRibsPerWhorl.value = s.ribsPerWhorl;
    vu.uRibAmplitude.value = s.ribAmplitude;
    vu.uRibSharpness.value = s.ribSharpness;
    vu.uRibClumping.value = s.ribClumping;
    vu.uOuterBias.value = s.outerBias;
    vu.uShellThickness.value = s.shellThickness;
    vu.uSeptaPerWhorl.value = s.septaPerWhorl;
    vu.uSeptaFraction.value = s.septaFraction;
    vu.uBodyChamber.value = s.bodyChamber;
    vu.uAttraction.value = sim.attraction;
    vu.uDamping.value = sim.damping;
    vu.uNoiseStrength.value = sim.noiseStrength;
    vu.uNoiseScale.value = sim.noiseScale;
    vu.uNoiseSpeed.value = sim.noiseSpeed;

    this.positionVar.material.uniforms.uDelta.value = dt;

    this.gpuCompute.compute();

    const r = config.render;
    const mu = this.material.uniforms;
    mu.texturePosition.value = this.gpuCompute.getCurrentRenderTarget(this.positionVar).texture;
    mu.uPointSize.value = r.pointSize;
    mu.uPixelRatio.value = pixelRatio;
    mu.uOpacity.value = r.opacity;
    (mu.uColorInner.value as THREE.Color).set(r.colorInner);
    (mu.uColorOuter.value as THREE.Color).set(r.colorOuter);
  }

  /** Throw every particle back into a random cloud (velocities zeroed). */
  scatter(): void {
    const pos = this.gpuCompute.createTexture();
    const vel = this.gpuCompute.createTexture();
    fillInitialPositions(pos.image.data as Float32Array);
    fillInitialVelocities(vel.image.data as Float32Array);
    for (const target of this.positionVar.renderTargets) this.gpuCompute.renderTexture(pos, target);
    for (const target of this.velocityVar.renderTargets) this.gpuCompute.renderTexture(vel, target);
    pos.dispose();
    vel.dispose();
  }

  dispose(): void {
    this.gpuCompute.dispose();
    this.seedTexture.dispose();
    this.geometry.dispose();
    this.material.dispose();
  }
}
