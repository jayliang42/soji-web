import { expect, test } from "@playwright/test";

const publicPages = [
  { heading: "Well Endowed", path: "/" },
  {
    heading: "Choose your membership",
    path: "/pricing"
  },
  {
    heading: "Buy one focused tool without joining a membership.",
    path: "/products"
  },
  {
    heading: "Content, templates, and member-only drops",
    path: "/library"
  },
  {
    heading: "Closer support for higher-stakes decisions.",
    path: "/office-hours"
  },
  { heading: "Sign in to continue reading", path: "/login" },
  { heading: "Choose a new password", path: "/reset-password" },
  { heading: "Soji Demo Member", path: "/account" }
] as const;

for (const publicPage of publicPages) {
  test(`${publicPage.path} renders without horizontal overflow`, async ({ page }) => {
    await page.goto(publicPage.path);
    await expect(
      page.getByRole("heading", { level: 1, name: publicPage.heading })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { exact: true, name: "Account" })
    ).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    if (publicPage.path === "/account") {
      await expect(
        page.getByRole("link", { name: "Open admin workspace" })
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { level: 2, name: "Subscriptions" })
      ).toBeVisible();
      await expect(page.getByText("Canceled", { exact: true })).toBeVisible();
      await expect(
        page.getByText("Billing management is temporarily unavailable")
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Billing unavailable" })
      ).toBeDisabled();
    }
  });
}

test("primary navigation remains fully visible at 320px", async ({ page }) => {
  await page.setViewportSize({ height: 700, width: 320 });
  await page.goto("/");

  const navigation = page.getByRole("navigation", { name: "Primary" });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Office hours" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Home" })).toHaveCount(0);

  const layout = await navigation.evaluate((element) => ({
    clientWidth: element.clientWidth,
    links: Array.from(element.querySelectorAll("a")).map((link) => {
      const rect = link.getBoundingClientRect();
      return { left: rect.left, right: rect.right };
    }),
    scrollWidth: element.scrollWidth,
    viewportWidth: window.innerWidth
  }));

  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
  expect(layout.links.every(({ left, right }) => left >= 0 && right <= layout.viewportWidth))
    .toBe(true);
});

test("primary navigation identifies the current section", async ({ page }) => {
  await page.goto("/office-hours");

  const navigation = page.getByRole("navigation", { name: "Primary" });
  await expect(
    navigation.getByRole("link", { name: "Office hours" })
  ).toHaveAttribute("aria-current", "page");
  await expect(
    navigation.getByRole("link", { name: "Pricing" })
  ).not.toHaveAttribute("aria-current", "page");
});

test("a forged checkout return never claims payment confirmation", async ({ page }) => {
  await page.goto("/account?purchase=success&session_id=forged");

  await expect(
    page.getByText("This checkout return could not be verified.", { exact: true })
  ).toBeVisible();
  await expect(page.getByText("Payment confirmed.", { exact: true })).toHaveCount(0);
});

test("demo admin preview is clearly identified", async ({ page }) => {
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Editorial, membership, and revenue operations"
    })
  ).toBeVisible();
  await expect(page.getByText(/Current publisher state: demo preview\./)).toBeVisible();
  await expect(page.getByText("First production Admin", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      "Demo access does not prove that a production Admin account exists.",
      { exact: true }
    )
  ).toBeVisible();
  await expect(page.getByRole("link", { exact: true, name: "Overview" })).toHaveAttribute(
    "aria-current",
    "page"
  );
  await expect(page.getByText("Product delivery assets", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Verify private delivery files against the production product catalog.", {
      exact: true
    })
  ).toBeVisible();
  const checklistLayout = await page.evaluate(() => ({
    cardsFitViewport: Array.from(
      document.querySelectorAll(
        'section[aria-labelledby="launch-checklist-heading"] li'
      )
    ).every((item) => {
      const rect = item.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= window.innerWidth;
    }),
    pageWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth
  }));
  expect(checklistLayout.pageWidth).toBeLessThanOrEqual(
    checklistLayout.viewportWidth
  );
  expect(checklistLayout.cardsFitViewport).toBe(true);

  await page.goto("/admin?view=users");
  await expect(page.getByRole("searchbox", { name: "Search users" })).toBeDisabled();
  await expect(
    page.getByRole("button", { exact: true, name: "Search" })
  ).toBeDisabled();

  await page.goto("/admin?view=products");
  await expect(page.locator('input[type="file"]').last()).toBeDisabled();
  await expect(page.getByText(/missing delivery file/).first()).toBeVisible();

  await page.goto("/admin?view=billing");
  await expect(page.getByText("Received and stored", { exact: true })).toBeVisible();
  await expect(page.getByText("Processing failed", { exact: true })).toHaveCount(2);
  await expect(page.getByText("evt_demo_received_failed", { exact: false })).toBeVisible();
  await expect(page.getByText("Attempts", { exact: true })).toBeVisible();
});

