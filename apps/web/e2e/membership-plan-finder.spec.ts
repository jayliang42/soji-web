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

test("plan finder recommends each tier from a concrete need", async ({
  page
}) => {
  await page.goto("/pricing");

  const finder = page.getByRole("region", {
    name: "Find your best starting point."
  });
  await expect(finder).toBeVisible();
  await expect(
    finder.getByText("Choose the closest match above.", { exact: true })
  ).toBeVisible();

  const scenarios = [
    {
      choice: "Build a calmer monthly rhythm",
      plan: "Tier 1",
      price: "$29 / month"
    },
    {
      choice: "Use the full working library",
      plan: "Tier 2",
      price: "$128 / month"
    },
    {
      choice: "Add live guided support",
      plan: "Tier 3",
      price: "$299 / month"
    }
  ] as const;

  for (const scenario of scenarios) {
    const choice = finder.getByRole("button", {
      name: new RegExp(scenario.choice, "iu")
    });
    await choice.click();
    await expect(choice).toHaveAttribute("aria-pressed", "true");
    await expect(
      finder.getByRole("heading", { level: 3, name: scenario.plan })
    ).toBeVisible();
    await expect(finder.getByText(scenario.price, { exact: true })).toBeVisible();
    await expect(
      finder.getByRole("link", { name: `Review ${scenario.plan}` })
    ).toHaveAttribute(
      "href",
      `#plan-${scenario.plan.toLowerCase().replace(" ", "_")}`
    );
  }

  await expectNoHorizontalOverflow(page);
});

test("plan finder deep-links to the recommended plan card", async ({ page }) => {
  await page.goto("/pricing");

  const finder = page.getByRole("region", {
    name: "Find your best starting point."
  });
  await finder
    .getByRole("button", { name: /use the full working library/iu })
    .click();
  await finder.getByRole("link", { name: "Review Tier 2" }).click();

  await expect(page).toHaveURL(/#plan-tier_2$/u);
  await expect(page.locator("#plan-tier_2")).toBeInViewport();
  await expectNoHorizontalOverflow(page);
});

test("comparison keeps plan prices local and groups shared terms once", async ({
  page
}) => {
  await page.goto("/pricing");

  const plans = [
    { name: "Tier 1", price: "$29 billed monthly until canceled." },
    { name: "Tier 2", price: "$128 billed monthly until canceled." },
    { name: "Tier 3", price: "$299 billed monthly until canceled." }
  ] as const;

  for (const plan of plans) {
    const card = page.getByRole("article", { name: plan.name });
    await expect(card.getByText(plan.price, { exact: true })).toBeVisible();
    await expect(card.getByRole("link", { name: "Refund policy" })).toHaveCount(0);
  }

  const sharedTerms = page.getByRole("complementary", {
    name: "One billing rhythm across every plan."
  });
  await expect(sharedTerms).toBeVisible();
  await expect(
    sharedTerms.getByText("Stripe Customer Portal", { exact: false })
  ).toBeVisible();
  await expect(
    sharedTerms.getByRole("link", { name: "Refund policy" })
  ).toHaveAttribute("href", "/refund-policy");
  await expect(page.locator('main a[href="/refund-policy"]')).toHaveCount(1);
  await expectNoHorizontalOverflow(page);
});

test("plan finder controls remain usable at narrow widths", async ({
  page
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));

  for (const width of [320, 390]) {
    await page.setViewportSize({ height: 844, width });
    await page.goto("/pricing");

    const finder = page.getByRole("region", {
      name: "Find your best starting point."
    });
    const choices = finder.getByRole("button");
    const choiceCount = await choices.count();

    for (let index = 0; index < choiceCount; index += 1) {
      const box = await choices.nth(index).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    }

    await choices.nth(1).click();
    const review = finder.getByRole("link", { name: "Review Tier 2" });
    const reviewBox = await review.boundingBox();
    expect(reviewBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(reviewBox?.width ?? 0).toBeGreaterThanOrEqual(44);

    await expectNoHorizontalOverflow(page);
  }
});
