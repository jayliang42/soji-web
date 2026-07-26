import { describe, expect, it } from "vitest";
import { resolveDataSnapshot } from "@/lib/data-source";

describe("runtime data source policy", () => {
  const demoItems = [{ id: "demo" }];

  it("keeps live results when rows are present", () => {
    const liveSnapshot = {
      items: [{ id: "live" }],
      source: "supabase" as const
    };

    expect(
      resolveDataSnapshot({
        demoEnabled: true,
        demoItems,
        liveSnapshot,
        missingConfigurationError: "not_configured"
      })
    ).toBe(liveSnapshot);
  });

  it("keeps an empty live catalog instead of inventing demo rows", () => {
    expect(
      resolveDataSnapshot({
        demoEnabled: true,
        demoItems,
        liveSnapshot: { items: [], source: "supabase" },
        missingConfigurationError: "not_configured"
      })
    ).toEqual({ items: [], source: "supabase" });
  });

  it("preserves a live query failure and fails closed", () => {
    expect(
      resolveDataSnapshot({
        demoEnabled: true,
        demoItems,
        liveSnapshot: {
          error: "database_unavailable",
          items: [],
          source: "supabase"
        },
        missingConfigurationError: "not_configured"
      })
    ).toEqual({
      error: "database_unavailable",
      items: [],
      source: "supabase"
    });
  });

  it("uses demo rows only when no live source exists and demo is enabled", () => {
    expect(
      resolveDataSnapshot({
        demoEnabled: true,
        demoItems,
        liveSnapshot: null,
        missingConfigurationError: "not_configured"
      })
    ).toEqual({ items: demoItems, source: "demo" });
  });

  it("returns an unavailable snapshot when production has no live source", () => {
    expect(
      resolveDataSnapshot({
        demoEnabled: false,
        demoItems,
        liveSnapshot: null,
        missingConfigurationError: "not_configured"
      })
    ).toEqual({
      error: "not_configured",
      items: [],
      source: "supabase"
    });
  });
});
