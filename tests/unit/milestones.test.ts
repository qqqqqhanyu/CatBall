import { describe, expect, it } from "vitest";
import { GAME_CONFIG as config } from "../../src/config/gameConfig";
import { CHARACTERS } from "../../src/data/characters";
import { Session } from "../../src/systems/Session";
import { moveWithinCourt } from "../../src/utils/geometry";
import { pickOpponents, seededRandom } from "../../src/utils/random";

function advance(session: Session, seconds: number, input = { x: 0, y: 0 }) {
  for (let i = 0; i < Math.round(seconds * 60); i++)
    session.tick(1 / 60, input);
}

describe("six characters, four different opponents", () => {
  for (const player of CHARACTERS) {
    it(`excludes ${player.name} and never duplicates an opponent`, () => {
      for (let seed = 0; seed < 40; seed++) {
        const opponents = pickOpponents(
          CHARACTERS,
          player.id,
          4,
          seededRandom(seed),
        );
        expect(opponents).toHaveLength(4);
        expect(new Set(opponents.map((c) => c.id)).size).toBe(4);
        expect(opponents.map((c) => c.id)).not.toContain(player.id);
      }
    });
  }
  it("can draw every remaining character across fresh sessions", () => {
    const draws = new Set(
      Array.from({ length: 50 }, (_, seed) =>
        new Session("silver_cat", seededRandom(seed)).opponents.join(","),
      ),
    );
    expect(draws.size).toBeGreaterThan(20);
    expect(new Session("silver_cat", seededRandom(29)).opponents).toEqual(
      new Session("silver_cat", seededRandom(29)).opponents,
    );
  });
});

describe("fixed world movement", () => {
  const origin = { x: 640, y: 400 };
  const move = (input: { x: number; y: number }, seconds = 0.5) =>
    moveWithinCourt(
      origin,
      input,
      seconds,
      config.player.speed,
      config.court,
      config.player.radius,
    );
  it("moves 192 world units per second and diagonal input cannot go faster", () => {
    const straight = move({ x: 1, y: 0 });
    const diagonal = move({ x: 1, y: 1 });
    expect(straight.x - origin.x).toBe(96);
    expect(
      Math.hypot(diagonal.x - origin.x, diagonal.y - origin.y),
    ).toBeCloseTo(96);
  });
  it("allows slow analog movement and caps an overdragged joystick", () => {
    expect(move({ x: 0.5, y: 0 }).x - origin.x).toBe(48);
    expect(move({ x: 8, y: 0 }).x - origin.x).toBe(96);
  });
  it("keeps the entire collision circle inside all four boundaries", () => {
    expect(move({ x: -1, y: -1 }, 100)).toEqual({ x: 214, y: 184 });
    expect(move({ x: 1, y: 1 }, 100)).toEqual({ x: 1066, y: 616 });
  });
  it("does not jump across the field when a delayed frame arrives", () => {
    const session = new Session("silver_cat");
    advance(session, 3);
    session.tick(30, { x: 1, y: 0 });
    expect(session.position.x - origin.x).toBeCloseTo(
      config.player.speed * config.maxDeltaSeconds,
    );
  });
});

describe("countdown and pause lifecycle", () => {
  it("blocks movement and time during countdown, then starts playing", () => {
    const session = new Session("silver_cat");
    advance(session, 2, { x: 1, y: 0 });
    expect(session.phase).toBe("COUNTDOWN");
    expect(session.elapsed).toBe(0);
    expect(session.position.x).toBe(640);
    advance(session, 1);
    expect(session.phase).toBe("PLAYING");
    expect(session.elapsed).toBe(0);
    advance(session, 1, { x: 1, y: 0 });
    expect(session.elapsed).toBeCloseTo(1);
    expect(session.position.x).toBeCloseTo(832);
  });
  it("freezes and resumes the countdown without resetting it", () => {
    const session = new Session("poodle");
    advance(session, 1);
    const remaining = session.countdown;
    session.pause();
    advance(session, 10);
    expect(session.countdown).toBe(remaining);
    expect(session.elapsed).toBe(0);
    session.resume();
    advance(session, 2);
    expect(session.phase).toBe("PLAYING");
  });
  it("freezes position and every game-time field during pause", () => {
    const session = new Session("point_cat");
    advance(session, 4);
    session.pause();
    const snapshot = session.snapshot();
    advance(session, 30, { x: -1, y: 1 });
    expect(session.snapshot()).toEqual(snapshot);
    session.resume();
    advance(session, 1, { x: -1, y: 0 });
    expect(session.elapsed).toBeCloseTo(2);
    expect(session.position.x).toBeCloseTo(448);
  });
  it("a new session resets time, input-facing, position and countdown", () => {
    const previous = new Session("white_cat");
    advance(previous, 6, { x: 1, y: 0 });
    const next = new Session("white_cat");
    expect(next.snapshot()).toMatchObject({
      phase: "COUNTDOWN",
      countdown: 3,
      elapsed: 0,
      position: { x: 640, y: 400 },
      facing: { x: 0, y: -1 },
    });
  });
});
