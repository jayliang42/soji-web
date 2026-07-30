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

test("support routes common tasks before contact", async ({ page }) => {
  await page.goto("/support");

  await expect(
    page.getByRole("heading", { level: 1, name: "Support" })
  ).toBeVisible();

  const taskRegion = page.getByRole("region", {
    name: "Choose the closest help path."
  });
  const paths = [
    ["Open sign in & recovery", "/login?next=/account"],
    ["Open subscriptions", "/account?view=subscriptions"],
    ["Open purchases", "/account?view=purchases"],
    ["Review refund steps", "/refund-policy#request"]
  ] as const;

  for (const [name, href] of paths) {
    await expect(taskRegion.getByRole("link", { name: new RegExp(name, "iu") }))
      .toHaveAttribute("href", href);
  }

  await expect(
    page.getByRole("heading", { name: "Send one clear support request." })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Browse public guides" })
  ).toHaveAttribute("href", "/library");
  await expect(
    page.getByRole("link", { name: "Review Office Hours" })
  ).toHaveAttribute("href", "/office-hours");
  await expectNoHorizontalOverflow(page);
});

test("support actions remain usable at narrow widths", async ({
  page
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));

  for (const width of [320, 390]) {
    await page.setViewportSize({ height: 844, width });
    await page.goto("/support");

    const controls = [
      page.getByRole("link", { name: /open sign in & recovery/iu }),
      page.getByRole("link", { name: /open subscriptions/iu }),
      page.getByRole("link", { name: /open purchases/iu }),
      page.getByRole("link", { name: /review refund steps/iu }),
      page.getByRole("link", { name: "Browse public guides" }),
      page.getByRole("link", { name: "Review Office Hours" })
    ];

    for (const control of controls) {
      const box = await control.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    }

    await expectNoHorizontalOverflow(page);
  }
});
