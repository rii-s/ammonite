# Shader design notes

## Pipeline

```
CPU (once)                         GPU (every frame)
────────────                       ─────────────────────────────────────────────
initPositions.ts ──► texturePosition ─┐
                 ──► textureVelocity ─┼─► velocity.frag ─► textureVelocity'
createSeeds()    ──► tSeed ───────────┘         │
                                                ▼
                                       position.frag ─► texturePosition'
                                                │
                                                ▼
                                       particle.vert (one vertex per texel) ─► screen
```

- One particle = one RGBA float texel. 512×512 = 262,144 particles.
- `texturePosition`: xyz = position, w = growth fraction (0 center → 1 aperture).
- `textureVelocity`: xyz = velocity, w = growth fraction (computed here, copied to position.w).
- `tSeed` (static): four uniform randoms per particle that pick its home on the shell.

## Shell model (`chunks/spiral.glsl`)

- Centerline: `r(θ) = a·e^(bθ)` in the XY plane, coiling axis = Z.
- `a` is derived so the final whorl ends at `size`: `a = size·e^(−b·θmax)`, `θmax = whorls·2π`.
  This keeps the shell in frame while tweaking `b` / `whorls`.
- Tube radius = `r(θ)·tubeRatio` (gnomonic growth: same shape at every size).
  Whorls just touch when `tubeRatio ≈ (1−W⁻¹)/(1+W⁻¹)` with `W = e^(2πb)`;
  larger values overlap (involute, like most ammonites), smaller leave a gap (evolute).
- Cross-section: ellipse; `whorlWidth` squashes it along Z.
- Ribs: tube radius × `(1 + ribAmplitude · ribProfile · ventralWeight)`, where
  `ribProfile = (½ + ½cos(θ·ribsPerWhorl))^ribSharpness` and the ventral weight fades ribs
  toward the inner side.

## How density draws features

Additive blending means _more particles = brighter_, so features are drawn by where
particles go, not by geometry:

- **Ribs**: `ribClumping` pulls each particle's θ toward the nearest rib crest.
- **Septa**: a `septaFraction` of particles is placed on discs at evenly spaced θ (snapped
  down), slightly bowed backward, only in the phragmocone (excluding the last
  `bodyChamber` turns).
- **Even coverage**: `outerBias` samples θ with density ∝ e^(k·θ), k = outerBias·b, via inverse
  CDF. 0 = same count per turn (bright center), ~2 = same count per unit area.

## Dynamics (`compute/velocity.frag.glsl`)

- Spring: `acc = (target − pos)·attraction`.
- Curl noise: divergence-free swirl, sampled at `pos·noiseScale` drifting with time.
- Damping: `vel *= exp(−damping·dt)` (frame-rate independent).
  Critical damping ≈ `2·√attraction`; below that particles overshoot and wobble.
- dt is clamped to 1/30 s in `main.ts` to stay stable when a tab regains focus.

## Gotchas

- `GPUComputationRenderer` prepends the sampler uniforms and `#define resolution`; don't
  redeclare `texturePosition` / `textureVelocity` in compute shaders.
- The render geometry's `position` attribute is a dummy; `frustumCulled = false` is required.
- Changing `textureSize` rebuilds the whole system (new textures + geometry).
