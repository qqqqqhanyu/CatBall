import { describe, expect, it } from "vitest";
import { GAME_CONFIG as C } from "../../src/config/gameConfig";
import { Session } from "../../src/systems/Session";
import { AnimalDirector, type AnimalType } from "../../src/systems/AnimalDirector";
import { ItemDirector } from "../../src/systems/ItemDirector";
import { ExpressionSystem, type ExpressionContext } from "../../src/systems/ExpressionSystem";
import { AttackDirector } from "../../src/systems/AttackDirector";
import { seededRandom } from "../../src/utils/random";
import { placeBubbles, overlapArea } from "../../src/render/bubbleLayout";
import { EXPRESSION_WINDOWS } from "../../src/render/expressionAssets";
import { CHARACTERS } from "../../src/data/characters";

const still = { x: 0, y: 0 };
function session() { const s = new Session("silver_cat", seededRandom(43)); s.phase = "PLAYING"; s.countdown = 0; s.elapsed = 10; return s; }
function advance(s: Session, seconds: number, input = still) { for (let i = 0; i < Math.round(seconds * 60); i++) s.tick(1 / 60, input); }
function animal(s: Session, type: AnimalType = "DUCK", offset = 60) {
  s.animals.animal = { id: 1, type, position: { x: s.position.x + offset, y: s.position.y }, heading: Math.PI, speed: C.animals[type].speed,
    radius: C.animals[type].radius, state: "CHASE", stateRemaining: 3, distanceTravelled: 0 };
  return s.animals.animal;
}
function ball(s: Session, id = 100, owner = s.opponents[0]) {
  return { projectileId: id, ownerCharacterId: owner, type: "NORMAL" as const, position: { ...s.position }, velocity: { x: 240, y: 0 }, radius: C.projectiles.NORMAL.radius };
}

describe("persistent animals and telegraphed dashes", () => {
  for (const type of ["DUCK", "BOAR"] as const) {
    it(`${type} warns, dashes faster, tracks a turning target and survives contact`, () => {
      const s = session(), a = animal(s, type, 300);
      a.stateRemaining = 0.01;
      s.treatRemaining = 100;
      s.tick(0.02, still);
      expect(a.state).toBe("WINDUP");
      const originalHeading = a.heading;
      s.position.y -= 100;
      advance(s, 0.5);
      expect(a.state).toBe("DASH");
      expect(a.speed).toBeGreaterThan(C.animals[type].speed);
      expect(a.heading).not.toBe(originalHeading);
      expect(s.animals.animal?.id).toBe(1);
      expect(s.health).toBe(3);
      advance(s, 1.5);
      expect(a.state).toBe("CHASE");
      a.position = { ...s.position }; s.treatRemaining = 0;
      s.tick(1 / 60, still);
      expect(s.health).toBe(2);
      expect(s.lastHit?.source).toBe("ANIMAL");
      expect(s.lastHit?.ownerCharacterId).toBeNull();
      expect(s.animals.animal).toBe(a);
      expect(Math.hypot(a.position.x - s.position.x, a.position.y - s.position.y)).toBeGreaterThan(20);
    });
  }
  it("spawns safely after 18–32 seconds, never adds a second animal, and has no timeout", () => {
    const d = new AnimalDirector(seededRandom(99));
    expect(d.spawnRemaining).toBeGreaterThanOrEqual(18); expect(d.spawnRemaining).toBeLessThanOrEqual(32);
    const player = { x: 215, y: 185 };
    while (!d.animal) d.tick(0.05, 20, player);
    const a = d.animal!;
    expect(Math.hypot(a.position.x - player.x, a.position.y - player.y)).toBeGreaterThanOrEqual(C.animals.spawnClearance);
    for (let i = 0; i < 10000; i++) d.tick(0.05, i * 0.05, player);
    expect(d.animal?.id).toBe(a.id);
    expect(d.animal?.speed).toBeLessThanOrEqual(C.animals[a.type].dashSpeed * 1.35);
  });
  it("caps turning during a dash instead of snapping toward a new target", () => {
    const s = session(), a = animal(s, "BOAR", 200);
    a.state = "DASH"; a.stateRemaining = 0.8; a.heading = 0;
    s.animals.tick(0.05, 10, s.position);
    expect(Math.abs(a.heading)).toBeCloseTo(90 * Math.PI / 180 * 0.05);
  });
});

