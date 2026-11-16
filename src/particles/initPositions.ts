/**
 * CPU-side data used to seed the GPU simulation. This runs once (and again on
 * "scatter" / resize of the particle count); after that everything is on the GPU.
 *
 * All arrays are RGBA float data laid out like a texture: particle i occupies
 * floats [4i, 4i+4).
 */

/**
 * Starting positions: a random cloud in a sphere, so you can watch particles
 * fly in and settle onto the shell — a quick visual check that the whole
 * pipeline (CPU → texture → compute shaders → render shader) works.
 */
export function fillInitialPositions(data: Float32Array, radius = 3.5): void {
  for (let i = 0; i < data.length; i += 4) {
    // Uniform point in a sphere: random direction × cube-root radius.
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = radius * Math.cbrt(Math.random());
    data[i + 0] = r * s * Math.cos(t);
    data[i + 1] = r * s * Math.sin(t);
    data[i + 2] = r * u;
    data[i + 3] = 0; // growth fraction — filled in by the velocity shader
  }
}

/** Velocities start at rest. */
export function fillInitialVelocities(data: Float32Array): void {
  data.fill(0);
}

/**
 * Per-particle random numbers that never change. The velocity shader turns
 * them into each particle's "home" on the shell (see velocity.frag.glsl):
 *   x: growth sample (along the coil)   y: section sample (around the tube)
 *   z: radial sample (wall depth/septum) w: role sample (shell vs. septum)
 */
export function createSeeds(count: number): Float32Array {
  const data = new Float32Array(count * 4);
  for (let i = 0; i < data.length; i++) data[i] = Math.random();
  return data;
}
