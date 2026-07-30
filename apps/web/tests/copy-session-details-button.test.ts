import { describe, expect, it, vi } from "vitest";
import { writeSessionDetails } from "@/components/copy-session-details-button";

describe("copy session details", () => {
  it("writes the exact public session summary", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    await expect(
      writeSessionDetails(
        "Family decision office hour\nJul 30, 2026, 1:00 PM CT",
        { writeText }
      )
    ).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith(
      "Family decision office hour\nJul 30, 2026, 1:00 PM CT"
    );
  });

  it("reports an unavailable clipboard without throwing", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("not allowed"));

    await expect(writeSessionDetails("Session details", undefined)).resolves.toBe(
      false
    );
    await expect(
      writeSessionDetails("Session details", { writeText })
    ).resolves.toBe(false);
  });
});
