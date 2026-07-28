import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const auditedPages = [
  "/",
  "/pricing",
  "/products",
  "/library",
  "/library/wealth-without-drift",
  "/office-hours",
  "/login",
  "/reset-password",
  "/account"
] as const;

for (const path of auditedPages) {
  test(`${path} has no serious or critical WCAG violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const blockingViolations = results.violations.filter(
      (violation) =>
        violation.impact === "critical" || violation.impact === "serious"
    );

    expect(blockingViolations).toEqual([]);
  });
}

test("keyboard users can skip directly to the main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");

  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("reduced-motion preference minimizes decorative transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/pricing");

  const transitionDuration = await page
    .locator(".transition-all")
    .first()
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(Number.parseFloat(transitionDuration)).toBeLessThanOrEqual(0.001);
});
