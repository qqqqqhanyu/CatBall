import { describe, expect, it, vi } from "vitest";
import { GAME_CONFIG as C } from "../../src/config/gameConfig";
import { characterStats } from "../../src/data/abilities";
import { Session } from "../../src/systems/Session";
import { ItemDirector, type ItemType } from "../../src/systems/ItemDirector";
import { seededRandom } from "../../src/utils/random";

const still = { x: 0, y: 0 };
function round(id: string) {
  const s = new Session(id, seededRandom(43));
  s.phase = "PLAYING"; s.countdown = 0; s.elapsed = 10;
  s.animals.spawnRemaining = Infinity; s.items.spawnRemaining = Infinity;
  vi.spyOn(s.attacks, "tick").mockReturnValue([]);
  return s;
}
function advance(s: Session, seconds: number, input = still) {
  for (let i = 0; i < Math.round(seconds * 100); i++) s.tick(0.01, input);
}
function pickup(s: Session, type: ItemType) {
  s.items.item = { type, position: { ...s.position }, remaining: 10 };
  s.tick(0.01, still);
}
function hit(s: Session) {
  s.projectiles = [{ projectileId: 100, ownerCharacterId: s.opponents[0], type: "NORMAL", position: { ...s.position }, velocity: still, radius: 10 }];
  s.tick(0.01, still);
}
function kick(s: Session) {
  s.animals.animal = { id: 1, type: "DUCK", position: { x: s.position.x + 60, y: s.position.y },
    heading: Math.PI, speed: 0, radius: C.animals.DUCK.radius, state: "WINDUP", stateRemaining: 0.45, distanceTravelled: 0 };
  s.tick(0.01, still, { kick: true });
}

