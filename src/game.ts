import Phaser from "phaser";
import { GameScene, type SceneOptions } from "./scenes/GameScene";

export function createGame(
  parent: HTMLElement,
  options: SceneOptions,
): Phaser.Game {
  const density = Math.min(window.devicePixelRatio || 1, 2);
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: Math.round(parent.clientWidth * density),
    height: Math.round(parent.clientHeight * density),
    backgroundColor: "#6a9f3f",
    pixelArt: false,
    antialias: true,
    roundPixels: true,
    audio: { noAudio: true },
    input: { keyboard: false, mouse: false, touch: false },
    // The drawing buffer follows device pixels; CSS follows the actual viewport.
    // This avoids upscaling a low-resolution canvas on Retina/mobile screens.
    scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER },
    callbacks: {
      postBoot(game) {
        const resize = () => {
          if (!parent.isConnected) return;
          game.scale.resize(
            Math.round(parent.clientWidth * density),
            Math.round(parent.clientHeight * density),
          );
          game.canvas.style.width = "100%";
          game.canvas.style.height = "100%";
        };
        const observer = new ResizeObserver(resize);
        observer.observe(parent);
        game.events.once(Phaser.Core.Events.DESTROY, () =>
          observer.disconnect(),
        );
        resize();
      },
    },
    scene: [new GameScene(options)],
    banner: false,
    // Session already caps physics steps. Phaser's smoothing clamps the first 120
    // frames to 16.7ms, stretching a 3s countdown to 6s on a 30Hz device.
    fps: { target: 60, smoothStep: false },
  });
}
