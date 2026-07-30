import { expect, test } from "@playwright/test";

type ShareWindow = Window & {
  __sojiCopiedUrl?: string;
  __sojiSharePayload?: ShareData;
};

test("a guide opens native sharing with the current URL", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        (window as ShareWindow).__sojiSharePayload = data;
      }
    });
  });
  await page.goto("/library/wealth-without-drift");

  await page.getByRole("button", { name: "Share guide" }).click();

  await expect(page.getByRole("button", { name: "Shared" })).toBeVisible();
  const payload = await page.evaluate(
    () => (window as ShareWindow).__sojiSharePayload
  );
  expect(payload).toEqual({
    title: "Wealth Without Drift: A 90-Minute Decision Reset",
    url: page.url()
  });
});

test("a product copies its URL when native sharing is unavailable", async ({
  page
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as ShareWindow).__sojiCopiedUrl = value;
        }
      }
    });
  });
  await page.goto("/products/wealth-dashboard-template-pack");

  await page.getByRole("button", { name: "Share tool" }).click();

  await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();
  const copiedUrl = await page.evaluate(
    () => (window as ShareWindow).__sojiCopiedUrl
  );
  expect(copiedUrl).toBe(page.url());
});

test("a blocked share leaves a focused manual-copy path", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async () => {
        throw new Error("blocked");
      }
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("blocked");
        }
      }
    });
  });
  await page.goto("/library/wealth-without-drift");

  await page.getByRole("button", { name: "Share guide" }).click();

  const manualLink = page.getByLabel("Copy this link manually");
  await expect(manualLink).toBeFocused();
  await expect(manualLink).toHaveValue(page.url());
  await expect(page.getByText("The full link is selected and ready to copy."))
    .toBeVisible();
});

test("share actions preserve touch targets and narrow layouts", async ({
  page
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));

  for (const path of [
    "/library/wealth-without-drift",
    "/products/wealth-dashboard-template-pack"
  ]) {
    await page.setViewportSize({ height: 844, width: 320 });
    await page.goto(path);

    const shareAction = page.getByRole("button", {
      name: path.startsWith("/library") ? "Share guide" : "Share tool"
    });
    const box = await shareAction.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(
      dimensions.clientWidth
    );
  }
});
