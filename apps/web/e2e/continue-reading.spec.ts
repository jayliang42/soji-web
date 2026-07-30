import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const storageKey = "soji:reading-progress:v1";
const guideSlug = "wealth-without-drift";
const guideTitle =
  "Wealth Without Drift: A 90-Minute Decision Reset";

test("homepage resumes the newest current incomplete guide from one explicit action", async ({
  page
}) => {
  await page.addInitScript(
    ({ key, slug }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify([
          {
            offset: 180,
            progress: 42,
            slug,
            updatedAt: "2026-07-30T19:00:00.000Z"
          }
        ])
      );
    },
    { key: storageKey, slug: guideSlug }
  );
  await page.goto("/");

  const continueSection = page.getByTestId("home-continue-reading");
  await expect(continueSection).toBeVisible();
  await expect(
    continueSection.getByRole("heading", { level: 2, name: guideTitle })
  ).toBeVisible();
  await expect(continueSection.getByText("42% complete")).toBeVisible();
  await expect(continueSection.getByText("Article · This device")).toBeVisible();
  await expect(
    continueSection.getByRole("progressbar", {
      name: `Reading progress for ${guideTitle}`
    })
  ).toHaveAttribute("value", "42");
  const accessibility = await new AxeBuilder({ page })
    .include('[data-testid="home-continue-reading"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    accessibility.violations.filter(
      (violation) =>
        violation.impact === "critical" || violation.impact === "serious"
    )
  ).toEqual([]);

  const resume = continueSection.getByRole("link", {
    name: "Resume guide"
  });
  await expect(resume).toHaveAttribute(
    "href",
    `/library/${guideSlug}?resume=1`
  );
  await resume.click();

  await expect(page).toHaveURL(`/library/${guideSlug}`);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);
  await expect(
    page.getByRole("button", { name: "Resume at 42%" })
  ).toHaveCount(0);
});

test("homepage stays quiet for completed or unknown reading history", async ({
  page
}) => {
  await page.addInitScript(
    ({ key }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify([
          {
            offset: 420,
            progress: 100,
            slug: "wealth-without-drift",
            updatedAt: "2026-07-30T19:00:00.000Z"
          },
          {
            offset: 180,
            progress: 42,
            slug: "no-longer-published",
            updatedAt: "2026-07-30T18:00:00.000Z"
          }
        ])
      );
    },
    { key: storageKey }
  );
  await page.goto("/");

  await expect(page.getByTestId("home-continue-reading")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { level: 1, name: "Well Endowed" })
  ).toBeVisible();
});

test("Continue reading remains a full-size action without 320px overflow", async ({
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
            updatedAt: "2026-07-30T19:00:00.000Z"
          }
        ])
      );
    },
    { key: storageKey, slug: guideSlug }
  );
  await page.goto("/");

  const action = page.getByRole("link", { name: "Resume guide" });
  const box = await action.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
});
