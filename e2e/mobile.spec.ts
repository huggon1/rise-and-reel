import { expect, test, type Page } from "@playwright/test";

const expectNoHorizontalOverflow = async (page: Page) => {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
};

const expectEntireMultiplayerStageVisible = async (page: Page) => {
  const layout = await page.evaluate(() => {
    const toolbar = document.querySelector(".game-toolbar")!.getBoundingClientRect();
    const board = document.querySelector(".multiplayer-board")!.getBoundingClientRect();
    const controls = document.querySelector(".touch-controls")!.getBoundingClientRect();
    const lanes = [...document.querySelectorAll(".multiplayer-lane")].map(
      (lane) => lane.getBoundingClientRect(),
    );
    const markerHeights = [...document.querySelectorAll(".multiplayer-lane")].map(
      (lane) => lane.querySelector(".fish-marker")!.getBoundingClientRect().height,
    );
    const catchZoneHeights = [...document.querySelectorAll(".multiplayer-lane")].map(
      (lane) => lane.querySelector(".catch-zone")!.getBoundingClientRect().height,
    );
    const controlTops = [...document.querySelectorAll(".touch-controls button")].map(
      (control) => control.getBoundingClientRect().top,
    );
    return {
      scrollY: window.scrollY,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      boardWidth: board.width,
      toolbarTop: toolbar.top,
      controlsTop: controls.top,
      controlsBottom: controls.bottom,
      laneTops: lanes.map((lane) => lane.top),
      laneBottoms: lanes.map((lane) => lane.bottom),
      markerHeights,
      catchZoneHeights,
      controlTops,
    };
  });

  expect(layout.scrollY).toBe(0);
  expect(layout.boardWidth).toBeGreaterThanOrEqual(layout.viewportWidth - 20);
  expect(layout.toolbarTop).toBeGreaterThanOrEqual(0);
  expect(Math.min(...layout.laneTops)).toBeGreaterThanOrEqual(0);
  expect(Math.max(...layout.laneTops) - Math.min(...layout.laneTops)).toBeLessThanOrEqual(1);
  expect(Math.max(...layout.controlTops) - Math.min(...layout.controlTops)).toBeLessThanOrEqual(1);
  expect(Math.max(...layout.laneBottoms)).toBeLessThanOrEqual(
    layout.controlsTop,
  );
  expect(layout.controlsBottom).toBeLessThanOrEqual(layout.viewportHeight);
  for (const [index, markerHeight] of layout.markerHeights.entries()) {
    expect(markerHeight).toBeLessThanOrEqual(layout.catchZoneHeights[index]);
  }
};

test("plays Solo Fishing with an on-screen reel control", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Set up Solo Fishing" }).click();
  await expect(page.getByText("TOUCH READY")).toBeVisible();
  await page.getByRole("button", { name: /Start fishing/ }).click();
  await expect(page.getByText("GET READY")).toBeHidden({ timeout: 5_000 });

  const reel = page.getByRole("button", { name: "Reel control" });
  await expect(reel).toBeVisible();
  await reel.dispatchEvent("pointerdown", {
    button: 0,
    pointerId: 1,
    pointerType: "touch",
  });
  await expect(reel).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(250);
  await reel.dispatchEvent("pointerup", {
    button: 0,
    pointerId: 1,
    pointerType: "touch",
  });
  await expect(reel).toHaveAttribute("aria-pressed", "false");
  await expectNoHorizontalOverflow(page);
});

test("explains the desktop boundary for 2D Fishing", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await page.getByRole("button", { name: "2D Fishing" }).click();

  await expect(page.getByText("Open on desktop")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Start 2D Fishing/ }),
  ).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test("starts every multiplayer size without keyboard bindings", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const waterHeights: number[] = [];
  for (const playerCount of [2, 3, 4]) {
    await page.goto("/");
    await page.getByRole("button", { name: "Play with 2–4 people" }).click();
    await page
      .getByRole("button", { name: new RegExp(`^${playerCount} players$`) })
      .click();

    await expect(page.getByText("On-screen controls are ready.")).toBeVisible();
    await page.getByRole("button", { name: /Start multiplayer/ }).click();
    await expect(page.getByText("GET READY")).toBeHidden({ timeout: 5_000 });
    await expect(page.locator(".multiplayer-lane")).toHaveCount(playerCount);
    await expect(page.getByRole("button", { name: /Player \d reel control/ }))
      .toHaveCount(playerCount);
    await expectNoHorizontalOverflow(page);
    await expectEntireMultiplayerStageVisible(page);
    waterHeights.push(await page.locator(".multiplayer-water").first().evaluate(
      (water) => water.getBoundingClientRect().height,
    ));
  }
  expect(Math.max(...waterHeights) - Math.min(...waterHeights)).toBeLessThanOrEqual(1);

  const playerOne = page.getByRole("button", {
    name: "Player 1 reel control",
  });
  const playerFour = page.getByRole("button", {
    name: "Player 4 reel control",
  });
  await playerOne.dispatchEvent("pointerdown", {
    button: 0,
    pointerId: 1,
    pointerType: "touch",
  });
  await playerFour.dispatchEvent("pointerdown", {
    button: 0,
    pointerId: 4,
    pointerType: "touch",
  });
  await expect(playerOne).toHaveAttribute("aria-pressed", "true");
  await expect(playerFour).toHaveAttribute("aria-pressed", "true");

  await playerOne.dispatchEvent("pointercancel", {
    pointerId: 1,
    pointerType: "touch",
  });
  await playerFour.dispatchEvent("pointerup", {
    button: 0,
    pointerId: 4,
    pointerType: "touch",
  });
  await expect(playerOne).toHaveAttribute("aria-pressed", "false");
  await expect(playerFour).toHaveAttribute("aria-pressed", "false");
  await expectEntireMultiplayerStageVisible(page);

  await page.setViewportSize({ width: 320, height: 568 });
  await expectEntireMultiplayerStageVisible(page);

  await page.setViewportSize({ width: 740, height: 320 });
  await expectEntireMultiplayerStageVisible(page);
});
