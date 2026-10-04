import { XMLParser } from "fast-xml-parser";
import type { FeedEntry, FeedMedia, ParsedFeed } from "../types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) =>
    name === "item" || name === "media:content" || name === "category",
});

type Raw = Record<string, unknown>;

function text(value: unknown): string {
  if (value && typeof value === "object") {
    return text((value as Raw)["#text"]);
  }
  return value == null ? "" : String(value);
}

function parseMedia(raw: Raw): FeedMedia | null {
  const url = text(raw["@_url"]);
  if (!url) return null;

  const type = text(raw["@_type"]);
  return {
    url,
    type,
    medium: text(raw["@_medium"]) || type.split("/")[0],
    description: text(raw["media:description"]),
    sensitive: text(raw["media:rating"]) === "adult",
  };
}

function parseItem(item: Raw): FeedEntry {
  const media = ((item["media:content"] as Raw[] | undefined) ?? [])
    .map(parseMedia)
    .filter((m): m is FeedMedia => m !== null);
  const tags = ((item.category as unknown[] | undefined) ?? [])
    .map(text)
    .filter(Boolean);

  return {
    link: text(item.link),
    pubDate: text(item.pubDate),
    content: text(item.description),
    media,
    tags,
  };
}

export async function parseFeed(
  url: string,
  { timeoutMs = 10_000 }: { timeoutMs?: number } = {},
): Promise<ParsedFeed> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const channel = parser.parse(await res.text())?.rss?.channel;
    if (!channel) throw new Error("Invalid RSS feed");

    const items = ((channel.item as Raw[] | undefined) ?? []).map(parseItem);

    return { items, link: channel.link ? text(channel.link) : null };
  } catch {
    return { items: null, link: null };
  }
}