test("billing recovery reports only the operation that is actually running", async ({
  page
}) => {
  let releaseRetry: (() => void) | undefined;
  const retryGate = new Promise<void>((resolve) => {
    releaseRetry = resolve;
  });
  await page.route("**/api/admin/billing-events/*/retry", async (route) => {
    await retryGate;
    await route.fulfill({
      body: JSON.stringify({
        ok: true,
        processedAt: "2026-07-15T15:00:00.000Z",
        result: { action: "ignored" }
      }),
      contentType: "application/json",
      status: 200
    });
  });

  await page.goto("/admin?view=billing");
  await page.getByRole("button", { name: "Retry processing" }).click();

  await expect(page.getByRole("button", { name: "Retrying..." })).toBeVisible();
  await expect(
    page.getByRole("button", { exact: true, name: "Reconcile billing" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Reconciling..." })).toHaveCount(0);

  releaseRetry?.();
  await expect(page.getByText("Billing event processed successfully.")).toBeVisible();

  let releaseReconciliation: (() => void) | undefined;
  const reconciliationGate = new Promise<void>((resolve) => {
    releaseReconciliation = resolve;
  });
  await page.route("**/api/admin/billing-events/reconcile", async (route) => {
    await reconciliationGate;
    await route.fulfill({
      body: JSON.stringify({
        event: {
          attemptCount: 1,
          createdAt: "2026-07-15T15:01:00.000Z",
          eventType: "admin.billing.reconcile",
          id: "00000000-0000-4000-8000-000000000778",
          lastAttemptedAt: "2026-07-15T15:01:00.000Z",
          processedAt: "2026-07-15T15:01:01.000Z",
          processingError: null,
          processingStartedAt: null,
          provider: "stripe",
          providerEventId: "reconcile_test",
          status: "processed"
        },
        ok: true,
        result: { staleSubscriptionsClosed: 0, subscriptionsSynced: 1 }
      }),
      contentType: "application/json",
      status: 200
    });
  });
  await page
    .getByRole("textbox", { name: "Reconcile from Stripe" })
    .fill("cus_test123");
  await page.getByRole("button", { exact: true, name: "Reconcile billing" }).click();

  await expect(page.getByRole("button", { name: "Reconciling..." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retrying..." })).toHaveCount(0);

  releaseReconciliation?.();
  await expect(page.getByText(/Reconciled 1 subscription/)).toBeVisible();
});

test("billing evidence remains discoverable across pages", async ({ page }) => {
  const requestedPages: string[] = [];
  await page.route("**/api/admin/billing-events?**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const requestedPage = requestUrl.searchParams.get("page") ?? "1";
    const ignored = requestedPage === "2";
    requestedPages.push(requestedPage);
    await route.fulfill({
      body: JSON.stringify({
        items: [
          {
            attemptCount: 1,
            createdAt: "2026-07-15T15:01:00.000Z",
            eventType: ignored ? "invoice.created" : "checkout.session.completed",
            id: `00000000-0000-4000-8000-00000000070${requestedPage}`,
            lastAttemptedAt: "2026-07-15T15:01:00.000Z",
            processedAt: ignored ? "2026-07-15T15:01:01.000Z" : null,
            processingError: ignored ? null : "Test processing failure",
            processingStartedAt: null,
            provider: "stripe",
            providerEventId: `evt_page_${requestedPage}`,
            status: ignored ? "ignored" : "failed"
          }
        ],
        ok: true,
        page: Number(requestedPage),
        pageSize: 50,
        totalItems: 51,
        totalPages: 2
      }),
      contentType: "application/json",
      status: 200
    });
  });

  await page.goto("/admin?view=billing");
  await page.getByRole("button", { name: "Search events" }).click();
  await expect(page.getByText("Showing 1-50 of 51")).toBeVisible();
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  await page.getByRole("button", { exact: true, name: "Next" }).click();
  await expect(page.getByText("evt_page_2", { exact: false })).toBeVisible();
  await expect(page.getByText("Stored, no handler", { exact: true })).toHaveCount(2);
  await expect(page.getByText(/this type does not change Soji state/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry processing" })).toHaveCount(0);
  await expect(page.getByText("Showing 51-51 of 51")).toBeVisible();
  await expect(
    page.getByRole("button", { exact: true, name: "Next" })
  ).toBeDisabled();
  expect(requestedPages).toEqual(["1", "2"]);
});

test("admin Markdown preview matches the safe reader renderer", async ({ page }) => {
  await page.goto("/admin?view=content");

  const createForm = page
    .getByRole("heading", { level: 3, name: "Create Content" })
    .locator("..");
  await createForm
    .getByRole("textbox", { exact: true, name: "Body (Markdown)" })
    .fill(
      '## Preview heading\n\n- First idea\n- Second idea\n\n<script>alert("xss")</script>'
    );
  await createForm.getByRole("tab", { exact: true, name: "preview" }).click();

  await expect(
    createForm.getByRole("heading", { level: 2, name: "Preview heading" })
  ).toBeVisible();
  await expect(createForm.getByRole("listitem")).toHaveCount(2);
  await expect(createForm.locator("script")).toHaveCount(0);
  await expect(createForm.getByText('alert("xss")', { exact: true })).toHaveCount(0);
  const skipState = await page
    .getByRole("link", { name: "Skip to main content" })
    .evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        focused: document.activeElement === element,
        top: rect.top
      };
    });
  expect(skipState.focused).toBe(false);
  expect(skipState.bottom).toBeLessThanOrEqual(0);
});

test("content editor protects unsaved changes when switching items", async ({ page }) => {
  await page.goto("/admin?view=content");

  const contentRegion = page.getByRole("region", { name: "Content" });
  const firstItem = contentRegion.getByRole("button", { name: /The First Money Audit/ });
  const secondItem = contentRegion.getByRole("button", { name: /Money Reset Ritual/ });
  const title = contentRegion.getByRole("textbox", { exact: true, name: "Title" }).last();

  await expect(firstItem).toHaveAttribute("aria-pressed", "true");
  await title.fill("Unsaved editorial draft");
  await expect(contentRegion.getByText("Unsaved changes", { exact: true })).toBeVisible();

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Discard unsaved changes");
    await dialog.dismiss();
  });
  await secondItem.click();
  await expect(firstItem).toHaveAttribute("aria-pressed", "true");
  await expect(title).toHaveValue("Unsaved editorial draft");

  page.once("dialog", (dialog) => dialog.accept());
  await secondItem.click();
  await expect(secondItem).toHaveAttribute("aria-pressed", "true");
  await expect(contentRegion.getByText("Saved version 1", { exact: true })).toBeVisible();
});

test("product editor protects unsaved changes when switching offers", async ({ page }) => {
  await page.goto("/admin?view=products");

  const productsRegion = page.getByRole("region", { name: "Products" });
  const firstProduct = productsRegion.getByRole("button", {
    name: /Wealth Dashboard Template Pack/
  });
  const secondProduct = productsRegion.getByRole("button", {
    name: /Family Money Scripts/
  });
  const title = productsRegion.getByRole("textbox", { exact: true, name: "Title" });

  await expect(
    productsRegion.getByRole("heading", { name: "Private File Cleanup" })
  ).toBeVisible();
  await expect(
    productsRegion.getByText("No private files are awaiting cleanup.")
  ).toBeVisible();
  await expect(firstProduct).toHaveAttribute("aria-pressed", "true");
  await title.fill("Unsaved product draft");
  await expect(productsRegion.getByText("Unsaved changes", { exact: true })).toBeVisible();

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Discard unsaved changes");
    await dialog.dismiss();
  });
  await secondProduct.click();
  await expect(firstProduct).toHaveAttribute("aria-pressed", "true");
  await expect(title).toHaveValue("Unsaved product draft");

  page.once("dialog", (dialog) => dialog.accept());
  await secondProduct.click();
  await expect(secondProduct).toHaveAttribute("aria-pressed", "true");
  await expect(productsRegion.getByText("Saved version 1", { exact: true })).toBeVisible();
});

