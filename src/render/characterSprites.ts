import type { Character } from "../data/characters";

/** Lightweight original pixel stand-ins, intentionally separate from the portrait art. */
export function makeCharacterSprite(
  character: Character,
  frame = 0,
  back = false,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 48;
  canvas.height = 56;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  const ink = "#152c49";
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  const { fur, shade, kind, eyes } = character;
  const step = frame === 1 ? 2 : frame === 3 ? -2 : 0;
  // Tail, shoes and the blue-and-white school uniform.
  const silver = character.id === "silver_cat";
  if (kind === "poodle") {
    rect(6, 36, 8, 7, ink);
    rect(7, 37, 6, 5, shade);
  } else {
    rect(5, 33, 5, 13, ink);
    rect(8, 41, 8, 7, ink);
    rect(6, 33, 3, 11, kind === "point" || silver ? shade : fur);
    rect(9, 43, 7, 3, silver ? shade : fur);
    if (kind === "ragdoll") {
      rect(3, 35, 7, 9, fur);
      rect(5, 42, 10, 5, fur);
    }
    if (kind === "tabby") {
      rect(5, 36, 5, 2, shade);
      rect(9, 43, 3, 3, shade);
    }
  }
  rect(15, 42 + Math.max(0, step), 8, 11 - Math.abs(step), ink);
  rect(25, 42 + Math.max(0, -step), 8, 11 - Math.abs(step), ink);
  rect(13, 50 + Math.max(0, -step), 11, 4, ink);
  rect(25, 50 + Math.max(0, step), 11, 4, ink);
  rect(15, 50 + Math.max(0, -step), 8, 2, "#eaf4f6");
  rect(27, 50 + Math.max(0, step), 7, 2, "#eaf4f6");
  rect(16, 43, 6, 5, "#255eac");
  rect(26, 43, 6, 5, "#255eac");
  rect(12, 26, 24, 19, ink);
  rect(14, 27, 20, 16, "#2864b7");
  rect(11, 28 + step, 5, 13, ink);
  rect(33, 28 - step, 5, 13, ink);
  rect(12, 29 + step, 3, 8, "#3e89cf");
  rect(34, 29 - step, 3, 8, "#3e89cf");
  rect(11, 38 + step, 5, 4, kind === "point" ? shade : fur);
  rect(33, 38 - step, 5, 4, kind === "point" ? shade : fur);
  rect(17, 27, 13, 13, "#f6f3e7");
  rect(15, 29, 3, 11, "#57a8df");
  rect(30, 29, 3, 11, "#57a8df");
  rect(23, 28, 2, 11, "#cbdce5");
  rect(17, 41, 15, 2, "#132c66");
  if (back) {
    rect(17, 28, 14, 14, ink);
    rect(19, 29, 10, 11, "#345a91");
    rect(22, 34, 4, 4, "#b5d8e7");
  }

  // Distinct silhouettes: upright ears for cats, curly head and floppy ears for dog.
  if (kind !== "poodle") {
    rect(10, 1, 3, 13, ink);
    rect(13, 3, 4, 10, ink);
    rect(17, 6, 3, 7, ink);
    rect(35, 1, 3, 13, ink);
    rect(31, 3, 4, 10, ink);
    rect(28, 6, 3, 7, ink);
    rect(12, 4, 3, 7, kind === "point" || silver ? shade : fur);
    rect(14, 7, 3, 5, "#dba5a3");
    rect(34, 4, 2, 7, kind === "point" || silver ? shade : fur);
    rect(31, 7, 3, 5, "#dba5a3");
  }
  rect(12, 8, 24, 22, ink);
  rect(8, 12, 32, 14, ink);
  rect(10, 25, 28, 5, ink);
  rect(16, 29, 16, 3, ink);
  rect(12, 10, 24, 18, fur);
  rect(10, 13, 28, 12, fur);
  rect(16, 27, 16, 3, fur);
  if (!silver) {
    rect(13, 10, 22, 4, shade);
    rect(11, 15, 3, 10, shade);
    rect(34, 15, 3, 10, shade);
  }
  if (kind === "tabby") {
    rect(20, 10, 2, 6, "#54616f");
    rect(26, 10, 2, 6, "#54616f");
    rect(11, 18, 5, 2, "#54616f");
    rect(33, 18, 4, 2, "#54616f");
  }
  if (kind === "point") {
    rect(15, 12, 18, 14, shade);
    rect(18, 24, 12, 4, shade);
  }
  if (kind === "ragdoll") {
    rect(11, 10, 8, 8, shade);
    rect(30, 10, 7, 8, shade);
    rect(8, 22, 4, 7, fur);
    rect(36, 22, 4, 7, fur);
  }
  if (kind === "poodle") {
    rect(9, 6, 29, 7, ink);
    rect(12, 3, 23, 6, ink);
    rect(10, 7, 27, 7, fur);
    rect(14, 4, 18, 6, fur);
    rect(5, 12, 8, 17, ink);
    rect(35, 12, 8, 17, ink);
    rect(6, 14, 7, 12, shade);
    rect(35, 14, 7, 12, shade);
    for (const [x, y] of [
      [13, 7],
      [18, 5],
      [25, 8],
      [30, 5],
      [14, 12],
      [31, 12],
      [8, 18],
      [36, 21],
    ])
      rect(x, y, 3, 3, "#c1bbc0");
  }
  if (!back) {
    rect(16, 17, 5, 7, "#f9fcf8");
    rect(27, 17, 5, 7, "#f9fcf8");
    rect(18, 18, 3, 5, eyes);
    rect(27, 18, 3, 5, eyes);
    rect(19, 19, 2, 4, ink);
    rect(27, 19, 2, 4, ink);
    rect(18, 18, 1, 2, "#ffffff");
    rect(27, 18, 1, 2, "#ffffff");
    rect(23, 24, 3, 2, kind === "poodle" ? ink : "#bb7b83");
    rect(24, 26, 1, 2, ink);
    rect(21, 27, 3, 1, ink);
    rect(25, 27, 3, 1, ink);
    rect(12, 24, 4, 1, "#9aadb7");
    rect(33, 24, 4, 1, "#9aadb7");
  } else if (!silver) {
    rect(18, 11, 11, 3, shade);
  }
  return canvas;
}
