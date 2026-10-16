import { describe, it, expect } from "vitest";
import { CharacterAnimation } from "../../src/systems/CharacterAnimation";

describe("character movement animation", () => {
  it("cycles all four leg poses over one stride, irrespective of frame rate", () => {
    const poses = new CharacterAnimation();
    const frames = Array.from(
      { length: 4 },
      () => poses.update(0.125, 24, false).frame,
    );
    expect(frames).toEqual([1, 2, 3, 0]);
    const slow = new CharacterAnimation(),
      fast = new CharacterAnimation();
    for (let i = 0; i < 15; i++) slow.update(1 / 30, 192 / 30, false);
    for (let i = 0; i < 60; i++) fast.update(1 / 120, 192 / 120, false);
    expect(slow.snapshot()).toEqual(fast.snapshot());
  });
  it("analog walking advances more slowly and stopping at a wall returns to idle", () => {
    const normal = new CharacterAnimation(),
      slow = new CharacterAnimation();
    expect(normal.update(0.25, 48, false)).toEqual({ state: "walk", frame: 2 });
    expect(slow.update(0.25, 12, false)).toEqual({ state: "walk", frame: 0 });
    expect(normal.update(0.1, 0, false)).toEqual({ state: "idle", frame: 0 });
  });
  it("freezes the exact leg pose while paused and resumes from that pose", () => {
    const a = new CharacterAnimation();
    const before = a.update(0.125, 30, false);
    expect(a.update(10, 200, true)).toEqual(before);
    expect(a.update(0.01, 1, false)).toEqual(before);
  });
  it("one-shot actions own their frames, freeze with the game, and release walking", () => {
    const a = new CharacterAnimation();
    expect(a.playAction({ state: "kick", frameCount: 4, duration: 0.4 })).toBe(
      true,
    );
    expect(a.update(0.15, 60, false)).toEqual({ state: "kick", frame: 1 });
    expect(a.playAction({ state: "roll", frameCount: 4, duration: 0.45 })).toBe(
      false,
    );
    expect(a.update(3, 0, true)).toEqual({ state: "kick", frame: 1 });
    expect(a.update(0.3, 0, false)).toEqual({ state: "idle", frame: 0 });
    expect(a.update(0.125, 30, false)).toEqual({ state: "walk", frame: 1 });
  });
});
