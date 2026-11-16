// =============================================================================
// particle.frag.glsl — soft round point sprite
// =============================================================================
//
// gl_PointCoord runs 0..1 across the square point sprite. We turn it into a
// soft disc. The material uses ADDITIVE blending (src * alpha + dst), so where
// many particles overlap the image gets brighter — that's what makes density
// (ribs, septa, overlapping whorls) visible.
// -----------------------------------------------------------------------------

uniform float uOpacity;

varying vec3 vColor;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard; // cut the square corners

  // 1 at the center, fading smoothly to 0 at the edge.
  float falloff = 1.0 - smoothstep(0.0, 0.5, d);
  falloff *= falloff;

  gl_FragColor = vec4(vColor, falloff * uOpacity);
}
