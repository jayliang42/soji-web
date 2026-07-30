import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "@/app/page";

describe("home page decision paths", () => {
  it("offers four distinct ways to start without requiring an account", () => {
    const html = renderToStaticMarkup(<HomePage />);

    for (const [label, href] of [
      ["Explore the library", "/library?focus=start"],
      ["Browse practical tools", "/products"],
      ["Find your membership", "/pricing#plan-finder-heading"],
      ["See office hours", "/office-hours"]
    ]) {
      expect(html).toContain(`href="${href}"`);
      expect(html).toContain(label);
    }
    expect(html).toContain("Free previews");
    expect(html).toContain("From $49 once");
    expect(html).toContain("From $29 monthly");
    expect(html).not.toContain("Create account to join");
  });

  it("summarizes every tier and sends comparison to the pricing page", () => {
    const html = renderToStaticMarkup(<HomePage />);

    expect(html).toContain("Membership at a glance");
    expect(html).toContain('href="/pricing#plan-finder-heading"');
    expect(html).toContain('href="/pricing#membership-options"');
    for (const planId of ["tier_1", "tier_2", "tier_3"]) {
      expect(html).toContain(`href="/pricing#plan-${planId}"`);
    }
    expect(html).not.toContain("Digital product purchase terms");
    expect(html).not.toContain("Membership purchase terms");
  });
});
