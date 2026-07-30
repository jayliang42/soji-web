import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DataEmpty, DataUnavailable } from "@/components/data-state";

describe("collection data states", () => {
  it("turns a collection outage into one complete recovery panel", () => {
    const html = renderToStaticMarkup(
      <DataUnavailable
        alternativeHref="/library"
        alternativeLabel="Read a public guide"
        description="Purchasing is unavailable until the catalog connection recovers."
        note="Checkout stays paused; no purchase is started."
        retryHref="/products"
        title="Products could not be loaded"
        variant="panel"
      />
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("Connection paused");
    expect(html).toContain(">Products could not be loaded</h2>");
    expect(html).toContain('href="/products"');
    expect(html).toContain(">Try loading again</a>");
    expect(html).toContain('href="/library"');
    expect(html).toContain(">Read a public guide</a>");
    expect(html).toContain("Checkout stays paused; no purchase is started.");
    expect(html).toContain("Ready to reconnect");
    expect(html).toContain("min-h-11");
  });

  it("gives a true empty collection a useful next step without an error role", () => {
    const html = renderToStaticMarkup(
      <DataEmpty
        actionHref="/pricing"
        actionLabel="Compare membership"
        description="Standalone tools will appear here when they are ready."
        title="No products are available"
        variant="panel"
      />
    );

    expect(html).toContain("A quiet beginning");
    expect(html).toContain(">No products are available</h2>");
    expect(html).toContain('href="/pricing"');
    expect(html).toContain(">Compare membership</a>");
    expect(html).toContain("Ready for the first entry");
    expect(html).not.toContain('role="alert"');
  });

  it("can reload the current collection without a route-specific retry URL", () => {
    const html = renderToStaticMarkup(
      <DataUnavailable
        description="The collection connection is paused."
        title="The library could not be loaded"
        variant="panel"
      />
    );

    expect(html).toContain('<form method="get">');
    expect(html).toContain('type="submit"');
    expect(html).toContain(">Try loading again</button>");
  });
});
