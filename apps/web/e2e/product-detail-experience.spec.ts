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

test("Shop leads to a complete, shareable product detail", async ({ page }) => {
  await page.goto("/products");

  await expect(
    page
      .getByRole("link", { name: "View tool details" })
      .first()
  ).toHaveAttribute(
    "href",
    "/products/wealth-dashboard-template-pack"
  );
  await page
    .getByRole("link", { name: "View tool details" })
    .first()
    .click();

  await expect(page).toHaveURL(
    /\/products\/wealth-dashboard-template-pack$/u
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Wealth Dashboard Template Pack"
    })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "What this helps you put into practice."
    })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "From decision to download in three steps."
    })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Back to Shop" })
  ).toHaveAttribute("href", "/products");
  await expect(
    page.getByRole("link", { name: "Compare membership" })
  ).toHaveAttribute("href", "/pricing");

  await expectNoHorizontalOverflow(page);
});

test("product detail actions remain usable at narrow widths", async ({
  page
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));

  for (const width of [320, 390]) {
    await page.setViewportSize({ height: 844, width });
    await page.goto("/products/wealth-dashboard-template-pack");

    const purchaseAction = page
      .getByRole("button", {
        name: /Buy once|Checkout unavailable|Purchase status unavailable/u
      })
      .or(
        page.getByRole("link", {
          name: /Access purchase|Create account to buy|Review purchase/u
        })
      );
    const controls = [
      page.getByRole("link", { name: "Back to Shop" }),
      purchaseAction,
      page.getByRole("link", { name: "Compare membership" })
    ];

    for (const control of controls) {
      const box = await control.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    }

    await expectNoHorizontalOverflow(page);
  }
});
