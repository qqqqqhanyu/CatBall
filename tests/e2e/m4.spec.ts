import { test, expect, type Page } from "@playwright/test";
import type { Session } from "../../src/systems/Session";
import type { GameScene } from "../../src/scenes/GameScene";

type Snapshot = ReturnType<Session["snapshot"]>;
type Animation = ReturnType<GameScene["animationSnapshot"]>;
const snapshot = (page: Page) => page.evaluate(() => (window as unknown as { __catball: { snapshot(): Snapshot } }).__catball.snapshot());
const animation = (page: Page) => page.evaluate(() => (window as unknown as { __catball: { animation(): Animation } }).__catball.animation());
const bubbles = (page: Page) => page.locator(".expression-bubble:not([hidden])");
async function start(page: Page, scenario: string) {
  await page.goto(`./?seed=43&scenario=${scenario}`);
  await page.getByRole("button", { name: "开始游戏" }).click();
  await page.waitForFunction(() => document.querySelector("#app")?.getAttribute("data-phase") === "playing");
}

test("Kick removes either animal, shows five original expressions, freezes, shocks and rolls without bubbles", async ({ page }) => {
  test.setTimeout(40_000);
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  for (const type of ["duck", "boar"]) {
    await start(page, `kick-${type}`);
    await page.getByRole("button", { name: "Kick 踢击" }).click();
    await expect.poll(async () => (await snapshot(page)).kickCount).toBe(1);
    await page.getByRole("button", { name: "暂停游戏" }).click();
    const kicked = await snapshot(page);
    expect(kicked.hitStopRemaining).toBeGreaterThan(0);
    expect(kicked.animal).toBeNull(); expect(kicked.health).toBe(3);
    expect(kicked.score).toBe(250);
    await expect(bubbles(page)).toHaveCount(5);
    expect((await animation(page)).texture).toBe("characters-kick");
    await expect(page.locator(`.expression-bubble[data-character="${kicked.playerId}"]`)).toHaveAttribute("data-expression", "CONFIDENT");
    await expect(page.locator('.expression-bubble[data-expression="SURPRISED"]:not([hidden])')).toHaveCount(4);
    expect(await page.locator(".bubble-face svg image").evaluateAll((images) => images.every((image) => image.getAttribute("href")?.includes("/assets/characters/")))).toBe(true);
    // Include captions, the actual title bounds, controls and footer when checking overlap.
    const overlaps = await page.evaluate(() => {
      const boxes = [...document.querySelectorAll<HTMLElement>(".expression-bubble:not([hidden])")].map((n) => n.getBoundingClientRect());
      const other = [...document.querySelectorAll<HTMLElement>(".kick-banner, .practice-label, .joystick, .skill-controls")].map((n) => n.getBoundingClientRect());
      const overlap = (a: DOMRect, b: DOMRect) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      return boxes.some((a, i) => boxes.some((b, j) => i !== j && overlap(a, b) > 0) || other.some((b) => overlap(a, b) > 0));
    });
    expect(overlaps).toBe(false);
    await page.waitForTimeout(600); expect(await snapshot(page)).toEqual(kicked);
    await page.getByRole("button", { name: "继续游戏" }).click();
    await expect.poll(async () => (await snapshot(page)).shockedRemaining).toBeGreaterThan(2.5);
    await expect(page.locator("#status-shock")).toBeVisible();
    await page.keyboard.press("Shift");
    await expect.poll(async () => (await snapshot(page)).rollRemaining, { intervals: [20] }).toBeGreaterThan(0);
    await expect(bubbles(page)).toHaveCount(0);
    expect((await animation(page)).encounters.rollVisible).toBe(true);
    await expect.poll(async () => (await snapshot(page)).rollRemaining).toBe(0);
    expect((await snapshot(page)).rollCooldown).toBeGreaterThan(9);
    await expect(page.locator(".skill.roll")).toBeDisabled();
  }
  expect(errors).toEqual([]);
});

