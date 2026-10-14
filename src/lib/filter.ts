import type { FeedEntry } from "../types";

export type FilterOptions = {
  /** Keep only posts that have attachments. */
  onlyWithMedia?: boolean;
  /** Keep only posts with this hashtag (case-insensitive, `#` optional). */
  tag?: string;
};

export const normalizeTag = (tag: string) => tag.trim().replace(/^#/, "");

/** Whether a single post passes the filters. */
export function matchesFilter(
  item: FeedEntry,
  { onlyWithMedia, tag }: FilterOptions = {},
): boolean {
  const wanted = tag ? normalizeTag(tag).toLowerCase() : "";
  return (
    (!onlyWithMedia || item.media.length > 0) &&
    (!wanted || item.tags.some((t) => t.toLowerCase() === wanted))
  );
}

export function filterItems(
  items: FeedEntry[],
  options: FilterOptions = {},
): FeedEntry[] {
  return items.filter((item) => matchesFilter(item, options));
}
