import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const guidePath = "/library/wealth-without-drift";
const progressStorageKey = "soji:reading-progress:v1";
const sizeStorageKey = "soji:reading-size:v1";

async function getReadingBodyStyle(
  page: import("@playwright/test").Page
) {
  return page.locator("#guide-reading-body").evaluate((target) => ({
    fontSize: window.getComputedStyle(target.firstElementChild!).fontSize,
    size: target.getAttribute("data-reading-size")
  }));
}

test("reading size applies only to guide prose, persists, and synchronizes across tabs", async ({
  context,
  page
}) => {
  await page.goto(guidePath);

  const sizeControl = page.getByRole("group", { name: "Reading text size" });
  const defaultSize = sizeControl.getByRole("button", { name: "Default" });
  const largerSize = sizeControl.getByRole("button", { name: "Larger" });
  await expect(defaultSize).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => getReadingBodyStyle(page)).toEqual({
    fontSize: "18px",
    size: "default"
  });

  await largerSize.click();
  await expect(largerSize).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => getReadingBodyStyle(page)).toEqual({
    fontSize: "21px",
    size: "large"
  });
  await expect(
    page.getByText(
      "Larger reading text selected and saved on this device."
    )
  ).toBeAttached();
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), sizeStorageKey))
    .toBe("large");

  await page.reload();
  await expect(largerSize).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => getReadingBodyStyle(page)).toEqual({
    fontSize: "21px",
    size: "large"
  });

  const secondPage = await context.newPage();
  await secondPage.goto(guidePath);
  await expect.poll(() => getReadingBodyStyle(secondPage)).toEqual({
    fontSize: "21px",
    size: "large"
  });
  await defaultSize.click();
  await expect.poll(() => getReadingBodyStyle(secondPage)).toEqual({
    fontSize: "18px",
    size: "default"
  });
  await secondPage.close();
});

test("reading progress remains current after larger prose reflows", async ({
  page
}) => {
  await page.setViewportSize({ height: 720, width: 1280 });
  await page.goto(guidePath);
  await page
    .getByRole("group", { name: "Reading text size" })
    .getByRole("button", { name: "Larger" })
    .click();

  const expectedProgress = await page.evaluate(() => {
    const target = document.getElementById("guide-reading-body");
    if (!target) {
      throw new Error("Reading body not found");
    }

    const targetTop = target.getBoundingClientRect().top + window.scrollY;
    const start = targetTop - 76;
    const end = Math.max(
      start,
      targetTop + target.scrollHeight - window.innerHeight
    );
    window.scrollTo(0, start + (end - start) * 0.45);
    return end === start ? 100 : 45;
  });
  const progress = page.getByRole("progressbar", {
    name: "Reading progress for Wealth Without Drift: A 90-Minute Decision Reset"
  });

  await expect
    .poll(async () => Number(await progress.getAttribute("value")))
    .toBe(expectedProgress);
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw)[0]?.progress : null;
      }, progressStorageKey)
    )
    .toBe(expectedProgress);
});

test("reading-size choices remain accessible without 320px overflow", async ({
  page
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));
  await page.setViewportSize({ height: 844, width: 320 });
  await page.goto(guidePath);

  const sizeControl = page.getByRole("group", { name: "Reading text size" });
  for (const name of ["Default", "Larger"]) {
    const box = await sizeControl
      .getByRole("button", { name })
      .boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  }

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);

  const accessibility = await new AxeBuilder({ page })
    .include('[aria-label="Reading text size"]')
    .analyze();
  expect(
    accessibility.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? "")
    )
  ).toEqual([]);
});
