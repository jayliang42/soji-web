import { expect, test } from "@playwright/test";

const storageKey = "soji:reading-progress:v1";
const guideSlug = "wealth-without-drift";
const guidePath = "/library/wealth-without-drift";

async function expectNoHorizontalOverflow(
  page: import("@playwright/test").Page
) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

test("guide progress persists locally and resumes an incomplete position only after an explicit action", async ({
  page
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ height: 720, width: 1280 });
  await page.goto(guidePath);

  const progress = page.getByRole("progressbar", {
    name: "Reading progress for Wealth Without Drift: A 90-Minute Decision Reset"
  });
  await expect(progress).toHaveAttribute("value", "0");

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
    const next =
      end === start ? start + 1 : start + (end - start) * 0.45;
    window.scrollTo(0, next);
    return end === start ? 100 : 45;
  });

  await expect
    .poll(async () => Number(await progress.getAttribute("value")))
    .toBe(expectedProgress);
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw)[0]?.progress : null;
      }, storageKey)
    )
    .toBe(expectedProgress);

  await expect(
    page.getByRole("button", { name: `Resume at ${expectedProgress}%` })
  ).toHaveCount(0);
  await page.goto("/library");
  await page.evaluate(
    ({ key, slug }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify([
          {
            offset: 180,
            progress: 42,
            slug,
            updatedAt: "2026-07-30T18:00:00.000Z"
          }
        ])
      );
    },
    { key: storageKey, slug: guideSlug }
  );
  await page.goto(guidePath);
  await expect(progress).toHaveAttribute("value", "0");

  const resume = page.getByRole("button", {
    name: "Resume at 42%"
  });
  await expect(resume).toBeVisible();
  await resume.focus();
  await expect(resume).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText(
      "Resumed Wealth Without Drift: A 90-Minute Decision Reset at 42% read."
    )
  ).toBeAttached();
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);
  await expect(resume).toHaveCount(0);
});

test("reading progress remains usable without overflow at the narrow boundary", async ({
  page
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));
  await page.setViewportSize({ height: 844, width: 320 });
  await page.addInitScript(
    ({ key, slug }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify([
          {
            offset: 180,
            progress: 42,
            slug,
            updatedAt: "2026-07-30T18:00:00.000Z"
          }
        ])
      );
    },
    { key: storageKey, slug: guideSlug }
  );
  await page.goto(guidePath);

  const resume = page.getByRole("button", { name: "Resume at 42%" });
  const box = await resume.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  await expectNoHorizontalOverflow(page);
  await resume.tap();
  await expect(resume).toHaveCount(0);
});
