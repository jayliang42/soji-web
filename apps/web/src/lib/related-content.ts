import type { ContentItem } from "@soji/types";

const internalTags = new Set(["demo", "supporting"]);

function getPublicTags(item: ContentItem) {
  return new Set(
    item.tags
      .map((tag) => tag.trim().toLocaleLowerCase())
      .filter((tag) => tag.length > 0 && !internalTags.has(tag))
  );
}

function getPublishedTime(item: ContentItem) {
  const publishedTime = Date.parse(item.publishedAt);
  return Number.isNaN(publishedTime) ? 0 : publishedTime;
}

export function getRelatedContentItems(
  currentItem: ContentItem,
  items: readonly ContentItem[],
  limit = 3
) {
  if (limit <= 0) {
    return [];
  }

  const currentTags = getPublicTags(currentItem);

  return items
    .filter((item) => item.id !== currentItem.id)
    .map((item) => {
      const sharedTagCount = [...getPublicTags(item)].filter((tag) =>
        currentTags.has(tag)
      ).length;

      return {
        item,
        score:
          sharedTagCount * 100 + (item.type === currentItem.type ? 10 : 0)
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        getPublishedTime(right.item) - getPublishedTime(left.item) ||
        left.item.slug.localeCompare(right.item.slug)
    )
    .slice(0, Math.floor(limit))
    .map(({ item }) => item);
}
