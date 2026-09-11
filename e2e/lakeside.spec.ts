import { expect, test, type Page } from "@playwright/test";

const startSolo = async (page: Page) => {
  await page.getByRole("button", { name: "Set up Solo Fishing" }).click();
  await page.getByRole("button", { name: /REEL CONTROL/ }).click();
  await page.keyboard.press("f");
  await page.getByRole("button", { name: /Start fishing/ }).click();
  await expect(page.locator('[data-session-phase="active"]')).toBeVisible({
    timeout: 10_000,
  });
};

test("fits the title screen and loads both display alphabets locally", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(
    page.getByRole("heading", { name: "Rise & Reel THE LAKE IS CALLING" }),
  ).toBeVisible();
  const menu = await page.locator(".mode-deck").boundingBox();
  expect(menu!.y + menu!.height).toBeLessThanOrEqual(720);
  await page.getByRole("button", { name: "中文" }).click();
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() =>
      document.fonts.check('30px "ZCOOL KuaiLe"', "湖畔时光"),
    ),
  ).toBe(true);
  await expect(
    page.getByRole("heading", { name: "Rise & Reel 湖畔时光" }),
  ).toBeVisible();
});

test("the crafted net catches through real input and its motion pauses with play", async ({
  page,
}, testInfo) => {
  test.setTimeout(35_000);
  await page.addInitScript(() => {
    Math.random = () => 0.5;
  });
  await page.goto("/");
  await startSolo(page);
  // Steer through the public keyboard control. Read only presentation coordinates.
  let held = false;
  const deadline = Date.now() + 15_000;
  while (
    Date.now() < deadline &&
    !(await page.locator(".round-callout.caught").count())
  ) {
    const state = await page.evaluate(() => {
      const fish = document
        .querySelector(".fish-marker")!
        .getBoundingClientRect();
      const net = document
        .querySelector(".catch-zone")!
        .getBoundingClientRect();
      return { fishY: fish.y + fish.height / 2, netY: net.y + net.height / 2 };
    });
    const shouldHold = state.netY > state.fishY;
    if (held !== shouldHold) {
      if (shouldHold) await page.keyboard.down("f");
      else await page.keyboard.up("f");
      held = shouldHold;
    }
    await page.waitForTimeout(65);
  }
  await page.keyboard.up("f");
  await expect(page.locator(".round-callout.caught")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("solo-catch.png") });
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Session paused" }),
  ).toBeVisible();
  const before = await page.locator(".catch-zone").getAttribute("style");
  await page.waitForTimeout(150);
  expect(await page.locator(".catch-zone").getAttribute("style")).toBe(before);
  expect(
    await page
      .locator(".fish-sprite img")
      .evaluate((el) => getComputedStyle(el).animationPlayState),
  ).toBe("paused");
  await page.getByRole("button", { name: "Resume fishing" }).click();
  await expect(page.locator('[data-session-phase="active"]')).toBeVisible();
});

test("four nets use independent SVG resources and stay inside their own lanes", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Play with 2–4 people" }).click();
  await page.getByRole("button", { name: /^4 players$/ }).click();
  for (const key of ["a", "s", "d", "f"]) await page.keyboard.press(key);
  await page.getByRole("button", { name: /Start multiplayer/ }).click();
  await expect(page.locator('[data-session-phase="active"]')).toBeVisible({
    timeout: 10_000,
  });
  const ids = await page
    .locator(".net-interior defs > [id]")
    .evaluateAll((els) => els.map((el) => el.id));
  expect(new Set(ids).size).toBe(ids.length);
  await expect(page.locator(".net-interior")).toHaveCount(4);
  const bounds = await page.locator(".multiplayer-lane").evaluateAll((lanes) =>
    lanes.map((lane) => {
      const water = lane
        .querySelector(".multiplayer-water")!
        .getBoundingClientRect();
      const net = lane.querySelector(".catch-zone")!.getBoundingClientRect();
      return (
        net.left >= water.left &&
        net.right <= water.right &&
        net.height < water.height
      );
    }),
  );
  expect(bounds.every(Boolean)).toBe(true);
});
