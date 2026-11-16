/**
 * Every tunable parameter lives here. The GUI mutates this object directly and
 * ParticleSystem copies it into shader uniforms every frame, so any change is
 * live. (Only `textureSize` needs a rebuild, because it reallocates textures.)
 */

export const TEXTURE_SIZES = [128, 256, 512, 1024] as const;
export type TextureSize = (typeof TEXTURE_SIZES)[number];

export interface ShellConfig {
  /** Outer radius of the last whorl (world units). */
  size: number;
  /** Log-spiral growth rate b in r = a·e^(bθ). Per turn the shell grows by e^(2πb). */
  growthRate: number;
  /** Number of turns of the coil. */
  whorls: number;
  /** Tube radius as a fraction of spiral radius. Larger = fatter, more overlapping whorls. */
  tubeRatio: number;
  /** Cross-section squash along the coiling axis (<1 = laterally compressed). */
  whorlWidth: number;
  /** Ribs per full turn. */
  ribsPerWhorl: number;
  /** How far ribs bulge (fraction of tube radius). */
  ribAmplitude: number;
  /** Rib profile exponent — higher = narrower ribs. */
  ribSharpness: number;
  /** 0..1 how strongly particles bunch onto rib crests (density ridges). */
  ribClumping: number;
  /** Particle distribution along the coil: 0 = equal per turn, 2 ≈ equal per area. */
  outerBias: number;
  /** How deep (fraction of tube radius) surface particles spread into the wall. */
  shellThickness: number;
  /** Internal chamber walls (septa) per turn. */
  septaPerWhorl: number;
  /** Fraction of particles used to draw the septa. */
  septaFraction: number;
  /** Turns at the open end with no septa (the living "body chamber"). */
  bodyChamber: number;
}

export interface SimConfig {
  /** Spring stiffness pulling particles to their place on the shell. */
  attraction: number;
  /** Velocity decay per second. */
  damping: number;
  /** Strength of the curl-noise flow. */
  noiseStrength: number;
  /** Spatial frequency of the noise (higher = smaller swirls). */
  noiseScale: number;
  /** How fast the noise field evolves. */
  noiseSpeed: number;
  /** Multiplies simulation time (0 = paused). */
  timeScale: number;
}

export interface RenderConfig {
  pointSize: number;
  opacity: number;
  colorInner: string;
  colorOuter: string;
  background: string;
  autoRotate: boolean;
}

export interface Config {
  /** Simulation texture is textureSize × textureSize → that many particles squared. */
  textureSize: TextureSize;
  shell: ShellConfig;
  sim: SimConfig;
  render: RenderConfig;
}

export const config: Config = {
  textureSize: 512, // 262,144 particles

  shell: {
    size: 2.0,
    growthRate: 0.15, // e^(2π·0.15) ≈ 2.6× per turn — typical for ammonites
    whorls: 4.5,
    tubeRatio: 0.45,
    whorlWidth: 0.75,
    ribsPerWhorl: 28,
    ribAmplitude: 0.08,
    ribSharpness: 3.0,
    ribClumping: 0.5,
    outerBias: 1.4,
    shellThickness: 0.06,
    septaPerWhorl: 12,
    septaFraction: 0.12,
    bodyChamber: 0.6,
  },

  sim: {
    attraction: 6.0,
    damping: 4.0,
    noiseStrength: 0.25,
    noiseScale: 1.2,
    noiseSpeed: 0.15,
    timeScale: 1.0,
  },

  render: {
    pointSize: 12,
    opacity: 0.35,
    colorInner: '#5a7bff',
    colorOuter: '#ffb27a',
    background: '#05060a',
    autoRotate: true,
  },
};
