import { GAME_CONFIG } from "../config/gameConfig";
import type { Vec2 } from "../utils/geometry";

/** Artwork has a shallow perspective; the simulation keeps one fixed court. */
export function arenaProjection(width: number, height: number) {
  const mobile = width / height >= 2;
  const source = mobile
    ? {
        width: 1983,
        height: 793,
        top: 207,
        bottom: 607,
        leftTop: 398,
        rightTop: 1586,
        leftBottom: 359,
        rightBottom: 1623,
      }
    : {
        width: 1672,
        height: 941,
        top: 195,
        bottom: 752,
        leftTop: 195,
        rightTop: 1478,
        leftBottom: 165,
        rightBottom: 1505,
      };
  // Crop only the outer scenery on normal landscape screens, so the arena
  // fills the view without squeezing its artwork or adding flat-color bands.
  const fit =
    width / height >= 1.5 && width / height <= 3.1 ? Math.max : Math.min;
  const scale = fit(width / source.width, height / source.height);
  const x = (width - source.width * scale) / 2;
  const y = (height - source.height * scale) / 2;
  const court = GAME_CONFIG.court;
  const project = (point: Vec2): Vec2 => {
    const u = (point.x - court.x) / court.width;
    const v = (point.y - court.y) / court.height;
    const left = source.leftTop + (source.leftBottom - source.leftTop) * v;
    const right = source.rightTop + (source.rightBottom - source.rightTop) * v;
    return {
      x: x + (left + (right - left) * u) * scale,
      y: y + (source.top + (source.bottom - source.top) * v) * scale,
    };
  };
  return {
    mobile,
    x,
    y,
    scale,
    source,
    project,
    characterHeight: (mobile ? 112 : 125) * scale,
  };
}