test("original happy/confident pickup faces, healing and treat timers reach the HUD and pause together", async ({ page }) => {
  for (const type of ["pumpkin", "treat"]) {
    await start(page, type);
    const rendered = (await animation(page)).encounters.item;
    expect(rendered.visible).toBe(true); expect(rendered.texture).toBe("encounters");
    expect(rendered.frame).toBe(type === "pumpkin" ? "PUMPKIN" : "CAT_TREAT");
    await page.keyboard.down("ArrowRight");
    await expect.poll(async () => (await snapshot(page)).lastPickup, { intervals: [20] }).not.toBeNull();
    await page.keyboard.up("ArrowRight");
    await expect(bubbles(page)).toHaveCount(1);
    await expect(page.locator(".hud-portrait")).toHaveAttribute("data-expression", type === "pumpkin" ? "HAPPY" : "CONFIDENT");
    await expect(page.locator(".hearts")).toHaveAttribute("aria-label", `生命 ${type === "pumpkin" ? 3 : 2} / 3`);
    if (type === "treat") {
      await expect(page.locator("#status-treat")).toBeVisible();
      expect((await snapshot(page)).isInvulnerable).toBe(true);
    }
    await page.getByRole("button", { name: "暂停游戏" }).click();
    const paused = await snapshot(page); await page.waitForTimeout(300); expect(await snapshot(page)).toEqual(paused);
  }
});

test("a held movement finger resumes after Kick hit-stop without needing a new touch", async ({ page }) => {
  await start(page, "kick-duck");
  const j = (await page.locator(".joystick").boundingBox())!;
  const k = (await page.locator(".skill.kick").boundingBox())!;
  const x = j.x + j.width / 2, y = j.y + j.height / 2;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + 35, y, id: 1 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x + 35, y, id: 1 }, { x: k.x + k.width / 2, y: k.y + k.height / 2, id: 2 }] });
  await expect.poll(async () => (await snapshot(page)).hitStopRemaining, { intervals: [20] }).toBeGreaterThan(0);
  const frozen = await snapshot(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [{ x: k.x + k.width / 2, y: k.y + k.height / 2, id: 2 }] });
  await page.waitForTimeout(150);
  expect((await snapshot(page)).position).toEqual(frozen.position);
  await expect.poll(async () => (await snapshot(page)).position.x, { intervals: [50] }).toBeGreaterThan(frozen.position.x + 20);
  await expect(page.locator(".joystick")).toHaveClass(/engaged/);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
  await cdp.detach();
});

test("both animals warn and dash; a second finger triggers Roll without stealing the movement pointer", async ({ page }) => {
  for (const type of ["duck", "boar"]) {
    await start(page, `dash-${type}`);
    await expect.poll(async () => (await snapshot(page)).animal?.state, { intervals: [20] }).toBe("WINDUP");
    await expect(page.locator("#status-animal")).toContainText("冲刺预警");
    await expect.poll(async () => (await snapshot(page)).animal?.state, { intervals: [20] }).toBe("DASH");
    const a = (await snapshot(page)).animal!;
    expect(a.speed).toBeGreaterThan(type === "duck" ? 211.2 : 148.8);
    expect((await animation(page)).encounters.animal.frame).toMatch(new RegExp(`^${type.toUpperCase()}-`));
    const joystick = (await page.locator(".joystick").boundingBox())!;
    const skill = (await page.locator(".skill.roll").boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    const x = joystick.x + joystick.width / 2, y = joystick.y + joystick.height / 2;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - 35, y, id: 1 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x - 35, y, id: 1 }, { x: skill.x + skill.width / 2, y: skill.y + skill.height / 2, id: 2 }] });
    await expect.poll(async () => (await snapshot(page)).rollRemaining, { intervals: [20] }).toBeGreaterThan(0);
    await expect(bubbles(page)).toHaveCount(0);
    const before = await snapshot(page);
    // CDP touchEnd lists the finger being released, not the one still held down.
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [{ x: skill.x + skill.width / 2, y: skill.y + skill.height / 2, id: 2 }] });
    await page.waitForTimeout(500);
    const after = await snapshot(page);
    expect(after.position.x).toBeLessThan(before.position.x - 90);
    expect(after.animal?.id).toBe(a.id); expect(after.animal?.position).not.toEqual(a.position);
    await expect(page.locator(".joystick")).toHaveClass(/engaged/);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
    await cdp.detach();
  }
});
