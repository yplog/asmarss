import type { FeedEntry } from "../types";

export type FilterOptions = {
  /** Keep only posts that have attachments. */
  onlyWithMedia?: boolean;
  /** Keep only posts with this hashtag (case-insensitive, `#` optional). */
  tag?: string;
};

export const normalizeTag = (tag: string) => tag.trim().replace(/^#/, "");

export function filterItems(
  items: FeedEntry[],
  { onlyWithMedia, tag }: FilterOptions = {},
): FeedEntry[] {
  const wanted = tag ? normalizeTag(tag).toLowerCase() : "";
  return items.filter(
    (item) =>
      (!onlyWithMedia || item.media.length > 0) &&
      (!wanted || item.tags.some((t) => t.toLowerCase() === wanted)),
  );
}
