import AxeBuilder from "@axe-core/playwright";
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

const recoveryPages = [
  {
    alternative: "Read a public guide",
    heading: "Products could not be loaded",
    path: "/products"
  },
  {
    alternative: "Browse practical tools",
    heading: "The library could not be loaded",
    path: "/library"
  },
  {
    alternative: "Read while you wait",
    heading: "Office hours could not be loaded",
    path: "/office-hours"
  }
] as const;

for (const recoveryPage of recoveryPages) {
  test(`${recoveryPage.path} presents one complete catalog recovery path`, async ({
    page
  }) => {
    await page.goto(recoveryPage.path);

    const alert = page
      .getByRole("alert")
      .filter({ hasText: recoveryPage.heading });
    await expect(alert).toHaveCount(1);
    await expect(
      alert.getByRole("heading", { level: 2, name: recoveryPage.heading })
    ).toBeVisible();
    await expect(
      alert
        .getByRole("link", { name: "Try loading again" })
        .or(alert.getByRole("button", { name: "Try loading again" }))
    ).toBeVisible();
    await expect(
      alert.getByRole("link", { name: recoveryPage.alternative })
    ).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });
}

test("catalog recovery remains accessible and touchable at 320 pixels", async ({
  page
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));

  await page.setViewportSize({ height: 844, width: 320 });
  await page.goto("/products");

  const alert = page
    .getByRole("alert")
    .filter({ hasText: "Products could not be loaded" });
  for (const action of [
    alert
      .getByRole("link", { name: "Try loading again" })
      .or(alert.getByRole("button", { name: "Try loading again" })),
    alert.getByRole("link", { name: "Read a public guide" })
  ]) {
    const box = await action.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  }

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    results.violations.filter(
      ({ impact }) => impact === "critical" || impact === "serious"
    )
  ).toEqual([]);
  await expectNoHorizontalOverflow(page);
});
