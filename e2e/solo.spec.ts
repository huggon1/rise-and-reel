import { expect, test } from "@playwright/test";

test("completes and retains a zero-catch Solo Fishing session", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Rise & Reel/);
  await expect(
    page.getByRole("heading", { name: "Settle in. Keep the line moving." }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Set up Solo Fishing" }).click();
  await page.getByRole("button", { name: /REEL CONTROL/ }).click();
  await page.keyboard.press("f");
  await expect(page.getByText("F", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Start fishing/ }).click();
  await expect(page.getByText("GET READY")).toBeVisible();
  await expect(page.getByText("GET READY")).toBeHidden({ timeout: 5_000 });

  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.getByRole("button", { name: "Resume fishing" }).click();

  await page.getByRole("button", { name: "End session" }).click();
  await expect(page.getByRole("heading", { name: "End this session?" })).toBeVisible();
  await page.getByRole("button", { name: "End and save" }).click();

  await expect(page.getByText("SESSION SUMMARY")).toBeVisible();
  await expect(page.getByText("Saved in this browser.")).toBeVisible();
  await expect(page.getByText("0", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "View history" }).click();
  await expect(page.getByText("SOLO HISTORY")).toBeVisible();
  await expect(page.getByText("1", { exact: true })).toBeVisible();
});

test("persists the Chinese language preference", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "中文" }).click();
  await expect(page.getByRole("heading", { name: "坐稳，抛线，慢慢钓。" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "坐稳，抛线，慢慢钓。" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
});
