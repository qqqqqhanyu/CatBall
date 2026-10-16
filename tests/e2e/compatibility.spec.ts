import { test, expect, type Page } from "@playwright/test";
import type { Session } from "../../src/systems/Session";

type Snapshot = ReturnType<Session["snapshot"]>;
const snapshot = (page: Page) => page.evaluate(() => (window as unknown as { __catball: { snapshot(): Snapshot } }).__catball.snapshot());
async function start(page: Page) {
  await page.getByRole("button", { name: "开始游戏" }).click();
  await expect(page.locator("#app")).toHaveAttribute("data-phase", "playing");
}
async function withinViewport(page: Page, selectors: string[]) {
  const viewport = page.viewportSize()!;
  // Read a single layout snapshot instead of dozens of remote round trips while
  // the live game continues rendering on a slow CI worker.
  const groups = await page.evaluate((selectors) => selectors.map((selector) => ({
    selector,
    boxes: [...document.querySelectorAll<HTMLElement>(selector)].map((element) => {
      const box = element.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height,
        visible: element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden" };
    }),
  })), selectors);
  for (const { selector, boxes } of groups) {
    expect(boxes.length, selector).toBeGreaterThan(0);
    for (const box of boxes) {
      expect(box.visible, selector).toBe(true); expect(box.width, selector).toBeGreaterThan(0); expect(box.height, selector).toBeGreaterThan(0);
      expect(box.x, selector).toBeGreaterThanOrEqual(-1); expect(box.y, selector).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width, selector).toBeLessThanOrEqual(viewport.width + 1); expect(box.y + box.height, selector).toBeLessThanOrEqual(viewport.height + 1);
    }
  }
}

test("small phones through tablets keep selection, HUD, controls and pause actions reachable", async ({ page }) => {
  test.setTimeout(60_000);
  for (const [width, height] of [[568, 320], [667, 375], [844, 390], [915, 412], [1024, 768]]) {
    await page.setViewportSize({ width, height });
    await page.goto("./");
    await withinViewport(page, [".character-card", "#start-game"]);
    await page.getByRole("button", { name: "开始游戏" }).click();
    // Capture GO and its short-lived opening bubbles together, before they expire.
    const opening = await page.waitForFunction(() => {
      const game = (window as unknown as { __catball?: { snapshot(): Snapshot | null } }).__catball;
      const state = game?.snapshot();
      if (state?.phase !== "PLAYING" || state.elapsed >= 0.45) return null;
      const faces = [...document.querySelectorAll<HTMLElement>(".expression-bubble:not([hidden])")].map((e) => e.getBoundingClientRect());
      const words = [...document.querySelectorAll<HTMLElement>(".countdown strong, .countdown span")].map((e) => e.getBoundingClientRect());
      const overlap = faces.some((a) => words.some((b) => Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top)));
      return { count: faces.length, overlap };
    });
    expect(await opening.jsonValue()).toEqual({ count: 5, overlap: false });
    await withinViewport(page, ["#phaser-host canvas", ".hud", ".joystick", ".skill.roll", ".skill.kick"]);
    await page.getByRole("button", { name: "暂停游戏" }).click();
    await withinViewport(page, ["#resume-game", "#restart-game", "#return-menu"]);
  }
});

test("blur and rotation freeze clocks, clear held movement, and preserve the fixed world", async ({ page }) => {
  await page.goto("./"); await start(page);
  await page.keyboard.down("ArrowRight");
  await expect.poll(async () => (await snapshot(page)).position.x).toBeGreaterThan(665);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.locator("#app")).toHaveAttribute("data-phase", "paused");
  const frozen = await snapshot(page);
  await page.waitForTimeout(300); expect(await snapshot(page)).toEqual(frozen);
  await page.keyboard.up("ArrowRight");
  await page.getByRole("button", { name: "继续游戏" }).click();
  await page.waitForTimeout(150); expect((await snapshot(page)).position).toEqual(frozen.position);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "转一下，操场更宽阔" })).toBeVisible();
  await expect(page.locator("#app")).toHaveAttribute("data-phase", "paused");
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole("button", { name: "继续游戏" }).click();
  expect((await snapshot(page)).position).toEqual(frozen.position);
  await page.getByRole("button", { name: "Roll 翻滚" }).click();
  await page.waitForFunction(() => {
    const s = (window as unknown as { __catball: { snapshot(): Snapshot } }).__catball.snapshot();
    return s.rollRemaining > 0 && s.isInvulnerable && document.querySelectorAll(".expression-bubble:not([hidden])").length === 0;
  });
  await expect.poll(async () => (await snapshot(page)).rollRemaining).toBe(0);
  await page.getByRole("button", { name: "Kick 踢击" }).click();
  await expect.poll(async () => (await snapshot(page)).lastKick).not.toBeNull();
});

test("a completed round keeps independent best records across a reload", async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./?seed=43");
  await page.evaluate(() => localStorage.setItem("catball.records.v1", JSON.stringify({ survivalSeconds: 999, score: 1 })));
  await start(page);
  await expect(page.getByRole("dialog", { name: "GAME OVER" })).toBeVisible({ timeout: 35_000 });
  const finished = await snapshot(page);
  await expect(page.locator("#record-time")).toHaveText("16:39");
  await expect(page.locator("#record-score")).toHaveText(String(finished.score));
  await page.reload();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("catball.records.v1")!));
  expect(saved).toEqual({ survivalSeconds: 999, score: finished.score });
  expect(errors).toEqual([]);
});

test("blocked storage and missing art still allow a round, results and restart", async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Storage disabled", "SecurityError"); } });
  });
  await page.route("**/assets/**/*.webp", (route) => route.abort());
  await page.goto("./?seed=43");
  await expect(page.getByRole("radio")).toHaveCount(6);
  await start(page);
  await expect(page.locator("#phaser-host canvas")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "GAME OVER" })).toBeVisible({ timeout: 35_000 });
  const finished = await snapshot(page);
  await expect(page.locator("#record-score")).toHaveText(String(finished.score));
  await page.getByRole("button", { name: "再来一次" }).click();
  await expect(page.locator("#app")).toHaveAttribute("data-phase", "countdown");
  await expect(page.locator("#phaser-host canvas")).toHaveCount(1);
  expect((await snapshot(page)).health).toBe(3); expect(errors).toEqual([]);
});
