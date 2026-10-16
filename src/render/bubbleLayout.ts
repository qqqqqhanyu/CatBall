import { clamp, type Rect, type Vec2 } from "../utils/geometry";
export interface BubbleAnchor extends Vec2 { id: string; height: number; player?: boolean }
export interface BubblePlacement extends Rect { id: string; size: number; anchor: BubbleAnchor }
export function overlapArea(a: Rect, b: Rect): number {
  return Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
    * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
}

/** Fit transient faces around actors, leaving controls, actors, balls and the kick title readable. */
export function placeBubbles(anchors: BubbleAnchor[], width: number, height: number, obstacles: Rect[]): BubblePlacement[] {
  const size = clamp(height * 0.19, 54, 100), label = 20;
  const placed: BubblePlacement[] = [];
  for (const anchor of anchors) {
    const h = anchor.height;
    const candidates: Vec2[] = [];
    const left = anchor.x - h * 0.5 - size - 9, right = anchor.x + h * 0.5 + 9;
    const above = anchor.y - h - size - 10, middle = anchor.y - h * 0.6 - size * 0.5;
    const preferred = anchor.player ? { x: left, y: above + size * 0.3 }
      : anchor.x > width * 0.65 ? { x: right, y: middle } : anchor.x < width * 0.35 ? { x: left, y: middle }
      : { x: anchor.x - size / 2, y: anchor.y < height / 2 ? above : anchor.y + 12 };
    candidates.push(preferred);
    for (const y of [above, middle, anchor.y + 12, above - 28])
      for (const x of [left, right, anchor.x - size / 2, left - size * 0.6, right + size * 0.6]) candidates.push({ x, y });
    // On short screens the top character and kick title can leave a narrow gap.
    // Add exact obstacle-edge candidates instead of accepting overlap between coarse anchors.
    for (const obstacle of [...obstacles, ...placed]) {
      for (const x of [obstacle.x - size - 7, obstacle.x + obstacle.width + 7])
        for (const y of [above, middle]) candidates.push({ x, y });
      for (const y of [obstacle.y - size - label - 7, obstacle.y + obstacle.height + 7])
        for (const x of [left, right]) candidates.push({ x, y });
    }
    let best: BubblePlacement | null = null, bestScore = Infinity;
    for (const candidate of candidates) {
      const box = { x: clamp(candidate.x, 6, width - size - 6), y: clamp(candidate.y, 5, height - size - label - 5), width: size, height: size + label };
      const overlap = obstacles.reduce((total, obstacle) => total + overlapArea(box, obstacle), 0);
      const overlapBubbles = placed.reduce((total, bubble) => total + overlapArea(box, bubble), 0);
      const score = overlap * 100 + overlapBubbles * 1000 + Math.hypot(box.x - preferred.x, box.y - preferred.y);
      if (score < bestScore) { bestScore = score; best = { ...box, id: anchor.id, anchor, size }; }
    }
    if (best) placed.push(best);
  }
  return placed;
}
