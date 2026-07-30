import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

async function openMobileNavigation(
  page: import("@playwright/test").Page
) {
  await page.getByRole("button", { exact: true, name: "Menu" }).click();
  const navigation = page.getByRole("navigation", { name: "Primary" });
  await expect(navigation).toBeVisible();
  return navigation;
}

test("mobile navigation closes from the backdrop and restores page state", async ({
  page
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));
  await page.setViewportSize({ height: 700, width: 320 });
  await page.goto("/");
  await page.evaluate(() => window.scrollTo(0, 420));
  const scrollBefore = await page.evaluate(() => window.scrollY);

  const navigation = await openMobileNavigation(page);
  await expect(
    navigation.getByRole("link", { exact: true, name: "Subscriptions" })
  ).toBeFocused();
  await expect(page.getByTestId("navigation-backdrop")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe("hidden");

  await page.getByTestId("navigation-backdrop").click({
    position: { x: 10, y: 650 }
  });

  await expect(navigation).toBeHidden();
  await expect(
    page.getByRole("button", { exact: true, name: "Menu" })
  ).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe("");
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
});

test("mobile navigation closes after a destination is chosen", async ({
  page
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));
  await page.goto("/");

  const navigation = await openMobileNavigation(page);
  await navigation.getByRole("link", { exact: true, name: "Shop" }).click();

  await expect(page).toHaveURL(/\/products$/u);
  await expect(navigation).toBeHidden();
  await expect(
    page.getByRole("button", { exact: true, name: "Menu" })
  ).toHaveAttribute("aria-expanded", "false");
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe("");
});

test("account navigation marks only the requested subsection current", async ({
  page
}) => {
  await page.goto("/account?view=subscriptions");
  const navigation = page.getByRole("navigation", { name: "Primary" });
  if (!(await navigation.isVisible())) {
    await openMobileNavigation(page);
  }

  await expect(
    navigation.getByRole("link", { exact: true, name: "Subscriptions" })
  ).toHaveAttribute("aria-current", "page");
  await expect(
    navigation.getByRole("link", { exact: true, name: "Account" })
  ).not.toHaveAttribute("aria-current", "page");
});

test("short mobile viewports keep every destination reachable", async ({
  page
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));
  await page.setViewportSize({ height: 480, width: 320 });
  await page.goto("/");

  const navigation = await openMobileNavigation(page);
  const layout = await navigation.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      bottom: rect.bottom,
      clientHeight: element.clientHeight,
      clientWidth: element.clientWidth,
      scrollHeight: element.scrollHeight,
      scrollWidth: element.scrollWidth,
      top: rect.top,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth
    };
  });

  expect(layout.top).toBeGreaterThanOrEqual(0);
  expect(layout.bottom).toBeLessThanOrEqual(layout.viewportHeight);
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
  expect(layout.clientWidth).toBeLessThan(layout.viewportWidth);
  expect(layout.scrollHeight).toBeGreaterThan(layout.clientHeight);

  const account = navigation.getByRole("link", {
    exact: true,
    name: "Account"
  });
  await account.scrollIntoViewIfNeeded();
  await expect(account).toBeVisible();
  const box = await account.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

  const accessibility = await new AxeBuilder({ page })
    .include("header")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blockingViolations = accessibility.violations.filter(
    (violation) =>
      violation.impact === "critical" || violation.impact === "serious"
  );
  expect(blockingViolations).toEqual([]);
});

test("desktop navigation separates the account action and remains sticky", async ({
  page
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("desktop"));
  await page.goto("/library");

  const navigation = page.getByRole("navigation", { name: "Primary" });
  const library = navigation.getByRole("link", {
    exact: true,
    name: "Library"
  });
  const account = navigation.getByRole("link", {
    exact: true,
    name: "Account"
  });
  await expect(library).toHaveAttribute("aria-current", "page");

  const styles = await Promise.all(
    [library, account].map((locator) =>
      locator.evaluate((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          backgroundColor: style.backgroundColor,
          borderRadius: style.borderRadius,
          height: rect.height
        };
      })
    )
  );
  expect(styles[0].backgroundColor).not.toBe(styles[1].backgroundColor);
  expect(Number.parseFloat(styles[1].borderRadius)).toBeGreaterThan(10);
  expect(styles[1].height).toBeGreaterThanOrEqual(40);
  await expect(page.getByText("Well Endowed", { exact: true })).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, 900));
  const headerTop = await page
    .locator("header")
    .evaluate((element) => element.getBoundingClientRect().top);
  expect(headerTop).toBe(0);
});