describe("Kick, hit-stop and shock", () => {
  it("kicks at the inclusive 72-unit boundary; an empty kick consumes cooldown and never destroys balls", () => {
    const s = session(); animal(s, "DUCK", 72);
    s.tick(1 / 60, still, { kick: true });
    expect(s.kickCount).toBe(1); expect(s.animals.animal).toBeNull(); expect(s.animals.kicked?.type).toBe("DUCK");
    expect(s.score).toBe(150); expect(s.hitStopRemaining).toBe(0.5);
    const miss = session(); animal(miss, "BOAR", 73);
    miss.projectiles = [{ ...ball(miss), position: { x: 300, y: 200 } }];
    miss.tick(1 / 60, still, { kick: true });
    expect(miss.kickCooldown).toBeGreaterThan(0.7); expect(miss.kickCount).toBe(0);
    expect(miss.projectiles).toHaveLength(1); expect(miss.hitStopRemaining).toBe(0); expect(miss.animals.animal).not.toBeNull();
  });
  it("wins over same-frame animal contact and freezes all gameplay for 0.5s before a full 3s shock", () => {
    const s = session(); animal(s, "BOAR", 10);
    s.projectiles = [ball(s)]; s.items.item = { type: "CAT_TREAT", position: { x: 400, y: 400 }, remaining: 8 };
    s.tick(1 / 60, still, { kick: true });
    const frozen = s.snapshot();
    expect(s.health).toBe(3); expect(s.shockedRemaining).toBe(0);
    expect(s.expressionView().bubbles).toHaveLength(5);
    for (let i = 0; i < 9; i++) s.tick(0.05, { x: 1, y: 0 });
    s.tick(0.04, still);
    expect(s.elapsed).toBe(frozen.elapsed); expect(s.projectiles).toEqual(frozen.projectiles);
    expect(s.kickCooldown).toBe(0.8); expect(s.items.item?.remaining).toBe(8);
    expect(s.animals.spawnRemaining).toBe(frozen.animalSpawnRemaining); expect(s.shockedRemaining).toBe(0);
    s.tick(0.01, still);
    expect(s.hitStopRemaining).toBe(0); expect(s.shockedRemaining).toBe(3); expect(s.elapsed).toBe(10);
    s.tick(0.05, still);
    expect(s.shockedRemaining).toBeCloseTo(2.95);
  });
  it("shock halves movement, global attack-clock and windup progress, without slowing flying balls", () => {
    const normal = new AttackDirector(["a", "b", "c", "d"], () => 0.6), shocked = new AttackDirector(["a", "b", "c", "d"], () => 0.6);
    const before = normal.snapshot();
    normal.tick(0.05, 10, { x: 640, y: 400 }, 0);
    shocked.tick(0.05, 10, { x: 640, y: 400 }, 0, 0.5);
    expect(before.nextAttack - normal.snapshot().nextAttack).toBeCloseTo(2 * (before.nextAttack - shocked.snapshot().nextAttack));
    expect(normal.throwers[0].distance - before.throwers[0].distance).toBeCloseTo(2 * (shocked.throwers[0].distance - before.throwers[0].distance));
    const winding = new AttackDirector(["a", "b", "c", "d"], () => 0.6);
    while (!winding.throwers.some((t) => t.windup)) winding.tick(0.05, 10, { x: 640, y: 400 }, 0);
    const owner = winding.throwers.find((t) => t.windup)!;
    const remaining = owner.windup!.remaining;
    winding.tick(0.05, 10, { x: 640, y: 400 }, 0, 0.5);
    expect(owner.windup!.remaining).toBeCloseTo(remaining - 0.025);
    const s = session(); s.shockedRemaining = 3;
    s.projectiles = [{ ...ball(s), position: { x: 100, y: 100 } }];
    s.tick(0.05, still); expect(s.projectiles[0].position.x).toBe(112);
  });
});

describe("Roll and overlapping immunity sources", () => {
  it("locks direction for 144 units / 0.45s, takes priority over Kick and hides every bubble", () => {
    const s = session(); animal(s, "DUCK", 10); s.projectiles = [ball(s)];
    const start = { ...s.position };
    s.tick(0.05, { x: 1, y: 0 }, { roll: true, kick: true });
    expect(s.health).toBe(3); expect(s.kickCooldown).toBe(0); expect(s.kickCount).toBe(0);
    expect(s.expressionView().bubbles).toEqual([]);
    for (let i = 0; i < 8; i++) s.tick(0.05, { x: -1, y: 0 }, { kick: true });
    expect(s.position.x - start.x).toBeCloseTo(144); expect(s.position.y).toBe(start.y);
    expect(s.rollRemaining).toBe(0); expect(s.rollCooldown).toBeCloseTo(9.55); expect(s.kickCooldown).toBe(0);
  });
  it("stops at the court boundary without ending roll immunity early", () => {
    const s = session(); s.position.x = 1060;
    s.tick(0.05, { x: 1, y: 0 }, { roll: true });
    expect(s.position.x).toBe(1066); expect(s.rollRemaining).toBeCloseTo(0.4);
    expect(s.isInvulnerable).toBe(true);
    s.pause(); const state = s.snapshot(); advance(s, 2); expect(s.snapshot()).toEqual(state);
  });
  it("one immunity expiring does not cancel the others, and Jianguo's repeated treats reset to 8s", () => {
    const s = session(); s.treatRemaining = 3; s.hurtRemaining = 1.2;
    s.tick(0.05, still, { roll: true }); advance(s, 0.5);
    expect(s.rollRemaining).toBe(0); expect(s.isInvulnerable).toBe(true);
    s.projectiles.push(ball(s)); s.tick(0.05, still); expect(s.health).toBe(3);
    s.items.item = { type: "CAT_TREAT", position: { ...s.position }, remaining: 9 };
    s.tick(0.05, still); expect(s.treatRemaining).toBe(8);
    s.items.item = { type: "CAT_TREAT", position: { ...s.position }, remaining: 9 };
    s.tick(0.05, still); expect(s.treatRemaining).toBe(8);
    s.treatRemaining = 0; s.hurtRemaining = 0.8; expect(s.isInvulnerable).toBe(true);
  });
  it("animals keep tracking and moving throughout a player's roll and treat immunity", () => {
    const s = session(), a = animal(s, "DUCK", 250); s.treatRemaining = 5;
    const p = { ...a.position }, heading = a.heading;
    s.tick(0.05, { x: 0, y: -1 }, { roll: true });
    expect(a.position).not.toEqual(p); expect(a.heading).not.toBe(heading); expect(s.health).toBe(3);
  });
});

