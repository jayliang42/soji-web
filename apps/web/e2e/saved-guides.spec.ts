import { expect, test } from "@playwright/test";

test("readers can save from a card and reopen a durable reading list", async ({
  page
}) => {
  await page.goto("/library");

  await page
    .getByRole("button", {
      name: "Save The First Money Audit for later"
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Remove The First Money Audit from saved guides"
    })
  ).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { exact: true, name: "Saved" }).click();
  await expect(page).toHaveURL("/library?focus=saved");
  await expect(page.getByText("1 guide match your filters")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "The First Money Audit"
    })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Salary Negotiation Playbook"
    })
  ).toHaveCount(0);

  await page.reload();
  await expect(page).toHaveURL("/library?focus=saved");
  await expect(page.getByText("1 guide match your filters")).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL("/library");
  await expect(
    page.getByRole("button", { exact: true, name: "All guides" })
  ).toHaveAttribute("aria-pressed", "true");
  await page.goForward();
  await expect(page).toHaveURL("/library?focus=saved");
  await expect(page.getByText("1 guide match your filters")).toBeVisible();
});

test("article saving synchronizes with Library and supports removal", async ({
  page
}) => {
  await page.goto("/library/wealth-without-drift");

  await page
    .getByRole("button", {
      name: "Save Wealth Without Drift: A 90-Minute Decision Reset for later"
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Remove Wealth Without Drift: A 90-Minute Decision Reset from saved guides"
    })
  ).toBeVisible();

  await page.getByRole("link", { name: "Return to Library" }).click();
  await page.getByRole("button", { exact: true, name: "Saved" }).click();
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Wealth Without Drift: A 90-Minute Decision Reset"
    })
  ).toBeVisible();

  await page
    .getByRole("button", {
      name: "Remove Wealth Without Drift: A 90-Minute Decision Reset from saved guides"
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "No saved guides yet." })
  ).toBeVisible();
  await expect(page.getByText("0 guides match your filters")).toBeVisible();
});

test("saved-guide controls remain usable at mobile width", async ({
  page
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));
  await page.setViewportSize({ height: 844, width: 320 });
  await page.goto("/library");

  const saveAction = page
    .getByRole("button", { name: /Save .+ for later/u })
    .first();
  const savedFilter = page.getByRole("button", {
    exact: true,
    name: "Saved"
  });

  for (const control of [saveAction, savedFilter]) {
    const box = await control.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  }

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
});