describe("six player-only passives", () => {
  it.each([
    ["white_cat", 192, 10, 5, 3, 5, 17, 27],
    ["poodle", 192, 7, 5, 3, 5, 20, 30],
    ["silver_cat", 192, 10, 8, 3, 5, 20, 30],
    ["ragdoll_cat", 211.2, 10, 5, 3, 5, 20, 30],
    ["tabby_cat", 192, 10, 5, 4, 5, 20, 30],
    ["point_cat", 192, 10, 5, 3, 6, 20, 30],
  ] as const)("%s starts at three HP and changes only its own attribute", (id, speed, roll, treat, shock, health, min, max) => {
    const s = new Session(id, seededRandom(43));
    expect(s.health).toBe(3);
    expect(s.stats.speed).toBeCloseTo(speed);
    expect(s.stats).toMatchObject({ rollCooldownSeconds: roll, treatSeconds: treat, shockedSeconds: shock, maxHealth: health, itemSpawnSeconds: { min, max } });
    expect(s.items.spawnRemaining).toBeGreaterThanOrEqual(min);
    expect(s.items.spawnRemaining).toBeLessThanOrEqual(max);
    expect(s.animals.spawnRemaining).toBeGreaterThanOrEqual(18);
    expect(s.animals.spawnRemaining).toBeLessThanOrEqual(32);
    expect(s.opponents).not.toContain(id);
  });

  it.each([0, 0.5, 1])("Yuanxiao uses 17–27s for the initial wait, pickup and expiry (random=%s)", (random) => {
    const items = new ItemDirector(() => random, characterStats("white_cat").itemSpawnSeconds);
    const expected = 17 + random * 10;
    expect(items.spawnRemaining).toBe(expected);
    items.item = { type: "PUMPKIN", position: still, remaining: 10 };
    expect(items.take()).toBe("PUMPKIN"); expect(items.spawnRemaining).toBe(expected);
    items.item = { type: "CAT_TREAT", position: still, remaining: 0.01 };
    items.tick(0.01, { x: 600, y: 400 }, null);
    expect(items.item).toBeNull(); expect(items.spawnRemaining).toBe(expected);
  });

  it("Huanhuan can roll again at 7s; everyone else must wait 10s", () => {
    for (const id of ["poodle", "silver_cat"]) {
      const s = round(id), start = { ...s.position };
      s.tick(0.01, { x: 1, y: 0 }, { roll: true }); advance(s, 0.44);
      expect(s.position.x - start.x).toBeCloseTo(144); expect(s.rollRemaining).toBe(0);
      advance(s, 6.54); // 6.99s since the first roll.
      s.tick(0.01, still, { roll: true }); expect(s.rollRemaining).toBe(0);
      s.tick(0.01, still, { roll: true });
      expect(s.rollRemaining > 0).toBe(id === "poodle");
    }
  });

  it("Jianguo is protected beyond 5s, expires at 8s, and repeated treats reset instead of stacking", () => {
    const s = round("silver_cat"); pickup(s, "CAT_TREAT");
    expect(s.treatRemaining).toBe(8);
    advance(s, 5.5); hit(s); expect(s.health).toBe(3);
    s.projectiles = []; pickup(s, "CAT_TREAT"); expect(s.treatRemaining).toBe(8);
    s.hurtRemaining = 1.2; s.tick(0.01, still, { roll: true }); advance(s, 7.99);
    expect(s.treatRemaining).toBeCloseTo(0); expect(s.rollRemaining).toBe(0); expect(s.hurtRemaining).toBe(0);
    hit(s); expect(s.health).toBe(2);
    const other = round("white_cat"); pickup(other, "CAT_TREAT"); expect(other.treatRemaining).toBe(5);
  });

  it("Afu gains 10% walking speed with normalized diagonals and analog input, while roll stays 144 units", () => {
    for (const [input, multiplier] of [[{ x: 1, y: 0 }, 1], [{ x: 1, y: 1 }, 1], [{ x: 0.5, y: 0 }, 0.5]] as const) {
      const s = round("ragdoll_cat"), start = { ...s.position };
      advance(s, 1, input);
      expect(Math.hypot(s.position.x - start.x, s.position.y - start.y)).toBeCloseTo(211.2 * multiplier);
    }
    const s = round("ragdoll_cat"), start = s.position.x;
    s.tick(0.01, { x: 1, y: 0 }, { roll: true }); advance(s, 0.44);
    expect(s.position.x - start).toBeCloseTo(144);
    s.position.x = C.court.x + C.court.width - C.player.radius - 1;
    s.tick(0.05, { x: 1, y: 0 });
    expect(s.position.x).toBe(C.court.x + C.court.width - C.player.radius);
  });

  it("Qiuqiu retains 0.5s hit-stop, then shocks all four throwers for 4s; a miss grants no shock", () => {
    const s = round("tabby_cat"); kick(s);
    expect(s.hitStopRemaining).toBe(0.5); expect(s.animals.animal).toBeNull(); expect(s.kickCount).toBe(1);
    advance(s, 0.5); expect(s.shockedRemaining).toBe(4); expect(s.elapsed).toBe(10);
    advance(s, 3.1);
    expect(s.shockedRemaining).toBeCloseTo(0.9);
    for (const id of s.opponents) expect(s.expressionView().states[id]).toBe("SURPRISED");
    expect(s.attacks.tick).toHaveBeenLastCalledWith(0.01, s.elapsed, s.position, 0, 0.5);
    s.pause(); const frozen = s.snapshot(); advance(s, 1); expect(s.snapshot()).toEqual(frozen); s.resume();
    advance(s, 0.91);
    expect(s.shockedRemaining).toBe(0);
    expect(vi.mocked(s.attacks.tick).mock.lastCall?.[4]).toBeCloseTo(1);
    s.tick(0.01, still, { kick: true }); expect(s.lastKick?.success).toBe(false); expect(s.shockedRemaining).toBe(0);
    const other = round("silver_cat"); kick(other); advance(other, 0.5); expect(other.shockedRemaining).toBe(3);
  });

  it("Saisai heals 3→4→5→6, caps at six, takes six hits to die, and restarts at three", () => {
    const s = round("point_cat");
    for (const expected of [4, 5, 6, 6]) {
      const before = s.health; pickup(s, "PUMPKIN");
      expect(s.health).toBe(expected); expect(s.lastPickup?.healed).toBe(expected - before);
    }
    for (const expected of [5, 4, 3, 2, 1, 0]) {
      s.hurtRemaining = 0; hit(s); expect(s.health).toBe(expected);
      expect(s.phase).toBe(expected ? "PLAYING" : "GAME_OVER");
    }
    expect(new Session("point_cat").health).toBe(3);
    const other = round("white_cat"); other.health = 5; pickup(other, "PUMPKIN"); expect(other.health).toBe(5);
  });

  it("switching or restarting characters never mutates baseline or another round's stats", () => {
    const baseline = JSON.stringify(C), original = new Session("silver_cat").stats;
    for (const id of ["point_cat", "white_cat", "poodle", "tabby_cat", "ragdoll_cat", "silver_cat"]) new Session(id);
    expect(new Session("silver_cat").stats).toEqual(original);
    expect(JSON.stringify(C)).toBe(baseline);
    const s = round("point_cat"), snapshot = s.snapshot(); snapshot.stats.itemSpawnSeconds.min = 0;
    expect(s.stats.itemSpawnSeconds.min).toBe(20);
  });
});
