import { expect, test } from "@playwright/test";

test("starts a two-player 2D session with unique axis controls", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Play 2D together" }).click();

  await expect(
    page.getByRole("heading", { name: "Split the axes. Share the catch." }),
  ).toBeVisible();
  await page.keyboard.press("f");
  await page.keyboard.press("j");
  await expect(page.getByText("Both axes are ready.")).toBeVisible();

  await page.getByRole("button", { name: /Start 2D Fishing/ }).click();
  await expect(page.getByText("GET READY")).toBeHidden({ timeout: 5_000 });
  await expect(page.locator(".cooperative-zone")).toBeVisible();
  await expect(page.getByText("Player 1 · X")).toBeVisible();
  await expect(page.getByText("Player 2 · Y")).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Shared catch meter" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "End session" }).click();
  await expect(
    page.getByRole("heading", { name: "End this 2D session?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep fishing" }).click();
  await expect(page.locator(".cooperative-zone")).toBeVisible();
});

test("rejects duplicate 2D axis bindings", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "2D Fishing" }).click();

  await page.keyboard.press("q");
  await page.keyboard.press("q");
  await expect(page.getByText("Q is already assigned.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Start 2D Fishing/ }),
  ).toBeDisabled();
});