test("office-hour editor protects changes before starting a new draft", async ({ page }) => {
  await page.goto("/admin?view=office-hours");

  const officeHoursRegion = page.getByRole("region", { name: "Office hours" });
  const existingSession = officeHoursRegion.getByRole("button", {
    name: /June Office Hour: Family Money Decisions/
  });
  const title = officeHoursRegion.getByRole("textbox", { exact: true, name: "Title" });
  const newButton = officeHoursRegion.getByRole("button", { exact: true, name: "New" });

  await expect(existingSession).toHaveAttribute("aria-pressed", "true");
  await expect(officeHoursRegion.getByLabel("Starts at")).toHaveValue(
    "2026-06-24T14:00"
  );
  await title.fill("Unsaved office-hour draft");
  await expect(officeHoursRegion.getByText("Unsaved changes", { exact: true })).toBeVisible();

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Discard unsaved office-hour changes");
    await dialog.dismiss();
  });
  await newButton.click();
  await expect(existingSession).toHaveAttribute("aria-pressed", "true");
  await expect(title).toHaveValue("Unsaved office-hour draft");

  page.once("dialog", (dialog) => dialog.accept());
  await newButton.click();
  await expect(existingSession).toHaveAttribute("aria-pressed", "false");
  await expect(title).toHaveValue("");
  await expect(
    officeHoursRegion.getByText("New unsaved draft", { exact: true })
  ).toBeVisible();
});

