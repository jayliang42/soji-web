import type { ProductOffer } from "@soji/types";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  filterAndSortProductEntries,
  ProductCatalog,
  type ProductCatalogEntry
} from "@/components/product-catalog";
import { getProductFocus } from "@/lib/product-presentation";

const dashboard: ProductOffer = {
  bullets: [
    "Track net worth and cash runway",
    "Use a monthly and quarterly review checklist"
  ],
  entitlement: "product.digital",
  id: "dashboard",
  price: 79,
  priceLabel: "$79",
  slug: "wealth-dashboard",
  summary: "A workbook for tracking debt, insurance, and monthly decisions.",
  title: "Wealth Dashboard"
};

const scripts: ProductOffer = {
  bullets: [
    "Scripts for partner conversations",
    "Prompts for kids and allowance decisions"
  ],
  entitlement: "product.digital",
  id: "scripts",
  price: 49,
  priceLabel: "$49",
  slug: "family-money-scripts",
  summary: "Conversation prompts for delicate family money decisions.",
  title: "Family Money Scripts"
};

const entries: ProductCatalogEntry[] = [dashboard, scripts].map((product) => ({
  accessPaused: false,
  alreadyPurchased: false,
  product
}));

describe("product catalog", () => {
  it("classifies known product outcomes by their strongest use", () => {
    expect(getProductFocus(dashboard)).toBe("track");
    expect(getProductFocus(scripts)).toBe("talk");
  });

  it("combines focus, search, and price sorting without mutating featured order", () => {
    expect(
      filterAndSortProductEntries(entries, {
        focus: "talk",
        query: "allowance",
        sort: "featured"
      }).map(({ product }) => product.id)
    ).toEqual(["scripts"]);
    expect(
      filterAndSortProductEntries(entries, {
        focus: "all",
        query: "",
        sort: "price-asc"
      }).map(({ product }) => product.id)
    ).toEqual(["scripts", "dashboard"]);
    expect(entries.map(({ product }) => product.id)).toEqual([
      "dashboard",
      "scripts"
    ]);
  });

  it("renders an accessible default browsing state and product details", () => {
    const html = renderToStaticMarkup(
      <ProductCatalog
        checkoutEnabled={false}
        customerEmail={null}
        entries={entries}
        purchaseStateAvailable
      />
    );

    expect(html).toContain('aria-label="Filter products by use"');
    expect(html).toContain('aria-label="One-time digital tools"');
    expect(html).toContain('aria-pressed="true"');
    expect(html.match(/aria-pressed="false"/gu)).toHaveLength(2);
    expect(html).toContain("2 tools match the shop");
    expect(html).toContain("Digital download");
    expect(html).toContain("No subscription");
    expect(html).toContain('href="/products/wealth-dashboard"');
    expect(html).toContain('href="/products/family-money-scripts"');
  });
});
