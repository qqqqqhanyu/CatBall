import { test, expect, type Page } from "@playwright/test";
import type { Session } from "../../src/systems/Session";

type Snapshot = ReturnType<Session["snapshot"]>;
const state = (page: Page) => page.evaluate(() => (window as unknown as { __catball: { snapshot(): Snapshot } }).__catball.snapshot());
async function start(page: Page, id: string, scenario = "", pauseOnReady = false) {
  await page.goto(`./?seed=43&scenario=${scenario}`);
  await page.locator(`[data-character="${id}"]`).click();
  await page.getByRole("button", { name: "开始游戏" }).click();
  await page.waitForFunction((pause) => {
    if (document.querySelector("#app")?.getAttribute("data-phase") !== "playing") return false;
    if (pause) document.querySelector<HTMLButtonElement>(".pause-button")!.click();
    return true;
  }, pauseOnReady);
}

test("all six selection descriptions and guide values follow selection on a small phone", async ({ page }) => {
  await page.setViewportSize({ width: 568, height: 320 });
  await page.goto("./");
  for (const [id, name, ability, detail] of [
    ["silver_cat", "坚果", "猫条无敌 8 秒", "猫条提供 8 秒无敌"],
    ["white_cat", "元宵", "道具刷新 17–27 秒", "每轮等待 17–27 秒刷新"],
    ["tabby_cat", "球球", "踢飞后震惊 4 秒", "四周伙伴震惊 4 秒"],
    ["poodle", "欢欢", "翻滚冷却 7 秒", "Shift · 冷却 7 秒"],
    ["ragdoll_cat", "阿福", "移动速度 ×1.1", "当前角色：阿福"],
    ["point_cat", "赛赛", "生命上限 6 颗", "开局 3 颗心，最多 6 颗"],
  ]) {
    await page.locator(`[data-character="${id}"]`).click();
    await expect(page.locator("#selected-ability")).toContainText(ability);
    const fits = await page.locator("#selected-ability").evaluate((e) => e.scrollWidth <= e.clientWidth);
    expect(fits).toBe(true);
    const note = (await page.locator("#selected-ability").boundingBox())!;
    const startButton = (await page.locator("#start-game").boundingBox())!;
    expect(note.y + note.height).toBeLessThanOrEqual(startButton.y);
    await page.getByRole("button", { name: "玩法介绍" }).click();
    const guide = page.getByRole("dialog", { name: "怎么玩" });
    await expect(guide.locator(".guide-selected")).toContainText(`当前角色：${name}`);
    await expect(guide).toContainText(detail);
    await page.getByRole("button", { name: "知道了" }).click();
  }
  await page.getByRole("button", { name: "开始游戏" }).click();
  await expect(page.locator(".hearts")).toHaveAttribute("aria-label", "生命 3 / 6");
  await expect(page.locator(".hearts svg")).toHaveCount(6);
  await expect(page.locator(".hearts svg.lost")).toHaveCount(3);
  const identity = (await page.locator(".hud-player").boundingBox())!, clock = (await page.locator(".hud-clock").boundingBox())!;
  expect(identity.x + identity.width).toBeLessThan(clock.x);
  await page.getByRole("button", { name: "暂停游戏" }).click();
  await page.getByRole("button", { name: "重新开始" }).click();
  await expect(page.locator(".hearts")).toHaveAttribute("aria-label", "生命 3 / 6");
  await page.getByRole("button", { name: "暂停游戏" }).click();
  await page.getByRole("button", { name: "返回选人" }).click();
  await page.locator('[data-character="white_cat"]').click();
  await page.getByRole("button", { name: "开始游戏" }).click();
  await expect(page.locator(".hearts svg")).toHaveCount(5);
  expect((await state(page)).stats.itemSpawnSeconds).toEqual({ min: 17, max: 27 });
});

