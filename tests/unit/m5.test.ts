import { describe, expect, it } from "vitest";
import { Session } from "../../src/systems/Session";
import { GAME_CONFIG as C } from "../../src/config/gameConfig";
import { seededRandom } from "../../src/utils/random";

const still = { x: 0, y: 0 };
describe("presentation clocks on slow devices", () => {
  it.each([10, 20, 30, 60])("finishes the 3s countdown at %i fps without advancing gameplay", (fps) => {
    const s = new Session("silver_cat", seededRandom(43));
    for (let i = 0; i < fps * 3 - 1; i++) s.tick(1 / fps, still);
    expect(s.phase).toBe("COUNTDOWN");
    s.tick(1 / fps, still);
    expect(s.phase).toBe("PLAYING"); expect(s.elapsed).toBe(0); expect(s.attacks.attacksFired).toBe(0);
  });
  it("finishes hit-stop in 0.5 wall seconds at 10fps, while pause and physics remain frozen", () => {
    const s = new Session("silver_cat", seededRandom(43));
    s.phase = "PLAYING"; s.elapsed = 20; s.hitStopRemaining = 0.5; s.kickCooldown = 0.8; s.treatRemaining = 3;
    s.tick(0.2, still); expect(s.hitStopRemaining).toBeCloseTo(0.3);
    s.pause(); const paused = s.snapshot(); s.tick(10, still); expect(s.snapshot()).toEqual(paused);
    s.resume(); for (let i = 0; i < 3; i++) s.tick(0.1, still);
    expect(s.hitStopRemaining).toBe(0); expect(s.shockedRemaining).toBe(3);
    expect(s.elapsed).toBe(20); expect(s.kickCooldown).toBe(0.8); expect(s.treatRemaining).toBe(3);
    const x = s.position.x; s.tick(10, { x: 1, y: 0 });
    expect(s.position.x - x).toBeCloseTo(C.player.speed * C.maxDeltaSeconds);
  });
});

describe("collision ordering and immunity boundaries", () => {
  it("attributes the earliest swept hit, independently of the projectile array order", () => {
    const s = new Session("silver_cat", seededRandom(43)); s.phase = "PLAYING"; s.elapsed = 10;
    const p = s.position;
    s.projectiles = [100, 50].map((offset, i) => ({ projectileId: i + 1, ownerCharacterId: s.opponents[i], type: "NORMAL" as const,
      radius: C.projectiles.NORMAL.radius, position: { x: p.x - offset, y: p.y }, velocity: { x: 2400, y: 0 } }));
    s.tick(0.05, still);
    expect(s.lastHit?.projectileId).toBe(2); expect(s.lastHit?.ownerCharacterId).toBe(s.opponents[1]);
    expect(s.expressionView().bubbles.map((b) => b.characterId)).toEqual([s.playerId, s.opponents[1]]);
    expect(s.health).toBe(2);
  });
  it("keeps independent immunity sources through an ending Roll and never replays an expired pickup bubble", () => {
    const s = new Session("silver_cat", seededRandom(43)); s.phase = "PLAYING"; s.elapsed = 20;
    s.rollRemaining = 0.05; s.treatRemaining = 0.2; s.hurtRemaining = 0.1;
    s.expressions.onPickup("HAPPY", 19);
    s.tick(0.05, still);
    expect(s.rollRemaining).toBe(0); expect(s.isInvulnerable).toBe(true); expect(s.expressionView().bubbles).toEqual([]);
  });
});

describe("long-running late-game stress", () => {
  it.each([7, 43, 2026])("keeps entities bounded and finite through 10 simulated minutes, seed %i", (seed) => {
    const s = new Session("silver_cat", seededRandom(seed));
    s.tick(3, still);
    // A longevity fixture, not a claim that a normal player survives ten minutes.
    s.treatRemaining = 1000;
    const types = new Set<string>(), animals = new Set<string>();
    let peakBalls = 0, itemSeen = false;
    for (let frame = 0; frame < 60 * 610; frame++) {
      // A natural treat pickup refreshes this timer to 5s; restore the stress
      // fixture's immunity each step so longevity does not depend on pickups.
      s.treatRemaining = 1000;
      const a = s.animals.animal;
      const kick = !!a && Math.hypot(a.position.x - s.position.x, a.position.y - s.position.y) < C.kick.range;
      const angle = frame / 120;
      s.tick(1 / 60, { x: Math.cos(angle), y: Math.sin(angle) }, { kick, roll: frame % 900 === 0 });
      s.projectiles.forEach((ball) => types.add(ball.type));
      if (s.animals.animal) animals.add(s.animals.animal.type);
      itemSeen ||= !!s.items.item;
      peakBalls = Math.max(peakBalls, s.projectiles.length);
      if (frame % 60 === 0) {
        expect(s.health).toBe(3); expect(s.phase).toBe("PLAYING");
        expect(s.position.x).toBeGreaterThanOrEqual(C.court.x + C.player.radius);
        expect(s.position.x).toBeLessThanOrEqual(C.court.x + C.court.width - C.player.radius);
        expect(s.position.y).toBeGreaterThanOrEqual(C.court.y + C.player.radius);
        expect(s.position.y).toBeLessThanOrEqual(C.court.y + C.court.height - C.player.radius);
        for (const ball of s.projectiles) expect([ball.position.x, ball.position.y, ball.velocity.x, ball.velocity.y].every(Number.isFinite)).toBe(true);
        if (s.animals.animal) expect([s.animals.animal.position.x, s.animals.animal.position.y, s.animals.animal.speed].every(Number.isFinite)).toBe(true);
      }
    }
    expect(s.elapsed).toBeGreaterThan(590); expect(peakBalls).toBeLessThanOrEqual(C.projectiles.maxActive);
    expect(types.size).toBe(3); expect(animals.size).toBe(2); expect(itemSeen).toBe(true); expect(s.kickCount).toBeGreaterThan(5);
    expect(s.score).toBe(Math.floor(s.elapsed + 1e-8) * 10 + s.kickCount * 50);
  });
});
