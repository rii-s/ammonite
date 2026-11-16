import GUI from 'lil-gui';
import { TEXTURE_SIZES, type Config } from './config';

export interface GuiCallbacks {
  /** Particle count changed: textures must be reallocated. */
  onRebuild: () => void;
  /** Throw particles back into a cloud to watch them settle again. */
  onScatter: () => void;
}

/**
 * lil-gui bindings. Controllers write straight into `config`; the particle
 * system reads it every frame, so most parameters need no callback at all.
 */
export function createGui(config: Config, callbacks: GuiCallbacks): GUI {
  const gui = new GUI({ title: 'Ammonite' });

  const info = { particles: (config.textureSize ** 2).toLocaleString() };
  gui
    .add(config, 'textureSize', [...TEXTURE_SIZES])
    .name('texture size')
    .onFinishChange(() => {
      info.particles = (config.textureSize ** 2).toLocaleString();
      particles.updateDisplay();
      callbacks.onRebuild();
    });
  const particles = gui.add(info, 'particles').disable();
  gui.add({ scatter: callbacks.onScatter }, 'scatter').name('scatter & resettle');

  const shell = gui.addFolder('Shell (log spiral)');
  shell.add(config.shell, 'size', 0.5, 4, 0.01);
  shell.add(config.shell, 'growthRate', 0.05, 0.35, 0.001).name('growth rate b');
  shell.add(config.shell, 'whorls', 1, 8, 0.01);
  shell.add(config.shell, 'tubeRatio', 0.1, 0.9, 0.001).name('tube ratio');
  shell.add(config.shell, 'whorlWidth', 0.2, 1.5, 0.01).name('whorl width');
  shell.add(config.shell, 'outerBias', 0, 2.5, 0.01).name('outer bias');
  shell.add(config.shell, 'shellThickness', 0, 0.5, 0.001).name('wall thickness');

  const ribs = gui.addFolder('Ribs');
  ribs.add(config.shell, 'ribsPerWhorl', 0, 80, 1).name('ribs / whorl');
  ribs.add(config.shell, 'ribAmplitude', 0, 0.5, 0.001).name('amplitude');
  ribs.add(config.shell, 'ribSharpness', 0.5, 20, 0.1).name('sharpness');
  ribs.add(config.shell, 'ribClumping', 0, 1, 0.01).name('density clumping');

  const chambers = gui.addFolder('Chambers (septa)');
  chambers.add(config.shell, 'septaPerWhorl', 1, 40, 1).name('septa / whorl');
  chambers.add(config.shell, 'septaFraction', 0, 0.5, 0.001).name('particle share');
  chambers.add(config.shell, 'bodyChamber', 0, 2, 0.01).name('body chamber (turns)');

  const sim = gui.addFolder('Simulation');
  sim.add(config.sim, 'attraction', 0, 30, 0.1);
  sim.add(config.sim, 'damping', 0, 20, 0.1);
  sim.add(config.sim, 'noiseStrength', 0, 3, 0.01).name('noise strength');
  sim.add(config.sim, 'noiseScale', 0.1, 6, 0.01).name('noise scale');
  sim.add(config.sim, 'noiseSpeed', 0, 2, 0.01).name('noise speed');
  sim.add(config.sim, 'timeScale', 0, 3, 0.01).name('time scale');

  const render = gui.addFolder('Render');
  render.add(config.render, 'pointSize', 1, 60, 0.1).name('point size');
  render.add(config.render, 'opacity', 0.01, 1, 0.01);
  render.addColor(config.render, 'colorInner').name('inner color');
  render.addColor(config.render, 'colorOuter').name('outer color');
  render.addColor(config.render, 'background');
  render.add(config.render, 'autoRotate').name('auto rotate');

  return gui;
}
