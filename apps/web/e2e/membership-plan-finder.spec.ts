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

test("pricing presents one-time $5 and $99 case-study purchases", async ({
  page
}) => {
  await page.goto("/pricing");

  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(2);

  const singleCase = cards.filter({
    has: page.getByRole("heading", { name: "单篇真实录取案例" })
  });
  await expect(singleCase.getByText("$5", { exact: true })).toBeVisible();
  await expect(singleCase.getByText("一次性付款", { exact: true })).toBeVisible();
  await expect(
    singleCase.getByRole("button", { name: "支付配置中" })
  ).toBeDisabled();
  await expect(
    singleCase.getByText("支付功能正在配置中，目前不会发起扣款。", {
      exact: true
    })
  ).toBeVisible();

  const fullAccess = cards.filter({
    has: page.getByRole("heading", { name: "55篇真实录取案例合集" })
  });
  await expect(fullAccess.getByText("$99", { exact: true })).toBeVisible();
  await expect(fullAccess.getByText("一次性付款", { exact: true })).toBeVisible();
  await expect(
    fullAccess.getByRole("button", { name: "Checkout unavailable" })
  ).toBeDisabled();
  await expect(
    fullAccess.getByText(
      "Billing is temporarily unavailable. No payment can be started.",
      { exact: true }
    )
  ).toBeVisible();
  await expect(
    page.getByText("两档均为一次性支付，没有自动续费或月度扣款。", {
      exact: true
    })
  ).toBeVisible();

  const sharedTerms = page.getByRole("complementary", {
    name: "One billing rhythm for full access."
  });
  await expect(sharedTerms.getByText("Pay $99 once.")).toBeVisible();
  await expect(sharedTerms.getByText("no automatic renewal")).toBeVisible();
  await expect(
    sharedTerms.getByRole("link", { name: "Refund policy" })
  ).toHaveAttribute("href", "/refund-policy");
  await expectNoHorizontalOverflow(page);
});

test("the homepage purchase link deep-links to both case-study offers", async ({
  page
}) => {
  await page.goto("/");

  await page.getByRole("link", { name: "查看解锁方式" }).click();

  await expect(page).toHaveURL(/\/pricing#case-study-offers$/u);
  await expect(page.locator("#case-study-offers")).toBeInViewport();
  await expectNoHorizontalOverflow(page);
});

test("case-study purchase controls remain usable at narrow widths", async ({
  page
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));

  for (const width of [320, 390]) {
    await page.setViewportSize({ height: 844, width });
    await page.goto("/pricing");

    for (const name of ["支付配置中", "Checkout unavailable"]) {
      const checkout = page.getByRole("button", { name });
      await expect(checkout).toBeDisabled();
      const checkoutBox = await checkout.boundingBox();
      expect(checkoutBox?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(checkoutBox?.width ?? 0).toBeGreaterThanOrEqual(44);
    }

    for (const name of ["Terms", "Refund policy", "Privacy", "Support"]) {
      const link = page
        .getByRole("navigation", { name: "Membership policies and support" })
        .getByRole("link", { name });
      const box = await link.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    }

    await expectNoHorizontalOverflow(page);
  }
});
