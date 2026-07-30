import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.setTimeout(120_000);

const acceptanceWidths = [320, 375, 768, 1024, 1440] as const;

const customerWorkflows = [
  { heading: "Well Endowed", path: "/" },
  { heading: "Sign in to your Soji account", path: "/login" },
  { heading: "Choose a new password", path: "/reset-password" },
  { heading: "Choose your membership", path: "/pricing" },
  {
    heading: "Buy one focused tool without joining a membership.",
    path: "/products"
  },
  {
    heading: "Guides for making clearer money decisions",
    path: "/library"
  },
  {
    heading: "Wealth Without Drift: A 90-Minute Decision Reset",
    path: "/library/wealth-without-drift"
  },
  {
    heading: "Closer support for higher-stakes decisions.",
    path: "/office-hours"
  },
  { heading: "Soji Demo Member", path: "/account" }
] as const;

const adminWorkspaces = [
  { label: "Overview", path: "/admin" },
  { label: "Content", path: "/admin?view=content" },
  { label: "Products", path: "/admin?view=products" },
  { label: "Office hours", path: "/admin?view=office-hours" },
  { label: "Users", path: "/admin?view=users" },
  { label: "Billing", path: "/admin?view=billing" }
] as const;

async function documentFitsViewport(page: import("@playwright/test").Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

for (const width of acceptanceWidths) {
  test(`customer and Admin workflows preserve semantic parity at ${width}px`, async ({
    page
  }) => {
    await page.setViewportSize({ height: 900, width });

    for (const workflow of customerWorkflows) {
      await page.goto(workflow.path);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: workflow.heading
        })
      ).toBeVisible();
      await expect(page.locator("main")).toHaveCount(1);
      await documentFitsViewport(page);
    }

    for (const workspace of adminWorkspaces) {
      await page.goto(workspace.path);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Editorial, membership, and revenue operations"
        })
      ).toBeVisible();
      const navigation = page.getByRole("navigation", {
        name: "Admin sections"
      });
      await expect(
        navigation.getByRole("link", {
          exact: true,
          name: workspace.label
        })
      ).toHaveAttribute("aria-current", "page");
      for (const { label } of adminWorkspaces) {
        await expect(
          navigation.getByRole("link", { exact: true, name: label })
        ).toBeVisible();
      }
      await documentFitsViewport(page);
    }
  });
}

test("Billing keeps receipt, processing, timing, and the supported action in order", async ({
  page
}) => {
  await page.setViewportSize({ height: 900, width: 320 });
  await page.goto("/admin?view=billing");

  const failedEvent = page
    .locator("article")
    .filter({ hasText: "evt_demo_received_failed" });
  await expect(failedEvent).toBeVisible();
  await expect(failedEvent.getByText("Receipt · Received")).toBeVisible();
  await expect(failedEvent.getByText("Processing · Failed")).toBeVisible();
  await expect(
    failedEvent.getByRole("button", { name: "Retry processing" })
  ).toBeVisible();

  const orderedText = (await failedEvent.innerText()).toLowerCase();
  expect(orderedText.indexOf("receipt · received")).toBeLessThan(
    orderedText.indexOf("processing · failed")
  );
  expect(orderedText.indexOf("processing · failed")).toBeLessThan(
    orderedText.indexOf("attempts")
  );
  expect(orderedText.indexOf("attempts")).toBeLessThan(
    orderedText.indexOf("retry processing")
  );
  await documentFitsViewport(page);
});

test("launch workflows have no serious or critical findings after interaction", async ({
  page
}) => {
  for (const path of [
    "/login",
    "/library/wealth-without-drift",
    "/account",
    "/admin?view=products",
    "/admin?view=billing"
  ]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      results.violations.filter(
        ({ impact }) => impact === "critical" || impact === "serious"
      ),
      `${path} has a blocking accessibility finding`
    ).toEqual([]);
  }
});

test("unauthorized workflow responses omit privileged actions and targets", async ({
  request
}) => {
  const restrictedArticle = await (
    await request.get("/library/wealth-without-drift")
  ).text();
  expect(restrictedArticle).not.toContain(
    "Each item seems manageable alone. Together, they create a background feeling"
  );
  expect(restrictedArticle).not.toContain("Download");

  const officeHours = await (await request.get("/office-hours")).text();
  expect(officeHours).not.toContain("https://example.com/office-hour");
  expect(officeHours).not.toContain("https://example.com/replay");
  expect(officeHours).not.toContain("Join live session");
  expect(officeHours).not.toContain("Watch replay");
});