test("member article preview never renders private body text", async ({ page }) => {
  await page.goto("/library/money-reset-ritual");
  await expect(
    page.getByRole("heading", { level: 1, name: "Money Reset Ritual" })
  ).toBeVisible();
  await expect(page.getByText("Preview available", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      "The reset starts with a simple rule: every dollar should either support the life you are building or teach you something about the life you do not want.",
      { exact: true }
    )
  ).toHaveCount(0);
});

test("customer surfaces never expose entitlement identifiers", async ({ page }) => {
  await page.goto("/office-hours");
  await expect(page.getByText(/Live office hours/).first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText("office_hours.join");

  await page.goto("/library/money-reset-ritual");
  await expect(
    page.getByText(/Foundational monthly essays/).first()
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("content.basic");
});

test("the email login form submits from the keyboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("member@example.com");
  await page.getByLabel("Password").fill("test-password");
  await page.getByLabel("Password").press("Enter");

  await expect(
    page.getByText("Sign-in is not configured in this environment yet.", {
      exact: true
    })
  ).toBeVisible();
});

test("authentication controls follow the focused provider-first hierarchy", async ({
  page
}) => {
  await page.goto("/login?next=/admin");

  const google = page.getByRole("button", { name: "Continue with Google" });
  const divider = page.getByText("or continue with email", { exact: true });
  const email = page.getByLabel("Email");
  const password = page.getByLabel("Password");
  const signIn = page.getByRole("button", { name: "Sign in with email" });

  await expect(google).toBeVisible();
  await expect(divider).toBeVisible();
  await expect(email).toBeVisible();
  await expect(password).toBeVisible();
  await expect(signIn).toBeVisible();

  const order = await page
    .locator("form")
    .evaluate((form) =>
      [
        form.querySelector("button"),
        Array.from(form.querySelectorAll("span")).find(
          (element) => element.textContent === "or continue with email"
        ),
        form.querySelector('input[type="email"]'),
        form.querySelector('input[type="password"]')
      ].map((element) => {
        if (!element) {
          throw new Error("Expected authentication control is missing");
        }
        return element.getBoundingClientRect().top;
      })
    );
  expect(order).toEqual([...order].sort((left, right) => left - right));

  const actionHeights = await page
    .locator("form button")
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getBoundingClientRect().height)
    );
  expect(actionHeights.every((height) => height >= 44)).toBe(true);
});

test("authentication modes switch explicitly without auto-submitting", async ({
  page
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("member@example.com");

  const modeGroup = page.getByRole("group", { name: "Authentication mode" });
  const createMode = modeGroup.getByRole("button", {
    exact: true,
    name: "Create account"
  });
  await createMode.click();

  await expect(createMode).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Email")).toHaveValue("member@example.com");
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
  await expect(
    page.getByRole("button", { exact: true, name: "Create account" })
  ).toHaveCount(2);
  await expect(
    page.getByText("Sign-in is not configured in this environment yet.")
  ).toHaveCount(0);

  await modeGroup.getByRole("button", { exact: true, name: "Sign in" }).click();
  await expect(modeGroup.getByRole("button", { exact: true, name: "Sign in" }))
    .toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Sign in with email" }))
    .toBeVisible();
});

test("authentication remains usable without horizontal overflow at 375px", async ({
  page
}) => {
  await page.setViewportSize({ height: 812, width: 375 });
  await page.goto("/login?next=/account");

  await expect(page.getByRole("button", { name: "Continue with Google" }))
    .toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in with email" }))
    .toBeVisible();

  const layout = await page.evaluate(() => ({
    pageWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth
  }));
  expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewportWidth);
});