describe("pickups and their clocks", () => {
  it("a normal three-HP start benefits from two pumpkins and a new round returns to three", () => {
    const s = session();
    expect(s.health).toBe(3);
    for (const expected of [4, 5]) {
      s.items.item = { type: "PUMPKIN", position: { ...s.position }, remaining: 5 };
      s.tick(0.05, still);
      expect(s.health).toBe(expected);
      expect(s.lastPickup?.healed).toBe(1);
    }
    expect(new Session(s.playerId).health).toBe(3);
  });
  it("five HP still takes one damage per valid hit and ends exactly at zero", () => {
    const s = session(); s.health = 5;
    for (const expected of [4, 3, 2, 1, 0]) {
      s.hurtRemaining = 0;
      s.projectiles = [ball(s)];
      s.tick(0.05, still);
      expect(s.health).toBe(expected);
      expect(s.phase).toBe(expected ? "PLAYING" : "GAME_OVER");
    }
  });
  it("pumpkin heals one through five HP, never overfills, and a treat protects on its pickup frame", () => {
    const s = session(); s.health = 2;
    for (const health of [3, 4, 5, 5]) {
      const before = s.health;
      s.items.item = { type: "PUMPKIN", position: { ...s.position }, remaining: 5 };
      s.tick(0.05, still); expect(s.health).toBe(health); expect(s.items.item).toBeNull();
      expect(s.lastPickup?.healed).toBe(health - before);
    }
    s.items.item = { type: "CAT_TREAT", position: { ...s.position }, remaining: 5 }; s.projectiles.push(ball(s));
    s.tick(0.05, still); expect(s.health).toBe(5); expect(s.hitCount).toBe(0); expect(s.projectiles).toHaveLength(1);
  });
  it("spawns one safe item after 20–30s, expires after 10s, and schedules a fresh interval", () => {
    const d = new ItemDirector(seededRandom(3));
    expect(d.spawnRemaining).toBeGreaterThanOrEqual(20); expect(d.spawnRemaining).toBeLessThanOrEqual(30);
    const player = { x: 640, y: 400 }, a = animal(session(), "BOAR", 150);
    while (!d.item) d.tick(0.05, player, a);
    const item = d.item!;
    expect(Math.hypot(item.position.x - player.x, item.position.y - player.y)).toBeGreaterThanOrEqual(100);
    expect(Math.hypot(item.position.x - a.position.x, item.position.y - a.position.y)).toBeGreaterThanOrEqual(70 + a.radius);
    for (let i = 0; i < 199; i++) d.tick(0.05, player, a);
    expect(d.item).toBe(item); d.tick(0.05, player, a); expect(d.item).toBeNull();
    expect(d.spawnRemaining).toBeGreaterThanOrEqual(20);
  });
  it("pause freezes item expiry, animal dash, skill cooldowns, invulnerability and expression timing", () => {
    const s = session(); animal(s); s.items.item = { type: "PUMPKIN", position: { x: 500, y: 500 }, remaining: 9 };
    s.treatRemaining = 4; s.hurtRemaining = 1; s.rollCooldown = 8; s.shockedRemaining = 2;
    s.expressions.onHit(s.opponents[2], s.elapsed);
    s.pause(); const before = s.snapshot(); advance(s, 100, { x: 1, y: 1 }); expect(s.snapshot()).toEqual(before);
    s.resume(); s.tick(0.05, still); expect(s.items.item?.remaining).toBeCloseTo(8.95);
  });
  it("a new round clears every combat, item and expression state", () => {
    const old = session(); animal(old); old.tick(1 / 60, still, { kick: true });
    const fresh = new Session("silver_cat", seededRandom(43));
    expect(fresh.snapshot()).toMatchObject({ kickCount: 0, rollCooldown: 0, treatRemaining: 0, hitStopRemaining: 0, shockedRemaining: 0, animal: null, item: null, lastPickup: null, lastHit: null, health: 3 });
    expect(fresh.expressionView().bubbles.every((b) => b.expression === "FOCUSED")).toBe(true);
  });
});

