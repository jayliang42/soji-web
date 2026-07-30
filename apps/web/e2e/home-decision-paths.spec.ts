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

test("home presents four clear starting paths", async ({ page }) => {
  await page.goto("/");

  const paths = page.getByRole("region", {
    name: "Choose the next step that fits today."
  });
  const expectedLinks = [
    ["Explore the library", "/library?focus=start"],
    ["Browse practical tools", "/products"],
    ["Find your membership", "/pricing#plan-finder-heading"],
    ["See office hours", "/office-hours"]
  ] as const;

  for (const [name, href] of expectedLinks) {
    await expect(paths.getByRole("link", { name })).toHaveAttribute("href", href);
  }

  await expect(paths.getByText("Free previews", { exact: true })).toBeVisible();
  await expect(paths.getByText("From $49 once", { exact: true })).toBeVisible();
  await expect(paths.getByText("From $29 monthly", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("home membership overview leads into pricing detail", async ({ page }) => {
  await page.goto("/");

  const membership = page.getByRole("region", {
    name: "Three depths of access, one clear comparison."
  });
  await expect(
    membership.getByRole("link", { name: /^tier 1\b/iu })
  ).toHaveAttribute("href", "/pricing#plan-tier_1");
  await expect(
    membership.getByRole("link", { name: /^tier 2\b/iu })
  ).toHaveAttribute("href", "/pricing#plan-tier_2");
  await expect(
    membership.getByRole("link", { name: /^tier 3\b/iu })
  ).toHaveAttribute("href", "/pricing#plan-tier_3");
  await expect(page.getByText("Create account to join", { exact: false })).toHaveCount(
    0
  );

  await membership.getByRole("link", { name: "Use the plan finder" }).click();
  await expect(page).toHaveURL(/\/pricing#plan-finder-heading$/u);
  await expect(
    page.getByRole("heading", { name: "Find your best starting point." })
  ).toBeInViewport();
});

test("home decision links remain usable at narrow widths", async ({
  page
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));

  for (const width of [320, 390]) {
    await page.setViewportSize({ height: 844, width });
    await page.goto("/");

    const paths = page.getByRole("region", {
      name: "Choose the next step that fits today."
    });
    const links = paths.getByRole("link");
    const linkCount = await links.count();

    expect(linkCount).toBe(4);
    for (let index = 0; index < linkCount; index += 1) {
      const box = await links.nth(index).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    }

    const membership = page.getByRole("region", {
      name: "Three depths of access, one clear comparison."
    });
    for (const name of ["Use the plan finder", "Compare every benefit"]) {
      const box = await membership.getByRole("link", { name }).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    }

    await expectNoHorizontalOverflow(page);
  }
});
