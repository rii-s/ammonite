// =============================================================================
// velocity.frag.glsl — GPGPU pass 1: update every particle's velocity
// =============================================================================
//
// How GPGPU works here: every particle is ONE TEXEL of a float texture.
// GPUComputationRenderer draws a full-screen quad into a render target the size
// of that texture, so this fragment shader runs once per particle. Whatever we
// write to gl_FragColor becomes that particle's new velocity.
//
// GPUComputationRenderer automatically declares for us:
//   uniform sampler2D texturePosition;   // xyz = position, w = growth fraction
//   uniform sampler2D textureVelocity;   // xyz = velocity, w = growth fraction
//   #define resolution vec2(...)         // texture size in texels
//
// Each particle has a fixed "home" on the shell, chosen by the random numbers
// in tSeed. The particle is pulled toward that home by a damped spring and
// pushed around by curl noise, so it settles onto the shell but keeps drifting.
// -----------------------------------------------------------------------------

#include ../chunks/spiral.glsl;
#include ../chunks/noise.glsl;

// Per-particle constants (written once on the CPU, see initPositions.ts)
//   x : growth sample      -> where along the coil (theta)
//   y : section sample     -> where around the tube (phi)
//   z : radial sample      -> depth into the shell wall / position on a septum
//   w : role sample        -> decides shell surface vs. internal septum
uniform sampler2D tSeed;

uniform float uTime;
uniform float uDelta;

// --- shell shape (see spiral.glsl) ---
uniform float uSize;           // outer radius of the final whorl
uniform float uGrowthRate;     // b
uniform float uWhorls;         // number of turns
uniform float uTubeRatio;
uniform float uWhorlWidth;
uniform float uRibsPerWhorl;
uniform float uRibAmplitude;
uniform float uRibSharpness;
uniform float uRibClumping;    // 0..1 how strongly particles bunch onto rib crests
uniform float uOuterBias;      // particle distribution along the coil (see sampleGrowthAngle)
uniform float uShellThickness; // fraction of tube radius the surface particles spread into

// --- chambers ---
uniform float uSeptaPerWhorl;  // internal walls per turn
uniform float uSeptaFraction;  // share of particles used to draw septa
uniform float uBodyChamber;    // last N turns have no septa (the living chamber)

// --- dynamics ---
uniform float uAttraction;     // spring stiffness toward the target
uniform float uDamping;        // velocity decay per second
uniform float uNoiseStrength;
uniform float uNoiseScale;
uniform float uNoiseSpeed;

void main() {
  // Texel coordinate of this particle in [0,1]^2.
  vec2 uv = gl_FragCoord.xy / resolution.xy;

  vec3 pos = texture2D(texturePosition, uv).xyz;
  vec3 vel = texture2D(textureVelocity, uv).xyz;
  vec4 seed = texture2D(tSeed, uv);

  // ---- 1. Build the shell parameters from uniforms -------------------------
  ShellParams p;
  p.b = uGrowthRate;
  p.thetaMax = uWhorls * TAU;
  // Choose `a` so the last whorl always ends at radius uSize: a = size / e^(b*thetaMax)
  p.a = uSize * exp(-p.b * p.thetaMax);
  p.tubeRatio = uTubeRatio;
  p.whorlWidth = uWhorlWidth;
  p.ribsPerWhorl = uRibsPerWhorl;
  p.ribAmplitude = uRibAmplitude;
  p.ribSharpness = uRibSharpness;

  // ---- 2. Work out where this particle's home (target) is ------------------
  float theta = sampleGrowthAngle(p, seed.x, uOuterBias);
  float phi = seed.y * TAU;
  vec3 target;

  // The last `uBodyChamber` turns are the open living chamber: no septa there.
  float phragmoconeEnd = max(p.thetaMax - uBodyChamber * TAU, 0.0);
  bool isSeptum = seed.w < uSeptaFraction && theta < phragmoconeEnd;

  if (isSeptum) {
    // Snap theta down to the nearest chamber wall, then fill a disc
    // (sqrt makes the disc uniformly filled rather than center-heavy).
    float spacing = TAU / max(uSeptaPerWhorl, 1.0);
    float wallTheta = floor(theta / spacing) * spacing;
    float rr = sqrt(seed.z);
    // Real septa are bowed, not flat: push the middle slightly backwards.
    wallTheta -= 0.12 * spacing * (1.0 - rr * rr);
    target = shellPoint(p, wallTheta, phi, rr);
  } else {
    // Outer shell. Bunch particles onto rib crests so ribs show up as
    // brighter density ridges, then push them a little into the wall.
    theta = snapToRib(p, theta, uRibClumping * seed.z);
    float radial = 1.0 - uShellThickness * seed.z;
    target = shellPoint(p, theta, phi, radial);
  }

  // ---- 3. Forces -----------------------------------------------------------
  // Spring toward the target (Hooke's law: F = k * displacement).
  vec3 acc = (target - pos) * uAttraction;

  // Curl noise: a swirling, divergence-free flow. Sampling it at the particle's
  // position (plus time) means neighbours move together, like a fluid.
  vec3 noisePos = pos * uNoiseScale + vec3(0.0, 0.0, uTime * uNoiseSpeed);
  acc += curlNoise(noisePos) * uNoiseStrength;

  // ---- 4. Integrate (semi-implicit Euler) ----------------------------------
  vel += acc * uDelta;
  // exp() makes damping independent of frame rate.
  vel *= exp(-uDamping * uDelta);

  // Pack the growth fraction (0 = center, 1 = aperture) into .w so the
  // position pass can forward it to the renderer for coloring.
  gl_FragColor = vec4(vel, theta / p.thetaMax);
}
