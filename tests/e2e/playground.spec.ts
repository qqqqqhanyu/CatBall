import { test, expect, type Page } from "@playwright/test";

type Snapshot = {
  phase: string;
  playerId: string;
  opponents: string[];
  position: { x: number; y: number };
  elapsed: number;
  countdown: number;
};
const snapshot = (page: Page) =>
  page.evaluate(() =>
    (
      window as unknown as { __catball: { snapshot(): Snapshot } }
    ).__catball.snapshot(),
  );

async function start(page: Page, character = "元宵") {
  await page.goto("./");
  await page
    .getByRole("radio", { name: new RegExp(`^${character}，`) })
    .click();
  await page.getByRole("button", { name: "开始游戏" }).click();
  await expect(page.locator("#app")).toHaveAttribute("data-phase", "playing", {
    timeout: 12_000,
  });
}

test("all six cards select, persist, and start a playable field with four other characters", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  const cards = page.getByRole("radio");
  await expect(cards).toHaveCount(6);
  for (const name of ["坚果", "元宵", "球球", "赛赛", "欢欢", "阿福"]) {
    const card = page.getByRole("radio", { name: new RegExp(`^${name}，`) });
    await card.click();
    await expect(card).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("#hero-name")).toHaveText(name);
  }
  await page.reload();
  await expect(page.getByRole("radio", { name: /^阿福，/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.getByRole("button", { name: "开始游戏" }).click();
  await expect(page.locator("#app")).toHaveAttribute("data-phase", "countdown");
  const initial = await snapshot(page);
  expect(initial.playerId).toBe("ragdoll_cat");
  expect(initial.opponents).toHaveLength(4);
  expect(new Set(initial.opponents).size).toBe(4);
  expect(initial.opponents).not.toContain(initial.playerId);
  expect(initial.position).toEqual({ x: 640, y: 400 });
  expect(initial.elapsed).toBe(0);
  await expect(page.locator("#app")).toHaveAttribute("data-phase", "playing");
  await expect(page.locator("#phaser-host canvas")).toBeVisible();
  expect(errors).toEqual([]);
});

test("keyboard reaches boundaries; pause, restart and return do not leave old input or canvases", async ({
  page,
}) => {
  await start(page);
  await page.keyboard.down("ArrowRight");
  await expect.poll(async () => (await snapshot(page)).position.x).toBe(1066);
  await page.keyboard.up("ArrowRight");
  expect((await snapshot(page)).position.x).toBe(1066);
  await page.getByRole("button", { name: "暂停游戏" }).click();
  const paused = await snapshot(page);
  await page.waitForTimeout(300);
  expect(await snapshot(page)).toEqual(paused);
  await page.getByRole("button", { name: "继续游戏" }).click();
  await page.waitForTimeout(150);
  expect((await snapshot(page)).position).toEqual(paused.position);
  await page.keyboard.down("ArrowDown");
  await expect.poll(async () => (await snapshot(page)).position.y).toBe(616);
  await page.keyboard.up("ArrowDown");
  expect((await snapshot(page)).position.y).toBe(616);
  await page.getByRole("button", { name: "暂停游戏" }).click();
  await page.getByRole("button", { name: "重新开始" }).click();
  await expect(page.locator("#app")).toHaveAttribute("data-phase", "countdown");
  expect((await snapshot(page)).position).toEqual({ x: 640, y: 400 });
  expect((await snapshot(page)).elapsed).toBe(0);
  await expect(page.locator("#phaser-host canvas")).toHaveCount(1);
  await page.getByRole("button", { name: "暂停游戏" }).click();
  await page.getByRole("button", { name: "返回选人" }).click();
  await expect(page.getByRole("radio", { name: /^元宵，/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page.locator("#phaser-host canvas")).toHaveCount(0);
});

test("joystick drag moves; cancel releases; separate touch cannot hijack the joystick", async ({
  page,
}) => {
  await start(page, "欢欢");
  const joystick = page.locator(".joystick");
  const bounds = (await joystick.boundingBox())!;
  const x = bounds.x + bounds.width / 2,
    y = bounds.y + bounds.height / 2;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y, id: 1 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: x + 36, y: y - 36, id: 1 }],
  });
  const before = await snapshot(page);
  await expect
    .poll(async () => (await snapshot(page)).position.x, { timeout: 3000 })
    .toBeGreaterThan(before.position.x + 30);
  const moved = await snapshot(page);
  expect(moved.position.y).toBeLessThan(before.position.y - 30);
  // A second finger on Kick leaves the movement pointer intact.
  const skill = (await page.locator(".kick").boundingBox())!;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: x + 36, y: y - 36, id: 1 },
      { x: skill.x + skill.width / 2, y: skill.y + skill.height / 2, id: 2 },
    ],
  });
  await page.waitForTimeout(120);
  expect((await snapshot(page)).position.x).toBeGreaterThan(moved.position.x);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await page.waitForTimeout(60);
  const released = await snapshot(page);
  await page.waitForTimeout(200);
  expect((await snapshot(page)).position).toEqual(released.position);
  await expect(page.locator(".joystick")).not.toHaveClass(/engaged/);
});

