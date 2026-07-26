import { brandTheme } from "@soji/ui";
import { describe, expect, it } from "vitest";

function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => Number.parseInt(channel, 16) / 255);

  if (!channels || channels.length !== 3) {
    throw new Error(`Expected a six-digit hex color, received ${hex}`);
  }

  const linear = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );

  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

function contrastRatio(foreground: string, background: string) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));

  return (lighter + 0.05) / (darker + 0.05);
}

describe("shared brand theme", () => {
  it.each([
    ["foreground on background", brandTheme.colors.foreground, brandTheme.colors.background],
    ["foreground on surface", brandTheme.colors.foreground, brandTheme.colors.surface],
    ["muted text on surface", brandTheme.colors.textMuted, brandTheme.colors.surface],
    ["accent on surface", brandTheme.colors.accent, brandTheme.colors.surface],
    ["success on muted success", brandTheme.colors.success, brandTheme.colors.successMuted]
  ])("keeps %s at WCAG AA body-text contrast", (_label, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps framed controls and cards within the eight-pixel radius contract", () => {
    expect(brandTheme.radii.sm).toBeLessThanOrEqual(8);
    expect(brandTheme.radii.md).toBeLessThanOrEqual(8);
    expect(brandTheme.radii.lg).toBeLessThanOrEqual(8);
  });
});
