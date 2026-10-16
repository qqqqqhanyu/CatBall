import type { ProjectileType } from "../systems/DifficultyDirector";

export const BALL_COLORS: Record<ProjectileType, number> = {
  NORMAL: 0xff6535, SPREAD: 0x53dbf1, GIANT: 0xffbd26,
};

/** Code-native pixel textures; no extra image downloads. */
export function makeBallTexture(type: ProjectileType): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext("2d")!;
  const colors = type === "NORMAL" ? ["#fca047", "#ff6535", "#bd3526"]
    : type === "SPREAD" ? ["#b5ffff", "#53dbf1", "#197dba"]
      : ["#ffe786", "#ffbd26", "#cc7918"];
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const distance = Math.hypot(x - 15.5, y - 15.5);
    if (distance > 15.5) continue;
    ctx.fillStyle = distance > 13.5 ? "#18334e"
      : x + y > 40 ? colors[2] : x + y < 20 ? colors[0] : colors[1];
    if (distance < 12 && x >= 6 && x <= 11 && y >= 5 && y <= 9) ctx.fillStyle = "#fff5c9";
    ctx.fillRect(x, y, 1, 1);
  }
  return canvas;
}
