// =============================================================================
// particle.vert.glsl — draw each particle as a point sprite
// =============================================================================
//
// The geometry's `position` attribute is unused (all zeros). Instead each vertex
// carries `reference`: the UV of ITS texel in the simulation textures. We look
// up the simulated position there — this is the bridge between the GPGPU
// simulation and normal rendering, and no data ever goes back to the CPU.
//
// three.js (ShaderMaterial) injects modelViewMatrix, projectionMatrix, etc.
// -----------------------------------------------------------------------------

uniform sampler2D texturePosition; // xyz = position, w = growth fraction (0..1)
uniform float uPointSize;          // size in pixels at distance 1
uniform float uPixelRatio;
uniform vec3 uColorInner;          // color near the center of the coil
uniform vec3 uColorOuter;          // color at the aperture

attribute vec2 reference;

varying vec3 vColor;

void main() {
  vec4 data = texture2D(texturePosition, reference);
  vec3 pos = data.xyz;
  float growth = clamp(data.w, 0.0, 1.0);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Perspective size attenuation: points get smaller as they get farther away.
  // (-mvPosition.z is the distance in front of the camera.)
  gl_PointSize = uPointSize * uPixelRatio / max(-mvPosition.z, 0.001);

  // Color by growth angle: young (inner) whorls -> old (outer) whorls.
  vColor = mix(uColorInner, uColorOuter, smoothstep(0.0, 1.0, growth));
}
