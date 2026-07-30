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

test("default sign in uses account-specific intent", async ({ page }) => {
  await page.goto("/login");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Sign in to your Soji account"
    })
  ).toBeVisible();
  await expect(
    page.getByText(
      "Review memberships, purchases, downloads, and billing controls in one place."
    )
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("anchored destinations keep the correct task copy", async ({ page }) => {
  await page.goto("/login?next=%2Fpricing%23plan-finder-heading");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Sign in to choose your membership"
    })
  ).toBeVisible();
  await expect(
    page.getByText(
      "Use one account for checkout, subscription management, and member access."
    )
  ).toBeVisible();
});

test("forgot password opens a focused recovery step and returns cleanly", async ({
  page
}) => {
  await page.goto("/login");

  const email = page.getByRole("textbox", { name: "Email" });
  await email.fill("member@example.com");
  await page.getByRole("button", { name: "Forgot password?" }).click();

  await expect(
    page.getByRole("heading", { name: "Reset your password" })
  ).toBeFocused();
  await expect(email).toHaveValue("member@example.com");
  await expect(page.getByLabel("Password")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Send reset link" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toHaveCount(
    0
  );

  await page.getByRole("button", { name: "Back to sign in" }).click();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
});

test("recovery controls remain usable at narrow widths", async ({
  page
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));

  for (const width of [320, 390]) {
    await page.setViewportSize({ height: 844, width });
    await page.goto(
      "/login?error=password_reset_callback_failed&next=/reset-password"
    );

    await expect(
      page.getByRole("heading", { level: 1, name: "Request a new password link" })
    ).toBeVisible();
    const controls = [
      page.getByRole("textbox", { name: "Email" }),
      page.getByRole("button", { name: "Send reset link" }),
      page.getByRole("button", { name: "Back to sign in" })
    ];

    for (const control of controls) {
      const box = await control.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    }

    await expectNoHorizontalOverflow(page);
  }
});
