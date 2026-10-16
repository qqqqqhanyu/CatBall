import { describe, expect, it, vi, afterEach } from "vitest";
import { GAME_CONFIG as C } from "../../src/config/gameConfig";
import { AttackDirector, launchProjectiles, type Projectile } from "../../src/systems/AttackDirector";
import { attackInterval, chooseProjectile, difficultyAt } from "../../src/systems/DifficultyDirector";
import { Session } from "../../src/systems/Session";
import { clamp, sweptCircleContact } from "../../src/utils/geometry";
import { seededRandom } from "../../src/utils/random";
import { readRecords, saveResult } from "../../src/utils/storage";

const ids = ["white_cat", "tabby_cat", "poodle", "point_cat"];
const still = { x: 0, y: 0 };
function advance(s: Session, seconds: number, input = still) {
  for (let i = 0; i < Math.round(seconds * 60); i++) s.tick(1 / 60, input);
}
function playing() { const s = new Session("silver_cat", seededRandom(7)); advance(s, 3); return s; }
function contact(s: Session, id = 1000, owner = ids[0]): Projectile {
  return { projectileId: id, ownerCharacterId: owner, type: "NORMAL", position: { ...s.position }, velocity: { x: 240, y: 0 }, radius: C.projectiles.NORMAL.radius };
}

describe("unified difficulty", () => {
  it("uses every specified stage boundary and speed cap", () => {
    expect([0, 29.99, 30, 60, 120, 180].map((t) => difficultyAt(t).interval)).toEqual([2.5, 2.5, 2, 1.5, 1.1, 0.8]);
    expect([0, 30, 60, 120, 180].map((t) => difficultyAt(t).specialChance)).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
    expect(difficultyAt(30).speedMultiplier).toBeCloseTo(1.08);
    expect(difficultyAt(180).speedMultiplier).toBeCloseTo(1.08 ** 6);
    expect(difficultyAt(210).speedMultiplier).toBeCloseTo(1.08 ** 6 + 0.04);
    expect(difficultyAt(600).speedMultiplier).toBe(1.9);
  });
  it("keeps jitter in range and splits special events equally", () => {
    const rng = seededRandom(19);
    const counts = { NORMAL: 0, SPREAD: 0, GIANT: 0 };
    for (let i = 0; i < 10000; i++) {
      const interval = attackInterval(180, rng);
      expect(interval).toBeGreaterThanOrEqual(0.64);
      expect(interval).toBeLessThanOrEqual(0.96);
      counts[chooseProjectile(180, rng)]++;
    }
    expect(counts.NORMAL / 10000).toBeCloseTo(0.5, 1);
    expect(counts.SPREAD / 10000).toBeCloseTo(0.25, 1);
    expect(counts.GIANT / 10000).toBeCloseTo(0.25, 1);
  });
});

