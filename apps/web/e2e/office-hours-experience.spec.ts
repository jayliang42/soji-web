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

test("office hours explains the participation flow and truthful session state", async ({
  page
}) => {
  await page.goto("/office-hours");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Closer support for higher-stakes decisions."
    })
  ).toBeVisible();
  const format = page.getByRole("region", {
    name: "One decision. Three useful moves."
  });
  await expect(format).toBeVisible();
  await expect(format.getByRole("listitem")).toHaveCount(3);
  await expect(format.getByText("Name the decision")).toBeVisible();
  await expect(format.getByText("Bring the context")).toBeVisible();
  await expect(format.getByText("Leave with direction")).toBeVisible();

  const status = page.getByRole("region", { name: "Session status" });
  await expect(status).toBeVisible();
  await expect(
    status.getByRole("heading", {
      level: 3,
      name: "June Office Hour: Family Money Decisions"
    })
  ).toBeVisible();
  await expect(status.getByText("Access temporarily unavailable")).toBeVisible();
  await expect(status.getByRole("button", { name: /copy/iu })).toHaveCount(0);
  await expect(
    status.getByRole("button", { name: /calendar/iu })
  ).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("office_hours.join");

  await expectNoHorizontalOverflow(page);
});

test("office hours keeps useful next actions visible", async ({ page }) => {
  await page.goto("/office-hours");

  const preparation = page.getByRole("complementary");
  await expect(
    preparation.getByRole("heading", {
      name: "Start with a guide, then bring one decision."
    })
  ).toBeVisible();
  await expect(
    preparation.getByRole("link", { name: "Browse the library" })
  ).toHaveAttribute("href", "/library");
  await expect(
    preparation.getByRole("link", { name: "Compare membership" })
  ).toHaveAttribute("href", "/pricing");

  await expectNoHorizontalOverflow(page);
});

test("office hours actions remain usable at narrow widths", async ({
  page
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));

  for (const width of [320, 390]) {
    await page.setViewportSize({ height: 844, width });
    await page.goto("/office-hours");

    const actions = page.getByRole("complementary").getByRole("link");
    const actionCount = await actions.count();

    for (let index = 0; index < actionCount; index += 1) {
      const box = await actions.nth(index).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    }

    await expectNoHorizontalOverflow(page);
  }
});
