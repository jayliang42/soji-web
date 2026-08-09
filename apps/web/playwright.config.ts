import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";
const recoveryBaseURL = "http://127.0.0.1:3200";
const reuseExternalServer = process.env.PLAYWRIGHT_REUSE_SERVER === "true";
const isCI = process.env.CI === "true";

export default defineConfig({
  fullyParallel: !isCI,
  reporter: isCI
    ? [["line"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : "line",
  testDir: "./e2e",
  workers: isCI ? 1 : 2,
  use: {
    baseURL,
    screenshot: "only-on-failure",
    timezoneId: "America/Chicago",
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "desktop-chrome",
      use: {
        ...(isCI ? {} : { channel: "chrome" }),
        viewport: { height: 900, width: 1440 }
      },
      grepInvert: /catalog recovery/iu
    },
    {
      name: "mobile-chrome",
      use: {
        ...(isCI ? {} : { channel: "chrome" }),
        hasTouch: true,
        isMobile: true,
        viewport: { height: 844, width: 390 }
      },
      grepInvert: /catalog recovery/iu
    },
    {
      name: "desktop-recovery-chrome",
      grep: /catalog recovery/iu,
      use: {
        ...(isCI ? {} : { channel: "chrome" }),
        baseURL: recoveryBaseURL,
        viewport: { height: 900, width: 1440 }
      }
    },
    {
      name: "mobile-recovery-chrome",
      grep: /catalog recovery/iu,
      use: {
        ...(isCI ? {} : { channel: "chrome" }),
        baseURL: recoveryBaseURL,
        hasTouch: true,
        isMobile: true,
        viewport: { height: 844, width: 390 }
      }
    }
  ],
  webServer: reuseExternalServer
    ? undefined
    : [
        {
          command: "corepack pnpm dev --port 3100",
          env: {
            NEXT_DIST_DIR: ".next-e2e",
            NEXT_PUBLIC_SITE_URL: baseURL,
            NEXT_PUBLIC_SUPPORT_URL:
              process.env.NEXT_PUBLIC_SUPPORT_URL ?? "mailto:help@soji.test",
            NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
            NEXT_PUBLIC_SUPABASE_URL: "",
            SOJI_DEMO_MODE: "true",
            STRIPE_SECRET_KEY: "",
            SUPABASE_SERVICE_ROLE_KEY: ""
          },
          reuseExistingServer: false,
          timeout: 120_000,
          url: baseURL
        },
        {
          command: "corepack pnpm dev --port 3200",
          env: {
            NEXT_DIST_DIR: ".next-e2e-recovery",
            NEXT_PUBLIC_SITE_URL: recoveryBaseURL,
            NEXT_PUBLIC_SUPPORT_URL:
              process.env.NEXT_PUBLIC_SUPPORT_URL ?? "mailto:help@soji.test",
            NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
            NEXT_PUBLIC_SUPABASE_URL: "",
            SOJI_DEMO_MODE: "false",
            STRIPE_SECRET_KEY: "",
            SUPABASE_SERVICE_ROLE_KEY: ""
          },
          reuseExistingServer: false,
          timeout: 120_000,
          url: recoveryBaseURL
        }
      ]
});
