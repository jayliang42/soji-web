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

test("home presents preview, guidance, and both case-study purchase paths", async ({
  page
}) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "Read a preview" })).toHaveAttribute(
    "href",
    "/library"
  );
  await expect(
    page.getByRole("link", { name: "Explore membership" })
  ).toHaveAttribute("href", "/pricing");

  const outcomes = page.getByTestId("home-outcomes");
  await expect(outcomes.getByRole("listitem")).toHaveCount(4);
  await expect(
    outcomes.getByRole("heading", { name: "直面非传统背景" })
  ).toBeVisible();

  const caseStudies = page.getByRole("region", {
    name: "55篇真实录取案例，按你的需要解锁。"
  });
  await expect(caseStudies.getByText("$5", { exact: true })).toBeVisible();
  await expect(caseStudies.getByText("$99", { exact: true })).toBeVisible();
  await expect(
    caseStudies.getByRole("link", { name: "查看解锁方式" })
  ).toHaveAttribute("href", "/pricing#case-study-offers");
  await expect(
    caseStudies.getByRole("heading", { name: "单篇真实录取案例" })
  ).toBeVisible();
  await expect(
    caseStudies.getByRole("heading", { name: "55篇真实录取案例合集" })
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("home case-study actions remain usable at narrow widths", async ({
  page
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));

  for (const width of [320, 390]) {
    await page.setViewportSize({ height: 844, width });
    await page.goto("/");

    for (const name of [
      "Read a preview",
      "Explore membership",
      "查看解锁方式",
      "先看案例目录"
    ]) {
      const box = await page.getByRole("link", { name }).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    }

    await expectNoHorizontalOverflow(page);
  }
});