test("portrait orientation pauses safely and restores the complete fixed world", async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.name.includes("mobile"),
    "mobile orientation only",
  );
  await start(page, "赛赛");
  const before = await snapshot(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "转一下，操场更宽阔" }),
  ).toBeVisible();
  await expect(page.locator("#app")).toHaveAttribute("data-phase", "paused");
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole("button", { name: "继续游戏" }).click();
  expect((await snapshot(page)).position).toEqual(before.position);
  const canvas = (await page.locator("#phaser-host canvas").boundingBox())!;
  const host = (await page.locator("#phaser-host").boundingBox())!;
  expect(canvas.width).toBeCloseTo(host.width, 0);
  expect(canvas.height).toBeCloseTo(host.height, 0);
  expect(canvas.width).toBeGreaterThan(800);
  expect(canvas.x).toBeGreaterThanOrEqual(0);
  expect(canvas.x + canvas.width).toBeLessThanOrEqual(844);
  expect(canvas.y + canvas.height).toBeLessThanOrEqual(390);
});

const animation = (page: Page) =>
  page.evaluate(() =>
    (
      window as unknown as {
        __catball: {
          animation(): {
            state: string;
            frame: number;
            texture: string;
            atlasFrame: string | number;
          };
        };
      }
    ).__catball.animation(),
  );

test("all six characters render moving legs, stop on release and freeze the current pose on pause", async ({
  page,
}) => {
  test.setTimeout(65_000);
  for (const name of ["坚果", "元宵", "球球", "赛赛", "欢欢", "阿福"]) {
    await start(page, name);
    await page.keyboard.down("ArrowRight");
    await expect
      .poll(async () => (await animation(page)).texture)
      .toBe("player-walk");
    const frames = await page.evaluate(async () => {
      const seen = new Set<string>();
      const deadline = performance.now() + 2000;
      while (performance.now() < deadline && seen.size < 4) {
        const a = (
          window as unknown as {
            __catball: { animation(): { atlasFrame: string | number } };
          }
        ).__catball.animation();
        seen.add(String(a.atlasFrame));
        await new Promise(requestAnimationFrame);
      }
      return [...seen];
    });
    expect(frames.sort()).toEqual(["0", "1", "2", "3"]);
    await page.keyboard.up("ArrowRight");
    await expect.poll(async () => (await animation(page)).state).toBe("idle");
    expect((await animation(page)).texture).toBe("characters-idle");
  }
  await page.keyboard.down("ArrowLeft");
  await expect.poll(async () => (await animation(page)).state).toBe("walk");
  await page.keyboard.press("Escape");
  const frozen = await animation(page);
  await page.waitForTimeout(250);
  expect(await animation(page)).toEqual(frozen);
  await page.keyboard.up("ArrowLeft");
  await page.getByRole("button", { name: "继续游戏" }).click();
  await expect.poll(async () => (await animation(page)).state).toBe("idle");
});
