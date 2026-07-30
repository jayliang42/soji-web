import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

type SupportWindow = Window & {
  __sojiSupportRequest?: string;
};

const issueDetails =
  "I selected the workbook, but the download did not appear in Purchases.";

async function prepareRequest(page: import("@playwright/test").Page) {
  await page.goto("/support");
  await page
    .getByLabel("What do you need help with?")
    .selectOption("purchase");
  await page
    .getByLabel("What were you trying to do, and what happened instead?")
    .fill(issueDetails);
  await page
    .getByLabel(/Account, product, page, or timing context/iu)
    .fill("Products page, around 2 PM CT");
  await page.getByRole("button", { name: "Prepare my request" }).click();
}

test("support prepares a reviewable, prefilled email request", async ({
  page
}) => {
  await prepareRequest(page);

  const preview = page.getByRole("complementary", {
    name: "Your support request"
  });
  await expect(preview.getByText("Ready", { exact: true })).toBeVisible();
  await expect(preview.getByText("Issue type: Purchase or download"))
    .toBeVisible();
  await expect(preview.getByText(issueDetails)).toBeVisible();

  const emailAction = preview.getByRole("link", {
    name: "Open email draft"
  });
  const href = await emailAction.getAttribute("href");
  expect(href).not.toBeNull();
  const mailto = new URL(href!);
  expect(mailto.protocol).toBe("mailto:");
  expect(mailto.pathname).toBe("help@soji.test");
  expect(mailto.searchParams.get("subject")).toBe(
    "Soji support — Purchase or download"
  );
  expect(mailto.searchParams.get("body")).toContain(issueDetails);
  expect(mailto.searchParams.get("body")).toContain(
    "Products page, around 2 PM CT"
  );
});

test("support validates the useful details at the field", async ({ page }) => {
  await page.goto("/support");
  await page.getByRole("button", { name: "Prepare my request" }).click();

  const details = page.getByLabel(
    "What were you trying to do, and what happened instead?"
  );
  await expect(details).toBeFocused();
  await expect(details).toHaveAttribute("aria-invalid", "true");
  await expect(
    page.getByText("Describe what happened using at least 10 characters.")
  ).toBeVisible();
  await expect(page.getByText("Your prepared request will appear here."))
    .toBeVisible();
});

test("support copies the exact prepared request", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as SupportWindow).__sojiSupportRequest = value;
        }
      }
    });
  });
  await prepareRequest(page);

  await page.getByRole("button", { name: "Copy request" }).click();

  await expect(
    page.getByText("Request copied. Paste it into your support message.")
  ).toBeVisible();
  const copied = await page.evaluate(
    () => (window as SupportWindow).__sojiSupportRequest
  );
  expect(copied).toContain("Issue type: Purchase or download");
  expect(copied).toContain(issueDetails);
  expect(copied).toContain(
    "Prepared on Soji Support. This message was not saved by Soji."
  );
});

test("a blocked clipboard leaves the complete request selected", async ({
  page
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("blocked");
        }
      }
    });
  });
  await prepareRequest(page);

  await page.getByRole("button", { name: "Copy request" }).click();

  const manualCopy = page.getByLabel("Copy this request manually");
  await expect(manualCopy).toBeFocused();
  await expect(manualCopy).toHaveValue(new RegExp(issueDetails, "u"));
  const selection = await manualCopy.evaluate((element) => {
    const textarea = element as HTMLTextAreaElement;
    return {
      end: textarea.selectionEnd,
      length: textarea.value.length,
      start: textarea.selectionStart
    };
  });
  expect(selection).toEqual({
    end: selection.length,
    length: selection.length,
    start: 0
  });
});

test("prepared support remains accessible and usable at 320px", async ({
  page
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));
  await page.setViewportSize({ height: 844, width: 320 });
  await prepareRequest(page);

  for (const action of [
    page.getByRole("button", { name: "Prepare my request" }),
    page.getByRole("link", { name: "Open email draft" }),
    page.getByRole("button", { name: "Copy request" })
  ]) {
    const box = await action.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  }

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

  const accessibility = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blockingViolations = accessibility.violations.filter(
    (violation) =>
      violation.impact === "critical" || violation.impact === "serious"
  );
  expect(blockingViolations).toEqual([]);
});
