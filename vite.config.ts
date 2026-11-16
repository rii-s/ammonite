import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  plugins: [
    // Lets us `import shader from './x.glsl'` and use `#include ../chunks/y.glsl;`
    // inside shaders. Three.js-style `#include <common>` lines are left untouched.
    glsl({ watch: true }),
  ],
  server: {
    port: 5173,
    strictPort: true, // keep the port fixed so the VS Code Chrome debug config can find it
  },
});
