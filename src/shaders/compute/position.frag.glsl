// =============================================================================
// position.frag.glsl — GPGPU pass 2: move every particle
// =============================================================================
//
// Runs once per particle (one texel each), after the velocity pass.
// GPUComputationRenderer injects:
//   uniform sampler2D texturePosition;
//   uniform sampler2D textureVelocity;
//   #define resolution vec2(...)
//
// Note: the textures are ping-ponged — we READ last frame's position and WRITE
// into a different render target, because a GPU can't read and write the same
// texture in one pass.
// -----------------------------------------------------------------------------

uniform float uDelta;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;

  vec4 pos = texture2D(texturePosition, uv);
  vec4 vel = texture2D(textureVelocity, uv);

  // Simple Euler step: x += v * dt
  pos.xyz += vel.xyz * uDelta;

  // Forward the growth fraction computed in the velocity pass, so the render
  // shader only needs to sample one texture.
  pos.w = vel.w;

  gl_FragColor = pos;
}
