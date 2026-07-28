import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pageMocks = vi.hoisted(() => ({
  getOfficeHourSnapshot: vi.fn(),
  getSessionSnapshot: vi.fn()
}));

vi.mock("@/lib/office-hours", () => ({
  getOfficeHourSnapshot: pageMocks.getOfficeHourSnapshot
}));
vi.mock("@/lib/session", () => ({
  getSessionSnapshot: pageMocks.getSessionSnapshot
}));

import OfficeHoursPage from "@/app/office-hours/page";

const signupTarget = "https://cal.com/soji/PRIVATE-SIGNUP-TARGET";
const replayTarget = "https://vimeo.com/PRIVATE-REPLAY-TARGET";

describe("Office Hours page", () => {
  beforeEach(() => {
    pageMocks.getSessionSnapshot.mockResolvedValue({
      entitlements: ["office_hours.join"],
      source: "supabase",
      user: { id: "member-1" }
    });
    pageMocks.getOfficeHourSnapshot.mockResolvedValue({
      items: [
        {
          id: "upcoming",
          requiredEntitlements: ["office_hours.join"],
          signupUrl: signupTarget,
          startsAt: "2099-07-30T18:00:00.000Z",
          title: "Upcoming family decisions"
        },
        {
          id: "replay",
          replayUrl: replayTarget,
          requiredEntitlements: ["office_hours.join"],
          signupUrl: signupTarget,
          startsAt: "2020-07-20T18:00:00.000Z",
          title: "Recorded family decisions"
        },
        {
          id: "pending",
          requiredEntitlements: ["office_hours.join"],
          signupUrl: signupTarget,
          startsAt: "2020-07-21T18:00:00.000Z",
          title: "Replay being prepared"
        }
      ],
      source: "supabase"
    });
  });

  it("groups upcoming sessions and replays with safe external actions", async () => {
    const html = renderToStaticMarkup(await OfficeHoursPage());

    expect(html).toContain("Upcoming");
    expect(html).toContain("Replay library");
    expect(html).toContain("Reserve a seat");
    expect(html).toContain("Watch replay");
    expect(html).toContain("Replay coming soon");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer noopener"');
    expect(html).toContain("Opens in a new tab");
  });

  it("renders no private targets when the signed-in user lacks access", async () => {
    pageMocks.getSessionSnapshot.mockResolvedValue({
      entitlements: ["content.basic"],
      source: "supabase",
      user: { id: "member-2" }
    });

    const html = renderToStaticMarkup(await OfficeHoursPage());

    expect(html).toContain("Included with Guided membership");
    expect(html).toContain("Compare membership");
    expect(html).not.toContain(signupTarget);
    expect(html).not.toContain(replayTarget);
  });
});