describe("perimeter throwers and one attack clock", () => {
  it("starts one per side, stays outside the court, maintains spacing and rounds corners", () => {
    const d = new AttackDirector(ids, seededRandom(3));
    expect(d.throwers.map((t) => t.position)).toEqual([
      { x: 640, y: 120 }, { x: 1138, y: 409 }, { x: 640, y: 698 }, { x: 142, y: 409 },
    ]);
    const sides = new Set<string>();
    for (let i = 0; i < 3600; i++) {
      d.tick(1 / 60, i / 60, { x: 640, y: 400 }, 0);
      for (const t of d.throwers) {
        expect(t.position.x < 190 || t.position.x > 1090 || t.position.y < 160 || t.position.y > 640).toBe(true);
        if (t === d.throwers[0]) sides.add(t.position.y === 120 ? "top" : t.position.y === 698 ? "bottom" : "side");
        const nearestPlayer = { x: clamp(t.position.x, 214, 1066), y: clamp(t.position.y, 184, 616) };
        expect(Math.hypot(t.position.x - nearestPlayer.x, t.position.y - nearestPlayer.y)).toBeGreaterThan(C.projectiles.GIANT.radius + C.player.radius);
        for (const other of d.throwers) if (other !== t) {
          const gap = Math.abs(t.distance - other.distance), perimeter = 2 * (C.thrower.track.width + C.thrower.track.height);
          expect(Math.min(gap, perimeter - gap)).toBeGreaterThanOrEqual(C.thrower.minSeparation - 1e-8);
        }
      }
    }
    expect(sides.size).toBeGreaterThan(1);
  });
  it("stops during windup and aims at the release position, then resumes", () => {
    const d = new AttackDirector(ids, () => 0.6);
    let time = 0;
    while (!d.throwers.some((t) => t.windup)) { time += 0.05; d.tick(0.05, time, { x: 300, y: 300 }, 0); }
    const owner = d.throwers.find((t) => t.windup)!;
    const origin = { ...owner.position };
    let released: Projectile[] = [];
    const target = { x: 900, y: 500 };
    for (let i = 0; i < 10; i++) {
      time += 0.05;
      released.push(...d.tick(0.05, time, target, 0));
      expect(owner.position).toEqual(origin);
    }
    expect(released).toHaveLength(1);
    const ball = released[0];
    expect(ball.ownerCharacterId).toBe(owner.characterId);
    expect(Math.atan2(ball.velocity.y, ball.velocity.x)).toBeCloseTo(Math.atan2(target.y - origin.y, target.x - origin.x));
    d.tick(0.05, time + 0.05, target, 0);
    expect(owner.position).not.toEqual(origin);
    expect(d.attacksFired).toBe(1);
  });
  it("defers a full spread when only two slots remain and never catches up in a burst", () => {
    const d = new AttackDirector(ids, () => 0);
    for (let i = 0; i < 300; i++) expect(d.tick(0.05, i * 0.05, { x: 640, y: 400 }, 22)).toEqual([]);
    expect(d.attacksFired).toBe(0);
    expect(d.throwers.filter((t) => t.windup)).toHaveLength(1);
    const balls = d.tick(0.05, 15, { x: 800, y: 450 }, 21);
    expect(balls).toHaveLength(3);
    for (let i = 0; i < 39; i++) expect(d.tick(0.05, 15 + i * 0.05, { x: 640, y: 400 }, 0)).toEqual([]);
    expect(d.attacksFired).toBe(1);
  });
  it("uses a global event rate and prevents consecutive giants from the same owner", () => {
    const d = new AttackDirector(ids, seededRandom(23));
    let lastGiant: string | null = null;
    const counts = { NORMAL: 0, SPREAD: 0, GIANT: 0 };
    for (let i = 0; i < 36000; i++) {
      const balls = d.tick(1 / 60, 180 + i / 60, { x: 640, y: 400 }, 0);
      if (!balls.length) continue;
      counts[balls[0].type]++;
      if (balls[0].type === "GIANT") {
        expect(balls[0].ownerCharacterId).not.toBe(lastGiant);
        lastGiant = balls[0].ownerCharacterId;
      }
    }
    expect(d.attacksFired).toBeGreaterThan(680);
    expect(d.attacksFired).toBeLessThan(810);
    expect(counts.SPREAD).toBeGreaterThan(100);
    expect(counts.GIANT).toBeGreaterThan(100);
  });
});

