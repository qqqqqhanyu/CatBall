import { test, expect, type Page } from "@playwright/test";
import type { Session } from "../../src/systems/Session";
import type { AudioController } from "../../src/systems/AudioController";

type Snapshot = ReturnType<Session["snapshot"]>;
type Sound = ReturnType<AudioController["snapshot"]>;
const state = (page: Page) => page.evaluate(() => {
  const game = (window as unknown as { __catball: { snapshot(): Snapshot; audio(): Sound } }).__catball;
  return { game: game.snapshot(), audio: game.audio() };
});
async function start(page: Page, scenario = "", pauseOnReady = false) {
  await page.goto(`./?seed=43&scenario=${scenario}`);
  await page.getByRole("button", { name: "开始游戏" }).click();
  await page.waitForFunction((pause) => {
    if (document.querySelector("#app")?.getAttribute("data-phase") !== "playing") return false;
    if (pause) document.querySelector<HTMLButtonElement>(".pause-button")!.click();
    return true;
  }, pauseOnReady);
}

test("guide is scrollable on a small phone and Escape never resumes the paused round", async ({ page }) => {
  await page.setViewportSize({ width: 568, height: 320 });
  await page.goto("./");
  await page.getByRole("button", { name: "玩法介绍" }).click();
  const guide = page.getByRole("dialog", { name: "怎么玩" });
  await expect(guide).toBeVisible();
  await expect(guide).toContainText("球不能踢");
  await expect(guide).toContainText("开局 3 颗心，最多 5 颗");
  const box = (await guide.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(568); expect(box.y + box.height).toBeLessThanOrEqual(320);
  expect(await page.locator(".guide-scroll").evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(true);
  await page.getByRole("button", { name: "知道了" }).click();
  await expect(page.getByRole("button", { name: "玩法介绍" })).toBeFocused();
  await page.getByRole("button", { name: "开始游戏" }).click();
  await expect(page.locator("#app")).toHaveAttribute("data-phase", "playing");
  await page.getByRole("button", { name: "暂停游戏" }).click();
  const before = (await state(page)).game;
  await page.getByRole("button", { name: "玩法介绍" }).click();
  await page.keyboard.press("Escape");
  await expect(guide).not.toBeVisible();
  expect((await state(page)).game).toEqual(before);
  await expect(page.getByRole("button", { name: "继续游戏" })).toBeVisible();
});

test("music plays, wraps at 60 seconds, pauses, resumes, restarts and remembers mute", async ({ page }) => {
  await start(page);
  await expect.poll(async () => (await state(page)).audio.paused).toBe(false);
  await expect.poll(async () => (await state(page)).audio.time).toBeGreaterThan(0.1);
  expect(await page.locator("#catball-music").evaluate((a: HTMLAudioElement) => a.duration)).toBeCloseTo(60, 0);
  expect((await state(page)).audio.loop).toBe(true);
  await page.locator("#catball-music").evaluate((a: HTMLAudioElement) => { a.currentTime = 59.65; });
  await expect.poll(async () => (await state(page)).audio.time).toBeLessThan(3);
  await page.getByRole("button", { name: "暂停游戏" }).click();
  const paused = (await state(page)).audio;
  expect(paused.paused).toBe(true);
  await page.waitForTimeout(150);
  expect((await state(page)).audio.time).toBeCloseTo(paused.time, 1);
  await page.getByRole("button", { name: "继续游戏" }).click();
  await expect.poll(async () => (await state(page)).audio.time).toBeGreaterThan(paused.time);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect.poll(async () => (await state(page)).audio.paused).toBe(true);
  await page.getByRole("button", { name: "声音：开" }).click();
  await page.getByRole("button", { name: "继续游戏" }).click();
  expect((await state(page)).audio.paused).toBe(true);
  await page.getByRole("button", { name: "暂停游戏" }).click();
  await page.getByRole("button", { name: "声音：关" }).click();
  await page.getByRole("button", { name: "重新开始" }).click();
  await expect(page.locator("#app")).toHaveAttribute("data-phase", "countdown");
  expect((await state(page)).audio.time).toBeLessThan(3);
  await page.getByRole("button", { name: "暂停游戏" }).click();
  await page.getByRole("button", { name: "声音：开" }).click();
  await page.getByRole("button", { name: "返回选人" }).click();
  expect((await state(page)).audio.paused).toBe(true);
  await page.reload();
  await expect(page.getByRole("button", { name: "声音：关" })).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#catball-music")).toHaveCount(1);
});

test("successful kicks meow once, while empty kicks and muted kicks remain silent", async ({ page }) => {
  for (const type of ["duck", "boar"]) {
    await start(page, `kick-${type}`, true);
    // Slow CI must not let the nearby animal dash away during input preparation.
    await page.evaluate(async () => {
      document.querySelector<HTMLButtonElement>("#resume-game")!.click();
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      document.querySelector<HTMLButtonElement>(".skill.kick")!.click();
    });
    await expect.poll(async () => (await state(page)).audio.meowCount).toBe(1);
    await page.getByRole("button", { name: "暂停游戏" }).click();
    const kicked = (await state(page)).game;
    expect(kicked.kickCount).toBe(1);
    await page.getByRole("button", { name: "继续游戏" }).click();
    await expect(page.locator(".skill.kick")).toBeEnabled();
    await page.getByRole("button", { name: "Kick 踢击" }).click();
    await expect.poll(async () => (await state(page)).game.lastKick?.success).toBe(false);
    expect((await state(page)).audio.meowCount).toBe(1);
  }
  await page.goto("./?seed=43&scenario=kick-duck");
  await page.getByRole("button", { name: "声音：开" }).click();
  await page.getByRole("button", { name: "开始游戏" }).click();
  await page.waitForFunction(() => {
    if (document.querySelector("#app")?.getAttribute("data-phase") !== "playing") return false;
    document.querySelector<HTMLButtonElement>(".skill.kick")!.click();
    return true;
  });
  await expect.poll(async () => (await state(page)).game.kickCount).toBe(1);
  expect((await state(page)).audio.meowCount).toBe(0);
});

test("HUD starts at 3/5, pumpkins improve initial health, and full HP never reports a false heal", async ({ page }) => {
  for (const scenario of ["pumpkin-start", "pumpkin-full"]) {
    await start(page, scenario);
    await expect(page.locator(".hearts svg")).toHaveCount(5);
    await expect(page.locator(".hearts svg:not(.lost)")).toHaveCount(scenario === "pumpkin-start" ? 3 : 5);
    const pickup = page.waitForFunction(() => {
      const s = (window as unknown as { __catball: { snapshot(): Snapshot } }).__catball.snapshot();
      return s.lastPickup ? { health: s.health, text: document.querySelector(".pickup-notice")?.textContent } : null;
    });
    await page.keyboard.down("ArrowRight");
    const result = await (await pickup).jsonValue();
    await page.keyboard.up("ArrowRight");
    expect(result).toEqual(scenario === "pumpkin-start" ? { health: 4, text: "南瓜 +1 ♥" } : { health: 5, text: "生命已满 · 5 ♥" });
    await page.getByRole("button", { name: "暂停游戏" }).click();
  }
});

test("unavailable music and blocked settings do not prevent gameplay or results", async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => { Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Disabled", "SecurityError"); } }); });
  await page.route("**/assets/audio/**", (route) => route.abort());
  await start(page);
  await expect(page.getByRole("dialog", { name: "GAME OVER" })).toBeVisible({ timeout: 35_000 });
  expect((await state(page)).audio.paused).toBe(true);
  expect(errors).toEqual([]);
});
