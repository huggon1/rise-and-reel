import { expect, test } from "@playwright/test";

test("starts a four-player match with unique same-keyboard controls", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Play with 2–4 people" }).click();

  await expect(
    page.getByRole("heading", { name: "Bring everyone to the dock." }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^4 players$/ }).click();

  await page.keyboard.press("a");
  await page.keyboard.press("s");
  await page.keyboard.press("d");
  await page.keyboard.press("f");
  await expect(page.getByText("Everyone is ready.")).toBeVisible();

  await page.getByRole("button", { name: /Start multiplayer/ }).click();
  await expect(page.getByText("GET READY")).toBeVisible();
  await expect(page.getByText("GET READY")).toBeHidden({ timeout: 5_000 });
  await expect(page.locator(".multiplayer-lane")).toHaveCount(4);
  await expect(page.getByText("Player 4", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "End match" }).click();
  await expect(
    page.getByRole("heading", { name: "End this match?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep fishing" }).click();
  await expect(page.locator(".multiplayer-lane")).toHaveCount(4);
});

test("rejects duplicate multiplayer key bindings", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Multiplayer" }).click();

  await page.keyboard.press("q");
  await page.keyboard.press("q");
  await expect(page.getByText("Q is already assigned.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Start multiplayer/ }),
  ).toBeDisabled();
});
