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

export type ParseFeedOptions = {
  /** Abort the request after this many milliseconds. Defaults to 10 000. */
  timeoutMs?: number;
  /** Keep a successfully parsed feed in memory for this long. Defaults to 0 (no cache). */
  cacheTtlMs?: number;
  /** Retries on network errors, 5xx and 429. Defaults to 0. */
  retries?: number;
  /** Base delay between retries; grows linearly. Defaults to 300. */
  retryDelayMs?: number;
  /** Called with the failure instead of the default `console.warn`. */
  onError?: (error: unknown, url: string) => void;
};

type CacheEntry = {
  feed: ParsedFeed;
  expires: number;
  etag?: string;
  lastModified?: string;
};

const cache = new Map<string, CacheEntry>();

/** Empties the in-memory feed cache. */
export function clearFeedCache(): void {
  cache.clear();
}

class HttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

const isRetryable = (error: unknown) =>
  !(error instanceof HttpError) || error.status >= 500 || error.status === 429;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function request(
  url: string,
  timeoutMs: number,
  headers: Record<string, string>,
): Promise<Response> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    ...(Object.keys(headers).length > 0 && { headers }),
  });
  if (!res.ok && res.status !== 304) throw new HttpError(res.status);
  return res;
}

function parseXml(xml: string): ParsedFeed {
  const channel = parser.parse(xml)?.rss?.channel;
  if (!channel) throw new Error("Invalid RSS feed");

  const items = ((channel.item as Raw[] | undefined) ?? []).map(parseItem);
  return { items, link: safeUrl(channel.link) || null };
}

export async function parseFeed(
  url: string,
  {
    timeoutMs = 10_000,
    cacheTtlMs = 0,
    retries = 0,
    retryDelayMs = 300,
    onError,
  }: ParseFeedOptions = {},
): Promise<ParsedFeed> {
  const cached = cache.get(url);
  if (cacheTtlMs > 0 && cached && cached.expires > Date.now()) {
    return cached.feed;
  }

  const headers: Record<string, string> = {};
  if (cacheTtlMs > 0 && cached?.etag) headers["If-None-Match"] = cached.etag;
  if (cacheTtlMs > 0 && cached?.lastModified) {
    headers["If-Modified-Since"] = cached.lastModified;
  }

  try {
    let res: Response | undefined;
    for (let attempt = 0; !res; attempt++) {
      try {
        res = await request(url, timeoutMs, headers);
      } catch (error) {
        if (attempt >= retries || !isRetryable(error)) throw error;
        await sleep(retryDelayMs * (attempt + 1));
      }
    }

    if (res.status === 304 && cached) {
      cached.expires = Date.now() + cacheTtlMs;
      return cached.feed;
    }

    const feed = parseXml(await res.text());
    if (cacheTtlMs > 0) {
      cache.set(url, {
        feed,
        expires: Date.now() + cacheTtlMs,
        etag: res.headers.get("etag") ?? undefined,
        lastModified: res.headers.get("last-modified") ?? undefined,
      });
    }
    return feed;
  } catch (error) {
    if (onError) onError(error, url);
    else console.warn(`[asmarss] Failed to load ${url}:`, error);
    // Serve the stale copy rather than an error when we have one.
    return cacheTtlMs > 0 && cached ? cached.feed : { items: null, link: null };
  }
}
