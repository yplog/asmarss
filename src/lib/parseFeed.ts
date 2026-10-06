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

/** Only http(s) URLs are allowed; anything else (e.g. `javascript:`) becomes "". */
function safeUrl(value: unknown): string {
  const raw = text(value).trim();
  try {
    const { protocol } = new URL(raw);
    return protocol === "http:" || protocol === "https:" ? raw : "";
  } catch {
    return "";
  }
}

function parseMedia(raw: Raw): FeedMedia | null {
  const url = safeUrl(raw["@_url"]);
  if (!url) return null;

  const type = text(raw["@_type"]);
  const mimeMedium = type.split("/")[0];
  // The MIME type wins for video/audio: gifv is published as medium="image"
  // with type="video/mp4".
  const medium =
    mimeMedium === "video" || mimeMedium === "audio"
      ? mimeMedium
      : text(raw["@_medium"]) || mimeMedium;
  const thumbnail = safeUrl(
    (([] as Raw[]).concat((raw["media:thumbnail"] as Raw) ?? [])[0] ?? {})[
      "@_url"
    ],
  );

  return {
    url,
    type,
    medium,
    description: text(raw["media:description"]),
    sensitive: text(raw["media:rating"]) === "adult",
    ...(thumbnail && { thumbnail }),
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
    link: safeUrl(item.link),
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

    return { items, link: safeUrl(channel.link) || null };
  } catch {
    return { items: null, link: null };
  }
}
