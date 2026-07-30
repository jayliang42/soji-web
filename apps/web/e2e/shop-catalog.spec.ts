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

test("shop search and use filters lead to the relevant tool", async ({
  page
}) => {
  await page.goto("/products");

  const catalog = page.getByRole("region", {
    name: "Find your one-time tool."
  });
  const products = catalog.getByRole("list", {
    name: "One-time digital tools"
  });

  await expect(catalog.getByText("2 tools match the shop")).toBeVisible();
  await catalog
    .getByRole("searchbox", { name: "Search the shop" })
    .fill("allowance");
  await expect(catalog.getByText("1 tool matches your choices")).toBeVisible();
  await expect(
    products.getByRole("heading", { name: "Family Money Scripts" })
  ).toBeVisible();
  await expect(
    products.getByRole("heading", { name: "Wealth Dashboard Template Pack" })
  ).toHaveCount(0);

  await catalog
    .getByRole("button", { name: "Clear search and filters" })
    .click();
  await catalog.getByRole("button", { name: "Track & review" }).click();
  await expect(
    products.getByRole("heading", { name: "Wealth Dashboard Template Pack" })
  ).toBeVisible();
  await expect(
    products.getByRole("heading", { name: "Family Money Scripts" })
  ).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test("shop can sort one-time tools by price", async ({ page }) => {
  await page.goto("/products");

  const catalog = page.getByRole("region", {
    name: "Find your one-time tool."
  });
  await catalog.getByRole("combobox", { name: "Sort" }).selectOption("price-asc");

  await expect(
    catalog
      .getByRole("list", { name: "One-time digital tools" })
      .getByRole("heading", { level: 3 })
  ).toHaveText(["Family Money Scripts", "Wealth Dashboard Template Pack"]);
});

test("shop offers a useful no-result recovery", async ({ page }) => {
  await page.goto("/products");

  const catalog = page.getByRole("region", {
    name: "Find your one-time tool."
  });
  await catalog
    .getByRole("searchbox", { name: "Search the shop" })
    .fill("mortgage calculator");

  await expect(
    catalog.getByRole("heading", { name: "No tools match those choices." })
  ).toBeVisible();
  await catalog.getByRole("button", { name: "Show all tools" }).click();
  await expect(catalog.getByText("2 tools match the shop")).toBeVisible();
});

test("shop browsing controls remain usable at narrow widths", async ({
  page
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));

  for (const width of [320, 390]) {
    await page.setViewportSize({ height: 844, width });
    await page.goto("/products");

    const catalog = page.getByRole("region", {
      name: "Find your one-time tool."
    });
    const controls = [
      catalog.getByRole("searchbox", { name: "Search the shop" }),
      catalog.getByRole("combobox", { name: "Sort" }),
      catalog.getByRole("button", { name: "All tools" }),
      catalog.getByRole("button", { name: "Track & review" }),
      catalog.getByRole("button", { name: "Talk & decide" })
    ];

    for (const control of controls) {
      const box = await control.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    }

    await catalog.getByRole("button", { name: "Talk & decide" }).click();
    await expect(
      catalog.getByRole("heading", { name: "Family Money Scripts" })
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
});
