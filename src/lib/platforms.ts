import type { FeedEntry, Labels } from "../types";

export type Platform = "mastodon" | "pixelfed" | "peertube";

export const platforms: readonly Platform[] = [
  "mastodon",
  "pixelfed",
  "peertube",
];

/** Props that only Mastodon feeds support; they are ignored (with a warning) elsewhere. */
export const mastodonOnlyOptions = ["tag", "replies", "onlyWithMedia"] as const;

/** Guesses the platform from a feed address; anything unknown is Mastodon. */
export function detectPlatform(url: string): Platform {
  let pathname: string;
  try {
    ({ pathname } = new URL(url));
  } catch {
    return "mastodon";
  }
  if (/^\/users\/[^/]+\.atom$/.test(pathname)) return "pixelfed";
  if (/^\/feeds\/videos\.(xml|atom)$/.test(pathname)) return "peertube";
  return "mastodon";
}

// Pixelfed repeats the attachments as <img> tags at the top of the content.
const PIXELFED_GALLERY = /^\s*<div class="media-gallery">[\s\S]*?<\/div>\s*/;
const HASHTAG_LINK =
  /<a\b[^>]*\bclass="[^"]*\bhashtag\b[^"]*"[^>]*>#([^<]+)<\/a>/g;

/** Applies the platform's quirks to a parsed post. */
export function normalizeEntry(
  entry: FeedEntry,
  platform: Platform,
): FeedEntry {
  if (platform === "pixelfed") {
    // The title repeats the caption, and hashtags only exist as links.
    const pixelfed: FeedEntry = {
      ...entry,
      content: entry.content.replace(PIXELFED_GALLERY, ""),
      tags: [...entry.content.matchAll(HASHTAG_LINK)].map((m) => m[1].trim()),
    };
    delete pixelfed.title;
    return pixelfed;
  }
  if (platform === "peertube") {
    // RSS categories are PeerTube's fixed video categories, not hashtags.
    return { ...entry, tags: [] };
  }
  return entry;
}

const tagPaths: Record<Platform, (tag: string) => string> = {
  mastodon: (tag) => `/tags/${encodeURIComponent(tag)}`,
  pixelfed: (tag) => `/discover/tags/${encodeURIComponent(tag)}`,
  peertube: (tag) => `/search?tagsOneOf=${encodeURIComponent(tag)}`,
};

/** The instance page for a hashtag, resolved against any URL on that instance. */
export function tagUrl(
  platform: Platform,
  tag: string,
  base: string,
): string | undefined {
  try {
    return new URL(tagPaths[platform](tag), base).href;
  } catch {
    return undefined;
  }
}

export const viewLabels: Record<Platform, keyof Labels> = {
  mastodon: "viewOnMastodon",
  pixelfed: "viewOnPixelfed",
  peertube: "viewOnPeerTube",
};