describe("four expressions, exact hit attribution and original portraits", () => {
  const ids = ["white_cat", "poodle", "tabby_cat", "point_cat"];
  const context: ExpressionContext = { elapsed: 10, opening: false, rolling: false, hitStop: false, shocked: false, dead: false };
  it("opening shows all focused faces; a hit shows only the player and actual owner", () => {
    const e = new ExpressionSystem("silver_cat", ids);
    expect(e.view({ ...context, opening: true }).bubbles).toHaveLength(5);
    e.onHit("poodle", 10);
    expect(e.view(context).bubbles).toEqual([{ characterId: "silver_cat", expression: "SURPRISED" }, { characterId: "poodle", expression: "HAPPY" }]);
    expect(e.view(context).states.white_cat).toBe("FOCUSED");
    expect(e.view({ ...context, elapsed: 11.01 }).bubbles).toEqual([]);
  });
  it("Kick has exactly five bubbles; a later ball hit during shock shows only two and preserves owner surprise", () => {
    const e = new ExpressionSystem("silver_cat", ids); e.onKick(10);
    const kicked = e.view({ ...context, hitStop: true });
    expect(kicked.bubbles).toHaveLength(5); expect(kicked.states.silver_cat).toBe("CONFIDENT");
    expect(ids.every((id) => kicked.states[id] === "SURPRISED")).toBe(true);
    e.onHit("white_cat", 10.3);
    expect(e.view({ ...context, elapsed: 10.3, shocked: true }).bubbles).toEqual([
      { characterId: "silver_cat", expression: "SURPRISED" }, { characterId: "white_cat", expression: "SURPRISED" },
    ]);
    e.onHit(null, 10.4); expect(e.view({ ...context, elapsed: 10.4 }).bubbles).toHaveLength(1);
  });
  it("Roll hides all bubbles while events expire normally; no replay afterwards", () => {
    const e = new ExpressionSystem("silver_cat", ids); e.onKick(10);
    expect(e.view({ ...context, rolling: true, shocked: true }).bubbles).toEqual([]);
    e.onPickup("HAPPY", 10.2);
    expect(e.view({ ...context, elapsed: 10.8, rolling: true }).bubbles).toEqual([]);
    expect(e.view({ ...context, elapsed: 11.2 }).bubbles).toEqual([]);
    e.onPickup("CONFIDENT", 12);
    expect(e.view({ ...context, elapsed: 12 }).states.silver_cat).toBe("CONFIDENT");
  });
  it("uses distinct in-bounds original expression windows for each of the six identities", () => {
    for (const character of CHARACTERS) {
      const windows = Object.values(EXPRESSION_WINDOWS[character.id]);
      expect(windows).toHaveLength(4); expect(new Set(windows.map((w) => w.join(","))).size).toBe(4);
      for (const [x, y, w, h] of windows) { expect(x).toBeGreaterThanOrEqual(0); expect(y).toBeGreaterThanOrEqual(0); expect(x + w).toBeLessThanOrEqual(1122); expect(y + h).toBeLessThanOrEqual(1402); }
    }
  });
  it("fits five mobile bubbles inside the viewport without covering each other or controls", () => {
    const anchors = [
      { id: "player", x: 422, y: 190, height: 48, player: true }, { id: "top", x: 422, y: 72, height: 48 },
      { id: "right", x: 715, y: 180, height: 48 }, { id: "bottom", x: 422, y: 300, height: 48 }, { id: "left", x: 122, y: 180, height: 48 },
    ];
    const controls = [{ x: 10, y: 195, width: 120, height: 120 }, { x: 735, y: 150, width: 100, height: 180 }];
    const actors = anchors.map((a) => ({ x: a.x - 21, y: a.y - 48, width: 42, height: 55 }));
    const placed = placeBubbles(anchors, 844, 344, [...controls, ...actors]);
    expect(placed).toHaveLength(5);
    for (const box of placed) {
      expect(box.x).toBeGreaterThanOrEqual(0); expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(844); expect(box.y + box.height).toBeLessThanOrEqual(344);
      for (const other of placed) if (other !== box) expect(overlapArea(box, other)).toBe(0);
      for (const control of controls) expect(overlapArea(box, control)).toBe(0);
    }
  });
});
