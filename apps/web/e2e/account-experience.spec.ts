import { expect, test } from "@playwright/test";

async function expectNoHorizontalOverflow(
  page: import("@playwright/test").Page
) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

test("account overview keeps status and next actions easy to scan", async ({
  page
}) => {
  await page.goto("/account");

  await expect(
    page.getByRole("navigation", { name: "Account sections" })
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Account overview" })
  ).toBeVisible();
  await expect(page.getByText("Preview access", { exact: true })).toBeVisible();

  const nextActions = page
    .getByRole("article")
    .filter({ hasText: "Continue with Soji" });
  await expect(
    nextActions.getByRole("link", { name: "Browse your library" })
  ).toHaveAttribute("href", "/library");
  await expect(
    nextActions.getByRole("link", { name: "Check office hours" })
  ).toHaveAttribute("href", "/office-hours");
  await expect(
    nextActions.getByRole("link", { name: "Find practical tools" })
  ).toHaveAttribute("href", "/products");

  await expectNoHorizontalOverflow(page);
});

test("account section navigation reaches billing and purchase panels", async ({
  page
}) => {
  await page.goto("/account");

  const sectionNavigation = page.getByRole("navigation", {
    name: "Account sections"
  });
  await sectionNavigation.getByRole("link", { name: "Membership" }).click();
  await expect(page).toHaveURL(/#account-membership$/);
  await expect(
    page.getByRole("region", { name: "Subscriptions" })
  ).toBeInViewport();

  await sectionNavigation.getByRole("link", { name: "Purchases" }).click();
  await expect(page).toHaveURL(/#account-purchases$/);
  await expect(
    page.getByRole("region", { name: "Standalone purchases" })
  ).toBeInViewport();

  await expectNoHorizontalOverflow(page);
});

test("account controls preserve mobile-sized interaction targets", async ({
  page
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));

  for (const width of [320, 390]) {
    await page.setViewportSize({ height: 844, width });
    await page.goto("/account");

    const targets = page
      .getByRole("navigation", { name: "Account sections" })
      .getByRole("link");
    const targetCount = await targets.count();

    for (let index = 0; index < targetCount; index += 1) {
      const box = await targets.nth(index).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    }

    await expectNoHorizontalOverflow(page);
  }
});
