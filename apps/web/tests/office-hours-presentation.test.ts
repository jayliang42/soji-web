import { describe, expect, it } from "vitest";
import type { OfficeHourSession } from "@soji/types";
import { buildOfficeHourPresentation } from "@/lib/office-hours-presentation";

const signupTarget = "https://cal.com/soji/PRIVATE-SIGNUP-TARGET";
const replayTarget = "https://vimeo.com/PRIVATE-REPLAY-TARGET";
const now = new Date("2026-07-27T18:00:00.000Z");

function session(
  overrides: Partial<OfficeHourSession> = {}
): OfficeHourSession {
  return {
    id: "office-hour-1",
    replayUrl: replayTarget,
    requiredEntitlements: ["office_hours.join"],
    signupUrl: signupTarget,
    startsAt: "2026-07-30T18:00:00.000Z",
    title: "Family decision office hour",
    ...overrides
  };
}

describe("Office Hours presentation projection", () => {
  it("keeps the signup target out of guest and wrong-entitlement results", () => {
    const guest = buildOfficeHourPresentation(
      session(),
      { entitlements: [], isAuthenticated: false },
      now
    );
    const wrongTier = buildOfficeHourPresentation(
      session(),
      { entitlements: ["content.basic"], isAuthenticated: true },
      now
    );

    expect(guest.lifecycle).toBe("upcoming");
    expect(guest.primaryAction).toEqual({
      href: undefined,
      label: "Compare membership"
    });
    expect(wrongTier.primaryAction?.href).toBeUndefined();
    expect(JSON.stringify([guest, wrongTier])).not.toContain(signupTarget);
  });

  it("reveals only the lifecycle-appropriate target to an entitled member", () => {
    const upcoming = buildOfficeHourPresentation(
      session(),
      {
        entitlements: ["office_hours.join"],
        isAuthenticated: true
      },
      now
    );
    const replay = buildOfficeHourPresentation(
      session({ startsAt: "2026-07-20T18:00:00.000Z" }),
      {
        entitlements: ["office_hours.join"],
        isAuthenticated: true
      },
      now
    );

    expect(upcoming.primaryAction).toEqual({
      href: signupTarget,
      label: "Reserve a seat"
    });
    expect(JSON.stringify(upcoming)).not.toContain(replayTarget);
    expect(replay.lifecycle).toBe("replay_ready");
    expect(replay.primaryAction).toEqual({
      href: replayTarget,
      label: "Watch replay"
    });
    expect(JSON.stringify(replay)).not.toContain(signupTarget);
  });

  it("fails closed when access verification or a stored target is invalid", () => {
    const accessFailure = buildOfficeHourPresentation(
      session(),
      {
        entitlements: ["office_hours.join"],
        isAuthenticated: true,
        verificationUnavailable: true
      },
      now
    );
    const invalidTarget = buildOfficeHourPresentation(
      session({ signupUrl: "http://127.0.0.1/PRIVATE-SIGNUP-TARGET" }),
      {
        entitlements: ["office_hours.join"],
        isAuthenticated: true
      },
      now
    );

    expect(accessFailure.lifecycle).toBe("unavailable");
    expect(accessFailure.primaryAction).toBeUndefined();
    expect(invalidTarget.lifecycle).toBe("unavailable");
    expect(invalidTarget.primaryAction).toBeUndefined();
    expect(JSON.stringify([accessFailure, invalidTarget])).not.toContain(
      "PRIVATE-SIGNUP-TARGET"
    );
  });

  it("distinguishes a pending replay and includes a readable timezone", () => {
    const presentation = buildOfficeHourPresentation(
      session({
        replayUrl: undefined,
        startsAt: "2026-07-20T18:00:00.000Z"
      }),
      {
        entitlements: ["office_hours.join"],
        isAuthenticated: true
      },
      now
    );

    expect(presentation.lifecycle).toBe("replay_pending");
    expect(presentation.primaryAction).toEqual({
      href: undefined,
      label: "Replay coming soon"
    });
    expect(presentation.startsAtLabel).toMatch(/CT$/u);
  });
});
