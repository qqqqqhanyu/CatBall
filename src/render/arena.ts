import { GAME_CONFIG } from "../config/gameConfig";
import { seededRandom } from "../utils/random";

/** Original code-drawn scenery. No screenshot is used as the playable world. */
export function drawArena(canvas: HTMLCanvasElement): void {
  canvas.width = GAME_CONFIG.width;
  canvas.height = GAME_CONFIG.height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  const random = seededRandom(29);
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  };
  rect(0, 0, 1280, 720, "#7da749");
  for (let i = 0; i < 3900; i++) {
    const x = Math.floor(random() * 320) * 4;
    const y = Math.floor(random() * 180) * 4;
    rect(
      x,
      y,
      random() > 0.8 ? 8 : 4,
      4,
      ["#89b452", "#6e9c42", "#a4bd59", "#78a346"][Math.floor(random() * 4)],
    );
  }
  // School facade, windows, doors and a short stairway.
  rect(182, 0, 916, 78, "#a9a58c");
  rect(188, 0, 904, 67, "#e0d9bb");
  rect(188, 55, 904, 7, "#c0b595");
  for (let x = 220; x < 1090; x += 76) {
    if (x > 538 && x < 702) continue;
    rect(x - 4, 0, 48, 46, "#e9e3cd");
    rect(x, 0, 40, 39, "#344f63");
    rect(x + 3, 0, 34, 33, "#537991");
    rect(x + 6, 2, 9, 27, "#7099ac");
    rect(x + 18, 0, 3, 36, "#b1bdba");
    rect(x, 36, 40, 4, "#f4edcf");
  }
  rect(568, 0, 144, 66, "#c5bea7");
  rect(586, 0, 108, 57, "#34516b");
  rect(592, 0, 44, 50, "#648595");
  rect(644, 0, 44, 50, "#648595");
  rect(637, 0, 6, 57, "#e1d7bf");
  for (let i = 0; i < 4; i++) {
    rect(
      574 - i * 6,
      61 + i * 7,
      132 + i * 12,
      7,
      i % 2 ? "#e2dcc7" : "#b7b4a4",
    );
  }
  for (const x of [298, 436, 790, 934]) {
    rect(x, 66, 74, 17, "#4a713e");
    rect(x + 4, 59, 66, 18, "#4f883e");
    rect(x + 10, 55, 48, 12, "#74a84a");
    rect(x, 84, 74, 5, "#c6c6a6");
  }

  // Rectangular track and playable court are tied to the same config as collision.
  const c = GAME_CONFIG.court;
  rect(82, 104, 1116, 596, "#55743b");
  rect(88, 100, 1104, 594, "#a94e3f");
  rect(94, 106, 1092, 582, "#bc614e");
  for (let i = 0; i < 1900; i++) {
    rect(
      96 + random() * 1084,
      108 + random() * 574,
      3,
      2,
      random() > 0.5 ? "#c66b54" : "#b85b4a",
    );
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#f3d2ab";
  ctx.strokeRect(110, 118, 1060, 560);
  ctx.strokeRect(134, 137, 1012, 522);
  rect(c.x - 6, c.y - 6, c.width + 12, c.height + 12, "#d4ded2");
  rect(c.x, c.y, c.width, c.height, "#2c87b6");
  const gradient = ctx.createLinearGradient(0, c.y, 0, c.y + c.height);
  gradient.addColorStop(0, "#388fbd");
  gradient.addColorStop(1, "#267baa");
  ctx.fillStyle = gradient;
  ctx.fillRect(c.x, c.y, c.width, c.height);
  for (let i = 0; i < 3900; i++) {
    rect(
      c.x + random() * c.width,
      c.y + random() * c.height,
      3,
      2,
      random() > 0.5 ? "#3488b2" : "#2c80ae",
    );
  }
  ctx.strokeStyle = "#dfede2";
  ctx.lineWidth = 4;
  ctx.strokeRect(c.x + 2, c.y + 2, c.width - 4, c.height - 4);
  ctx.beginPath();
  ctx.moveTo(640, c.y);
  ctx.lineTo(640, c.y + c.height);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(640, c.y + c.height / 2, 56, 0, Math.PI * 2);
  ctx.stroke();
  rect(c.x + 12, c.y + 12, 35, 3, "#70b4cc");

  // Small blocky trees, kept away from the playable boundary.
  const tree = (x: number, y: number, scale: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#4d743e";
    ctx.beginPath();
    ctx.ellipse(1, 35, 32, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    rect(-7, 2, 14, 38, "#72583b");
    rect(0, 0, 6, 36, "#937044");
    rect(-33, -24, 66, 38, "#2c6541");
    rect(-26, -36, 52, 52, "#3c7b3e");
    rect(-37, -15, 70, 25, "#418741");
    rect(-22, -40, 38, 50, "#559642");
    rect(-27, -26, 39, 24, "#70a64b");
    rect(0, -30, 24, 21, "#649c42");
    rect(-20, -35, 16, 10, "#8cba55");
    rect(20, -15, 12, 18, "#34703b");
    ctx.restore();
  };
  tree(68, 46, 1.35);
  tree(168, 30, 0.8);
  tree(1136, 40, 1);
  tree(1230, 54, 1.35);
  tree(29, 322, 0.7);
  tree(1256, 550, 0.75);
  for (const [x, y] of [
    [40, 160],
    [1210, 276],
    [58, 650],
    [1200, 660],
    [360, 710],
    [1040, 92],
  ]) {
    rect(x, y, 3, 9, "#e5d798");
    rect(x - 3, y + 3, 9, 3, "#fff0bc");
  }
}

export function makeArenaCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  drawArena(canvas);
  return canvas;
}
