import type { ProductOffer } from "@soji/types";

export type ProductFocus = "all" | "talk" | "track";

const focusKeywords: Record<Exclude<ProductFocus, "all">, string[]> = {
  talk: [
    "allowance",
    "boundary",
    "conversation",
    "delicate",
    "family",
    "kids",
    "parents",
    "partner",
    "prompt",
    "script",
    "social spending"
  ],
  track: [
    "cash",
    "dashboard",
    "debt",
    "insurance",
    "monthly",
    "net worth",
    "quarterly",
    "review",
    "track",
    "wealth",
    "workbook"
  ]
};

export function getProductSearchText(product: ProductOffer) {
  return [product.title, product.summary, ...product.bullets]
    .join(" ")
    .toLocaleLowerCase();
}

export function getProductFocus(
  product: ProductOffer
): Exclude<ProductFocus, "all"> | null {
  const source = getProductSearchText(product);
  const scores = Object.entries(focusKeywords).map(([focus, keywords]) => ({
    focus: focus as Exclude<ProductFocus, "all">,
    score: keywords.reduce(
      (total, keyword) => total + (source.includes(keyword) ? 1 : 0),
      0
    )
  }));
  const bestMatch = scores.sort((left, right) => right.score - left.score)[0];

  return bestMatch && bestMatch.score > 0 ? bestMatch.focus : null;
}

export function getProductFocusLabel(product: ProductOffer) {
  const focus = getProductFocus(product);

  if (focus === "track") {
    return "Planning & tracking";
  }

  if (focus === "talk") {
    return "Conversation support";
  }

  return "Practical digital tool";
}