test("Saisai can fill the sixth heart and full-health feedback uses six", async ({ page }) => {
  for (const scenario of ["pumpkin-near-full", "pumpkin-full"]) {
    await start(page, "point_cat", scenario);
    const picked = page.waitForFunction(() => {
      const s = (window as unknown as { __catball: { snapshot(): Snapshot } }).__catball.snapshot();
      if (!s.lastPickup) return null;
      document.querySelector<HTMLButtonElement>(".pause-button")!.click();
      return { health: s.health, text: document.querySelector(".pickup-notice")?.textContent };
    });
    await page.keyboard.down("ArrowRight");
    const result = await (await picked).jsonValue();
    await page.keyboard.up("ArrowRight");
    expect(result).toEqual({ health: 6, text: scenario === "pumpkin-near-full" ? "南瓜 +1 ♥" : "生命已满 · 6 ♥" });
    await expect(page.locator(".hearts svg:not(.lost)")).toHaveCount(6);
    await expect(page.locator(".hearts")).toHaveAttribute("aria-label", "生命 6 / 6");
  }
});

test("Huanhuan's Roll button and paused guide show the seven-second cooldown", async ({ page }) => {
  await start(page, "poodle", "", true);
  await page.evaluate(async () => {
    document.querySelector<HTMLButtonElement>("#resume-game")!.click();
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    document.querySelector<HTMLButtonElement>(".skill.roll")!.click();
  });
  await page.waitForFunction(() => {
    const s = (window as unknown as { __catball: { snapshot(): Snapshot } }).__catball.snapshot();
    if (!s.rollRemaining) return false;
    document.querySelector<HTMLButtonElement>(".pause-button")!.click(); return true;
  });
  const s = await state(page);
  expect(s.rollCooldown).toBeGreaterThan(6.5); expect(s.rollCooldown).toBeLessThanOrEqual(7);
  expect(Number.parseFloat((await page.locator(".skill.roll small").textContent())!)).toBeLessThanOrEqual(7);
  await page.getByRole("button", { name: "玩法介绍" }).click();
  await expect(page.getByRole("dialog", { name: "怎么玩" })).toContainText("Shift · 冷却 7 秒");
});

test("Jianguo's treat pickup and status show eight seconds", async ({ page }) => {
  await start(page, "silver_cat", "treat");
  const picked = page.waitForFunction(() => {
    const s = (window as unknown as { __catball: { snapshot(): Snapshot } }).__catball.snapshot();
    if (!s.lastPickup) return null;
    document.querySelector<HTMLButtonElement>(".pause-button")!.click(); return s.treatRemaining;
  });
  await page.keyboard.down("ArrowRight");
  expect(await (await picked).jsonValue()).toBeGreaterThan(7.8);
  await page.keyboard.up("ArrowRight");
  await expect(page.locator(".pickup-notice")).toHaveText("猫条 · 无敌 8 秒");
  expect(Number.parseFloat((await page.locator("#status-treat").textContent())!.replace("猫条无敌 ", ""))).toBeGreaterThan(7.8);
});

test("Qiuqiu's successful kick gives four seconds of shock in the game HUD", async ({ page }) => {
  await start(page, "tabby_cat", "kick-duck", true);
  await page.evaluate(async () => {
    document.querySelector<HTMLButtonElement>("#resume-game")!.click();
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    document.querySelector<HTMLButtonElement>(".skill.kick")!.click();
  });
  const shocked = await page.waitForFunction(() => {
    const s = (window as unknown as { __catball: { snapshot(): Snapshot } }).__catball.snapshot();
    if (!s.shockedRemaining) return null;
    document.querySelector<HTMLButtonElement>(".pause-button")!.click(); return s;
  });
  const s = (await shocked.jsonValue())!;
  expect(s.kickCount).toBe(1); expect(s.shockedRemaining).toBeGreaterThan(3.8); expect(s.shockedRemaining).toBeLessThanOrEqual(4);
  await expect(page.locator("#status-shock")).toContainText("全场震惊");
  expect(Object.entries(s.expressions.states).filter(([id, expression]) => s.opponents.includes(id) && expression === "SURPRISED")).toHaveLength(4);
});
