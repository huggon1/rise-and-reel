import { expect, test, type Page } from "@playwright/test";

const expectImageDecoded = async (page: Page, selector: string) => {
  const image = page.locator(selector);
  await expect(image).toBeVisible();
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => ({
        complete: element.complete,
        width: element.naturalWidth,
        height: element.naturalHeight,
      })),
    )
    .toMatchObject({ complete: true });

  const dimensions = await image.evaluate((element: HTMLImageElement) => ({
    width: element.naturalWidth,
    height: element.naturalHeight,
  }));
  expect(dimensions.width).toBeGreaterThan(0);
  expect(dimensions.height).toBeGreaterThan(0);
};

const startSoloSession = async (page: Page) => {
  await page.getByRole("button", { name: "Set up Solo Fishing" }).click();
  await page.getByRole("button", { name: /REEL CONTROL/ }).click();
  await page.keyboard.press("f");
  await page.getByRole("button", { name: /Start fishing/ }).click();
  await expect(page.locator('[data-session-phase="active"]')).toBeVisible({
    timeout: 10_000,
  });
};

test("loads the authored lake key art without layout overflow", async ({
  page,
}) => {
  const failedRequests: string[] = [];
  page.on("requestfailed", (request) => failedRequests.push(request.url()));

  await page.goto("/");
  await expectImageDecoded(page, ".lake-window img");
  await expect(page.locator(".mode-card")).toHaveCount(4);

  const layout = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.contentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(failedRequests).toEqual([]);
});

test("keeps generated fish art inside the gameplay coordinate layer", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Math.random = () => 0.5;
  });
  await page.goto("/");
  await startSoloSession(page);
  await expectImageDecoded(page, ".fish-sprite img");

  const presentation = await page.evaluate(() => {
    const water = document.querySelector(".water-column")!;
    const scene = document.querySelector(".underwater-scene")!;
    const marker = document.querySelector<HTMLElement>(".fish-marker")!;
    const sprite = document.querySelector<HTMLElement>(".fish-sprite")!;
    const image = document.querySelector<HTMLElement>(".fish-sprite img")!;
    const zone = document.querySelector<HTMLElement>(".catch-zone")!;

    return {
      sceneBackground: getComputedStyle(scene).backgroundImage,
      scenePointerEvents: getComputedStyle(scene).pointerEvents,
      markerPosition: getComputedStyle(marker).position,
      markerTop: marker.style.top,
      markerTransform: getComputedStyle(marker).transform,
      spriteTransform: getComputedStyle(sprite).transform,
      imageAnimation: getComputedStyle(image).animationName,
      zoneTop: zone.style.top,
      zoneHeight: zone.style.height,
      waterOverflow: getComputedStyle(water).overflow,
    };
  });

  expect(presentation.sceneBackground).toContain("underwater");
  expect(presentation.sceneBackground).toContain(".webp");
  expect(presentation.scenePointerEvents).toBe("none");
  expect(presentation.markerPosition).toBe("absolute");
  expect(presentation.markerTop).toMatch(/^\d+(?:\.\d+)?%$/);
  expect(presentation.markerTransform).not.toBe("none");
  expect(presentation.spriteTransform).toBe("none");
  expect(presentation.imageAnimation).toContain("fishBreathe");
  expect(presentation.zoneTop).toMatch(/^\d+(?:\.\d+)?%$/);
  expect(presentation.zoneHeight).toBe("24%");
  expect(presentation.waterOverflow).toBe("hidden");
  await expect(page.getByRole("progressbar", { name: "Catch meter" })).toHaveAttribute(
    "aria-valuenow",
    /^\d+$/,
  );
});

test("respects reduced motion while keeping the game legible", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await startSoloSession(page);
  await expectImageDecoded(page, ".fish-sprite img");

  const motion = await page.evaluate(() => ({
    shimmer: getComputedStyle(document.querySelector(".surface-shimmer")!)
      .animationName,
    fish: getComputedStyle(document.querySelector(".fish-sprite img")!)
      .animationName,
    fishTransition: getComputedStyle(
      document.querySelector(".fish-sprite-inner")!,
    ).transitionDuration,
    markerVisibility: getComputedStyle(
      document.querySelector(".fish-marker")!,
    ).visibility,
    zoneVisibility: getComputedStyle(document.querySelector(".catch-zone")!)
      .visibility,
  }));

  expect(motion.shimmer).toBe("none");
  expect(motion.fish).toBe("none");
  expect(motion.fishTransition).toBe("0s");
  expect(motion.markerVisibility).toBe("visible");
  expect(motion.zoneVisibility).toBe("visible");
});
