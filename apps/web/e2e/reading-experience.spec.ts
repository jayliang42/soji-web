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

test("article detail provides reading context and an exact access path", async ({
  page
}) => {
  await page.goto("/library/wealth-without-drift");

  await expect(
    page.getByRole("link", { name: "Back to Library" })
  ).toHaveAttribute("href", "/library");
  await expect(
    page.getByRole("heading", { level: 2, name: "Guide details" })
  ).toBeVisible();
  await expect(
    page.getByRole("article", {
      name: /wealth without drift.+reading/iu
    })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Continue with Tier 1" })
  ).toBeVisible();

  await expect(
    page.getByRole("link", {
      name: "See the membership that includes this"
    })
  ).toHaveAttribute("href", "/pricing#plan-tier_1");
  await expect(
    page.getByRole("link", { name: "Review your account" })
  ).toHaveAttribute("href", "/account");
  await expect(
    page.getByRole("heading", { name: "Choose the next useful step." })
  ).not.toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "In this guide" })
  ).not.toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Continue with a nearby question."
    })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 3, name: "The First Money Audit" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Browse complete library" })
  ).toHaveAttribute("href", "/library");
  await expect(
    page.getByRole("link", { name: "Read article" })
  ).toHaveAttribute("href", "/library/first-money-audit");
  await expect(
    page.getByRole("heading", {
      name: "Wealth Without Drift: A 90-Minute Decision Reset"
    })
  ).toHaveCount(1);

  await expectNoHorizontalOverflow(page);
});

test("article actions remain usable at narrow widths", async ({
  page
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));

  for (const width of [320, 390]) {
    await page.setViewportSize({ height: 844, width });
    await page.goto("/library/wealth-without-drift");

    const controls = [
      page.getByRole("link", { name: "Back to Library" }),
      page.getByRole("link", {
        name: "See the membership that includes this"
      }),
      page.getByRole("link", { name: "Review your account" }),
      page.getByRole("link", { name: "Return to Library" }),
      page.getByRole("link", { name: "Browse complete library" })
    ];

    for (const control of controls) {
      const box = await control.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    }

    await expectNoHorizontalOverflow(page);
  }
});
