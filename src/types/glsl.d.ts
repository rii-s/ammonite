// vite-plugin-glsl turns shader files into default-exported strings
// (with all `#include`d chunks already inlined).
declare module '*.glsl' {
  const source: string;
  export default source;
}
declare module '*.vert' {
  const source: string;
  export default source;
}
declare module '*.frag' {
  const source: string;
  export default source;
}