test("password and OAuth failures retain a clear recovery action", async ({
  page
}) => {
  await page.goto("/login?error=oauth_callback_failed&next=/library");
  await expect(
    page.getByText("Google sign-in could not be completed.", { exact: true })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" }))
    .toBeVisible();

  await page.goto("/reset-password");
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "This reset link is no longer valid."
    })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Request another link" }))
    .toBeVisible();
});

test("membership checkout keeps plan and return intent visible", async ({ page }) => {
  await page.goto("/pricing");
  await expect(
    page.getByRole("button", { name: "Checkout unavailable" }).nth(1)
  ).toBeVisible();
  await expect(
    page.getByText("Billing is temporarily unavailable. No payment can be started.").nth(1)
  ).toBeVisible();
  await expect(page.getByText("Account first, secure Stripe checkout next")).toHaveCount(0);

  await page.goto("/login?next=/pricing");
  await expect(
    page.getByRole("heading", { level: 1, name: "Sign in to choose your membership" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Continue to membership" })
  ).toBeVisible();
});

test("authentication failures remain visible and recoverable", async ({ page }) => {
  await page.goto("/login?error=oauth_callback_failed&next=/library");
  await expect(
    page.getByText("Google sign-in could not be completed.", { exact: true })
  ).toBeVisible();

  await page.goto("/account?setup=failed&next=/library");
  await expect(
    page.getByText("Member profile setup did not finish.", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry profile setup" })
  ).toBeVisible();
});

test("homepage presents the real product without internal design controls", async ({
  page
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("img", {
      name: "Well Endowed hardcover book in a bright reading room"
    })
  ).toBeVisible();
  await expect(page.getByText("Original cover", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Cutout blend", { exact: true })).toHaveCount(0);
  await expect(page.getByText("content.basic", { exact: true })).toHaveCount(0);

  const outcomesTop = await page
    .getByTestId("home-outcomes")
    .evaluate((element) => element.getBoundingClientRect().top);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  expect(outcomesTop).toBeLessThan(viewportHeight);
});

test("public discovery metadata is complete and excludes protected surfaces", async ({
  page,
  request
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Well Endowed by Soji");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://127.0.0.1:3100"
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "http://127.0.0.1:3100/well-endowed-hero.png"
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image"
  );

  const robotsResponse = await request.get("/robots.txt");
  expect(robotsResponse.ok()).toBe(true);
  const robotsBody = await robotsResponse.text();
  expect(robotsBody).toContain("Disallow: /admin");
  expect(robotsBody).toContain("Disallow: /account");

  const sitemapResponse = await request.get("/sitemap.xml");
  expect(sitemapResponse.ok()).toBe(true);
  const sitemapBody = await sitemapResponse.text();
  expect(sitemapBody).toContain("http://127.0.0.1:3100/library");
  expect(sitemapBody).not.toContain("/admin");
  expect(sitemapBody).not.toContain("/account");
  expect(sitemapBody).not.toContain("/api/");

  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  expect(await manifestResponse.json()).toMatchObject({
    name: "Well Endowed by Soji",
    short_name: "Soji"
  });

  await page.goto("/library/money-reset-ritual");
  await expect(page).toHaveTitle("Money Reset Ritual | Soji");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://127.0.0.1:3100/library/money-reset-ritual"
  );

  await page.goto("/account");
  const accountRobots = await page.locator('meta[name="robots"]').getAttribute("content");
  expect(accountRobots).toContain("noindex");
  expect(accountRobots).toContain("nofollow");
});

test("public responses include baseline browser security headers", async ({ page }) => {
  const response = await page.goto("/");
  expect(response).not.toBeNull();
  const headers = response!.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe(
    "strict-origin-when-cross-origin"
  );
  expect(headers["permissions-policy"]).toBe(
    "camera=(), microphone=(), geolocation=()"
  );
  expect(headers["strict-transport-security"]).toBe("max-age=31536000");
  expect(headers["x-powered-by"]).toBeUndefined();

  const policy = headers["content-security-policy"];
  expect(policy).toContain("default-src 'self'");
  expect(policy).toContain("base-uri 'self'");
  expect(policy).toContain("form-action 'self'");
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).toContain("object-src 'none'");
});
