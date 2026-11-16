# Ammonite

A GPU-driven particle system that forms an ammonite-like shell: a logarithmic-spiral
coil with ribs and internal chambers (septa) suggested by particle density.

Particle positions and velocities are simulated entirely on the GPU (GPGPU) with
three.js `GPUComputationRenderer`; the CPU only seeds the initial data and sets uniforms.

## Install

Requires Node 20+.

```bash
npm install
```

## Run

```bash
npm run dev       # dev server at http://localhost:5173 (shaders hot-reload)
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build
npm run lint      # ESLint
npm run format    # Prettier (TS/JSON/MD/HTML; GLSL is left alone)
```

In VS Code: run the **dev server** task, or press F5 with the
**Chrome: Vite dev server** launch configuration (it starts the dev server for you).

Controls: drag to orbit, scroll to zoom, right-drag to pan. The lil-gui panel (top
right) edits every parameter live; **scatter & resettle** throws the particles back
into a cloud so you can watch them find the shell again.

## Project layout

```
index.html                 page shell, loads src/main.ts
src/
  main.ts                  renderer, scene, camera, OrbitControls, resize, render loop
  config.ts                every tunable parameter in one typed object
  gui.ts                   lil-gui bindings to config
  particles/
    ParticleSystem.ts      GPUComputationRenderer setup, textures, render material
    initPositions.ts       CPU-side initial positions / velocities / per-particle seeds
  shaders/
    compute/velocity.frag.glsl   spring toward the shell + curl noise → velocity
    compute/position.frag.glsl   integrates position
    render/particle.vert.glsl    reads position texture, sets gl_Position / gl_PointSize
    render/particle.frag.glsl    soft round sprite (additive blending)
    chunks/spiral.glsl           log-spiral shell math: r = a·e^(bθ)
    chunks/noise.glsl            simplex + curl noise
  types/glsl.d.ts          module declarations for .glsl imports
public/                    static assets (favicon)
docs/NOTES.md              running notes on shader design and parameters
```

Shaders are imported as strings via `vite-plugin-glsl`, which also resolves
`#include ../chunks/foo.glsl;` lines.

## Connecting to GitHub

I'll do this manually.
