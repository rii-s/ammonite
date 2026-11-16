// =============================================================================
// spiral.glsl — logarithmic-spiral shell geometry
// =============================================================================
//
// An ammonite shell is (to a first approximation) a tube whose centerline is a
// LOGARITHMIC SPIRAL lying in a plane:
//
//     r(theta) = a * e^(b * theta)
//
//   theta : growth angle, measured from the center of the coil (radians)
//   a     : radius at theta = 0
//   b     : growth rate. Each full turn the shell grows by e^(2*PI*b)
//           (the "whorl expansion rate" W in palaeontology; ammonites ~2–3.5)
//
// The tube's own radius is proportional to r(theta) (the shell grows without
// changing shape — "gnomonic growth"), so a single number `tubeRatio`
// describes how fat the whorls are relative to their distance from the axis.
//
// Coordinate convention: the coil lies in the XY plane, coiling axis = +Z.
// A point on the shell surface is addressed by two angles:
//   theta : how far along the coil (0 = protoconch / center, thetaMax = aperture)
//   phi   : angle around the tube cross-section
//           phi = 0      -> outer rim (the "venter")
//           phi = +-PI/2 -> the flanks (the flat sides you see face-on)
//           phi = PI     -> inner side, pressed against the previous whorl
// -----------------------------------------------------------------------------

#ifndef PI
#define PI 3.141592653589793
#endif
#define TAU 6.283185307179586

struct ShellParams {
  float a;            // radius at theta = 0 (derived from size so the shell stays in view)
  float b;            // growth rate of the log spiral
  float thetaMax;     // total growth angle = whorls * TAU
  float tubeRatio;    // tube radius / spiral radius
  float whorlWidth;   // squashes the cross-section along Z (<1 = laterally compressed)
  float ribsPerWhorl; // number of ribs per full turn
  float ribAmplitude; // how far ribs bulge out (fraction of tube radius)
  float ribSharpness; // exponent: higher = narrower, crisper ribs
};

// r = a * e^(b * theta)
float logSpiralRadius(ShellParams p, float theta) {
  return p.a * exp(p.b * theta);
}

// Rib profile in [0, 1]: 1 on a rib crest, 0 in the furrow between ribs.
// cos(theta * ribsPerWhorl) completes `ribsPerWhorl` cycles per turn (TAU).
float ribProfile(ShellParams p, float theta) {
  float wave = 0.5 + 0.5 * cos(theta * p.ribsPerWhorl);
  return pow(wave, p.ribSharpness);
}

// Snap theta toward the nearest rib crest. amount = 0 -> unchanged, 1 -> on crest.
// Used to bunch particles together so the ribs read as bright density ridges.
float snapToRib(ShellParams p, float theta, float amount) {
  float period = TAU / max(p.ribsPerWhorl, 1e-3);
  float crest = floor(theta / period + 0.5) * period;
  return mix(theta, crest, amount);
}

// Centerline point of the tube at growth angle theta.
vec3 spiralCenter(ShellParams p, float theta) {
  float r = logSpiralRadius(p, theta);
  return vec3(r * cos(theta), r * sin(theta), 0.0);
}

// Point on (or inside) the shell.
//   radial : 1 = on the outer surface, 0 = on the centerline. Values in between
//            fill the tube, which is how septa (internal walls) are drawn.
vec3 shellPoint(ShellParams p, float theta, float phi, float radial) {
  float R = logSpiralRadius(p, theta);
  float tube = R * p.tubeRatio;

  // Ribs bulge the tube outward, strongest on the outer rim (venter) and
  // fading toward the inner side, like real ammonite ribs.
  float ventralWeight = 0.5 + 0.5 * cos(phi);
  tube *= 1.0 + p.ribAmplitude * ribProfile(p, theta) * ventralWeight;

  // Cross-section: an ellipse in the plane spanned by the radial direction
  // (pointing away from the coiling axis) and the Z axis.
  float sectionRadial = tube * radial * cos(phi);                 // in/out of the coil
  float sectionAxial = tube * radial * sin(phi) * p.whorlWidth;   // along Z

  vec3 radialDir = vec3(cos(theta), sin(theta), 0.0);
  return radialDir * (R + sectionRadial) + vec3(0.0, 0.0, sectionAxial);
}

// Map a uniform random number s in [0,1) to a growth angle in [0, thetaMax).
//
// Plain `theta = s * thetaMax` puts the same number of particles in every turn,
// but outer whorls are MUCH bigger (area grows ~ e^(2*b*theta)), so the center
// would be blinding and the outside sparse. Here theta is drawn with density
// proportional to e^(k*theta) (inverse-CDF sampling):
//   bias = 0 -> uniform in theta,  bias = 2 -> roughly uniform per surface area.
float sampleGrowthAngle(ShellParams p, float s, float bias) {
  float k = bias * p.b;
  if (abs(k) < 1e-4) return s * p.thetaMax;
  return log(1.0 + s * (exp(k * p.thetaMax) - 1.0)) / k;
}
