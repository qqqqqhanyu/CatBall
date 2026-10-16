import { describe, expect, it } from "vitest";
import { arenaProjection } from "../../src/render/projection";
import { GAME_CONFIG } from "../../src/config/gameConfig";

describe("responsive court projection", () => {
  for (const [width, height] of [
    [844, 344],
    [568, 278],
    [1440, 818],
  ]) {
    it(`keeps the court visible and retina scaling consistent at ${width} × ${height}`, () => {
      const normal = arenaProjection(width, height);
      const retina = arenaProjection(width * 2, height * 2);
      const court = GAME_CONFIG.court;
      const positions = [
        { x: court.x, y: court.y },
        { x: court.x + court.width, y: court.y },
        { x: court.x, y: court.y + court.height },
        { x: court.x + court.width, y: court.y + court.height },
      ];
      for (const point of positions) {
        const p = normal.project(point),
          r = retina.project(point);
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(width);
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(height);
        expect(r.x / 2).toBeCloseTo(p.x);
        expect(r.y / 2).toBeCloseTo(p.y);
      }
      expect(retina.characterHeight / 2).toBeCloseTo(normal.characterHeight);
      expect(
        (normal.source.width * normal.scale) /
          (normal.source.height * normal.scale),
      ).toBeCloseTo(normal.source.width / normal.source.height);
    });
  }
});
