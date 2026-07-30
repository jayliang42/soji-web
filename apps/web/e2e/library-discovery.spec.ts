import { expect, test } from "@playwright/test";

test("library focus filters reveal a useful subset and reset cleanly", async ({
  page
}) => {
  await page.goto("/library");

  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "What would feel useful right now?"
    })
  ).toBeVisible();
  await page
    .getByRole("button", { exact: true, name: "Career & earning" })
    .click();

  await expect(page.getByText("1 guide match your filters")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Salary Negotiation Playbook"
    })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "The First Money Audit"
    })
  ).toHaveCount(0);

  await page
    .getByRole("button", { exact: true, name: "Clear filters" })
    .click();
  await expect(page.getByText("6 guides in the library")).toBeVisible();
});

test("library search has a helpful empty state and one-action recovery", async ({
  page
}) => {
  await page.goto("/library");
  await page
    .getByRole("searchbox", { name: "Search the library" })
    .fill("no guide should match this phrase");

  await expect(
    page.getByRole("heading", {
      level: 3,
      name: "No guides match those filters."
    })
  ).toBeVisible();
  await page
    .getByRole("button", { exact: true, name: "Show all guides" })
    .click();

  await expect(page.getByText("6 guides in the library")).toBeVisible();
  await expect(
    page.getByRole("searchbox", { name: "Search the library" })
  ).toHaveValue("");
});

test("goal links open a focused library without mobile overflow", async ({
  page
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/library?focus=family");

  await expect(
    page.getByRole("button", { exact: true, name: "Family & legacy" })
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("4 guides match your filters")).toBeVisible();

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    controls: Array.from(
      document.querySelectorAll(
        '[aria-label="Filter guides by focus"] button, input[type="search"], select'
      )
    ).map((control) => control.getBoundingClientRect().height),
    scrollWidth: document.documentElement.scrollWidth
  }));

  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
  expect(layout.controls.every((height) => height >= 44)).toBe(true);
});
