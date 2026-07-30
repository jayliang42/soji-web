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

async function visibleCount(button: import("@playwright/test").Locator) {
  const text = await button.textContent();
  const count = text?.match(/\d+/u)?.[0];

  return Number(count);
}

test("Admin overview turns status into direct workspace paths", async ({
  page
}) => {
  await page.goto("/admin");

  await expect(
    page.getByRole("heading", {
      name: "Move from status to the next operation."
    })
  ).toBeVisible();

  const workspaceNavigation = page.getByRole("navigation", {
    name: "Admin workspaces"
  });
  for (const [name, href] of [
    ["Open content workspace", "/admin?view=content"],
    ["Open product workspace", "/admin?view=products"],
    ["Open Office Hours", "/admin?view=office-hours"],
    ["Open user workspace", "/admin?view=users"],
    ["Open billing workspace", "/admin?view=billing"]
  ] as const) {
    await expect(
      workspaceNavigation.getByRole("link", { name })
    ).toHaveAttribute("href", href);
  }

  const checklist = page.getByRole("region", { name: "Launch Checklist" });
  const openButton = checklist.getByRole("button", { name: "Open" });
  await expect(openButton).toHaveAttribute("aria-pressed", "true");
  await expect(checklist.getByRole("listitem")).toHaveCount(
    await visibleCount(openButton)
  );

  const allButton = checklist.getByRole("button", { name: "All" });
  await allButton.click();
  await expect(allButton).toHaveAttribute("aria-pressed", "true");
  await expect(checklist.getByRole("listitem")).toHaveCount(
    await visibleCount(allButton)
  );

  await expectNoHorizontalOverflow(page);
});

test("Admin navigation and task controls remain usable at narrow widths", async ({
  page
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));

  for (const width of [320, 390]) {
    await page.setViewportSize({ height: 844, width });
    await page.goto("/admin");

    const controls = [
      ...await page
        .getByRole("navigation", { name: "Admin sections" })
        .getByRole("link")
        .all(),
      ...await page
        .getByRole("navigation", { name: "Admin workspaces" })
        .getByRole("link")
        .all(),
      ...await page
        .getByRole("group", { name: "Filter launch checklist" })
        .getByRole("button")
        .all()
    ];

    for (const control of controls) {
      const box = await control.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    }

    await expectNoHorizontalOverflow(page);
  }
});