describe("projectile trajectories and damage", () => {
  it("makes an exact +/-20 degree spread and a slower giant of 2.5x radius", () => {
    let id = 0;
    const launch = (type: "NORMAL" | "SPREAD" | "GIANT") => launchProjectiles("poodle", { x: 0, y: 0 }, { x: 100, y: 0 }, type, 1, () => ++id);
    const spread = launch("SPREAD");
    expect(spread.map((p) => Math.round(Math.atan2(p.velocity.y, p.velocity.x) * 180 / Math.PI))).toEqual([-20, 0, 20]);
    for (const p of spread) expect(Math.hypot(p.velocity.x, p.velocity.y)).toBeCloseTo(240);
    const normal = launch("NORMAL")[0], giant = launch("GIANT")[0];
    expect(giant.radius / normal.radius).toBeCloseTo(2.5);
    expect(Math.hypot(giant.velocity.x, giant.velocity.y)).toBeCloseTo(168);
    expect(new Set([...spread, normal, giant].map((p) => p.projectileId)).size).toBe(5);
  });
  it("continues straight when the player changes direction and removes only offscreen balls", () => {
    const s = playing();
    s.projectiles = launchProjectiles("poodle", { x: 100, y: 100 }, { x: 1000, y: 100 }, "NORMAL", 1, () => 900);
    const velocity = { ...s.projectiles[0].velocity };
    advance(s, 1, { x: 1, y: 1 });
    expect(s.projectiles[0].velocity).toEqual(velocity);
    expect(s.projectiles[0].position).toEqual({ x: 340, y: 100 });
    s.projectiles[0].position = { x: 1500, y: 100 };
    s.tick(1 / 60, still);
    expect(s.projectiles).toHaveLength(0);
  });
  it("detects fast crossing and grazing contacts without endpoint overlap", () => {
    expect(sweptCircleContact({ x: -100, y: 0 }, { x: 100, y: 0 }, still, still, 10)).toBeCloseTo(0.45);
    expect(sweptCircleContact({ x: -100, y: 10 }, { x: 100, y: 10 }, still, still, 10)).toBeCloseTo(0.5);
    expect(sweptCircleContact({ x: -100, y: 11 }, { x: 100, y: 11 }, still, still, 10)).toBeNull();
  });
  it("takes one hit per frame, attributes the actual owner and lets immune contacts pass", () => {
    const s = playing();
    s.projectiles = [contact(s, 70, "poodle"), contact(s, 71, "white_cat")];
    s.tick(1 / 60, still);
    expect(s.health).toBe(2);
    expect(s.hitCount).toBe(1);
    expect(s.lastHit?.ownerCharacterId).toBe("poodle");
    expect(s.projectiles.map((p) => p.projectileId)).toEqual([71]);
    const immuneBall = s.projectiles[0];
    const x = immuneBall.position.x;
    advance(s, 0.5, { x: -1, y: 0 });
    expect(s.health).toBe(2);
    expect(s.hitCount).toBe(1);
    expect(immuneBall.position.x).toBeCloseTo(x + 120);
    expect(s.position.x).toBeLessThan(640);
    advance(s, 0.7);
    s.projectiles.push(contact(s, 72));
    s.tick(1 / 60, still);
    expect(s.health).toBe(1);
  });
  it("giant damage is still one HP; zero HP freezes everything and a new run is clean", () => {
    const s = playing();
    s.health = 1;
    s.projectiles = [{ ...contact(s), type: "GIANT", radius: C.projectiles.GIANT.radius }];
    s.tick(1 / 60, still);
    expect(s.phase).toBe("GAME_OVER");
    expect(s.health).toBe(0);
    const snapshot = s.snapshot();
    s.pause(); s.resume(); advance(s, 30, { x: 1, y: 1 });
    expect(s.snapshot()).toEqual(snapshot);
    const next = new Session("silver_cat");
    expect(next.health).toBe(3);
    expect(next.projectiles).toEqual([]);
    expect(next.hitCount).toBe(0);
    expect(next.attacks.attacksFired).toBe(0);
    expect(next.elapsed).toBe(0);
  });
  it("does not retroactively damage a crossing that finished before immunity expired inside a frame", () => {
    const s = playing();
    s.hurtRemaining = 0.04;
    s.projectiles = [{ ...contact(s), position: { x: s.position.x - 60, y: s.position.y }, velocity: { x: 4000, y: 0 } }];
    s.tick(0.05, still);
    expect(s.health).toBe(3);
    expect(s.hitCount).toBe(0);
    expect(s.projectiles).toHaveLength(1);
    expect(s.hurtRemaining).toBe(0);
  });
  it("freezes active balls, windup, hurt immunity and scores across pause", () => {
    const s = playing();
    s.projectiles.push(contact(s));
    s.tick(1 / 60, still);
    // An independent live ball, with no player contact.
    s.projectiles.push({ ...contact(s, 2000), position: { x: 100, y: 100 } });
    s.pause(); const paused = s.snapshot(); advance(s, 20, { x: 1, y: 0 });
    expect(s.snapshot()).toEqual(paused);
    s.resume(); s.tick(1 / 60, still);
    expect(s.hurtRemaining).toBeLessThan(paused.hurtRemaining);
    while (!s.attacks.throwers.some((t) => t.windup)) s.tick(1 / 60, still);
    s.pause(); const windup = s.snapshot(); advance(s, 20);
    expect(s.snapshot()).toEqual(windup);
  });
  it("is reproducible with a seed and scores only effective survival seconds", () => {
    const a = new Session("poodle", seededRandom(18)), b = new Session("poodle", seededRandom(18));
    advance(a, 8); advance(b, 8);
    expect(a.snapshot()).toEqual(b.snapshot());
    expect(a.score).toBe(50);
  });
});

describe("local survival records", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("preserves both independent bests and survives malformed or blocked storage", () => {
    const data = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) });
    expect(saveResult(30.5, 300)).toEqual({ survivalSeconds: 30.5, score: 300 });
    expect(saveResult(20, 400)).toEqual({ survivalSeconds: 30.5, score: 400 });
    data.set(C.recordsKey, "bad json");
    expect(readRecords()).toEqual({ survivalSeconds: 0, score: 0 });
    data.set(C.recordsKey, '{"survivalSeconds":-1,"score":"oops"}');
    expect(readRecords()).toEqual({ survivalSeconds: 0, score: 0 });
    vi.stubGlobal("localStorage", { getItem: () => { throw Error("blocked"); }, setItem: () => { throw Error("blocked"); } });
    expect(saveResult(10, 100)).toEqual({ survivalSeconds: 10, score: 100 });
  });
});
