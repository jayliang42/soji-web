import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const guidePath = "/library/first-money-audit";

async function expandMobileOutline(
  page: import("@playwright/test").Page
) {
  const summary = page.locator("summary").filter({ hasText: "In this guide" });
  if (await summary.isVisible()) {
    await summary.click();
  }
}

async function getVisibleOutline(
  page: import("@playwright/test").Page
) {
  await expandMobileOutline(page);
  return page.getByRole("navigation", { name: "In this guide" });
}

test("guide outline follows native section links after reading-size reflow", async ({
  page
}) => {
  await page.goto(guidePath);
  await page
    .getByRole("group", { name: "Reading text size" })
    .getByRole("button", { name: "Larger" })
    .click();

  const outline = await getVisibleOutline(page);
  const secondSection = outline.getByRole("link", {
    name: "Name the default to change"
  });
  await expect(outline.locator("[aria-current]")).toHaveCount(0);
  await secondSection.click();

  await expect(page).toHaveURL(`${guidePath}#name-the-default-to-change`);
  await expect(secondSection).toHaveAttribute("aria-current", "location");
  const headingTop = await page
    .getByRole("heading", { name: "Name the default to change" })
    .evaluate((heading) => heading.getBoundingClientRect().top);
  expect(headingTop).toBeGreaterThanOrEqual(70);
  expect(headingTop).toBeLessThanOrEqual(150);

  await page.evaluate(() => {
    const button = Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        '[aria-label="Reading text size"] button'
      )
    ).find((candidate) => candidate.textContent?.trim() === "Default");
    button?.click();
  });
  await expect(secondSection).toHaveAttribute("aria-current", "location");
});

test("a direct section fragment restores the matching current location", async ({
  page
}) => {
  await page.goto(`${guidePath}#choose-one-next-move`);
  const outline = await getVisibleOutline(page);

  await expect(
    outline.getByRole("link", { name: "Choose one next move" })
  ).toHaveAttribute("aria-current", "location");
  await expect(
    page.getByRole("heading", { name: "Choose one next move" })
  ).toBeVisible();
});

test("the mobile contents disclosure stays usable and contained at 320px", async ({
  page
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));
  await page.setViewportSize({ height: 844, width: 320 });
  await page.goto(guidePath);

  const summary = page.locator("summary").filter({ hasText: "In this guide" });
  const summaryBox = await summary.boundingBox();
  expect(summaryBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  await summary.click();

  const outline = page.getByRole("navigation", { name: "In this guide" });
  for (const link of await outline.getByRole("link").all()) {
    const box = await link.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  }

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);

  const accessibility = await new AxeBuilder({ page })
    .include('nav[aria-labelledby="mobile-guide-outline-heading"]')
    .analyze();
  expect(
    accessibility.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? "")
    )
  ).toEqual([]);
});
