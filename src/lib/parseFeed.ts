import { XMLParser } from "fast-xml-parser";
import type { FeedEntry, FeedMedia, MergedFeed, ParsedFeed } from "../types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // Decode numeric character references such as Pixelfed's `&#039;`.
  htmlEntities: true,
  isArray: (name) =>
    name === "item" ||
    name === "entry" ||
    name === "media:content" ||
    name === "media:thumbnail" ||
    name === "category",
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

function firstThumbnail(raw: Raw): string {
  return safeUrl(
    ((raw["media:thumbnail"] as Raw[] | undefined) ?? [])[0]?.["@_url"],
  );
}

/**
 * Atom `<link>`: a single element or a list, with `rel` missing or
 * "alternate" for the HTML page.
 */
function atomLink(value: unknown): string {
  const links = ([] as unknown[]).concat(value ?? []) as Raw[];
  const alternate = links.find((l) => {
    const rel = text(l?.["@_rel"]);
    return !rel || rel === "alternate";
  });
  return safeUrl(alternate?.["@_href"]);
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
  const thumbnail = firstThumbnail(raw);

  return {
    url,
    type,
    medium,
    description: text(raw["media:description"]),
    sensitive: text(raw["media:rating"]) === "adult",
    ...(thumbnail && { thumbnail }),
  };
}

function parseMediaList(item: Raw): FeedMedia[] {
  return ((item["media:content"] as Raw[] | undefined) ?? [])
    .map(parseMedia)
    .filter((m): m is FeedMedia => m !== null);
}

/** Post-level fields shared by RSS items and Atom entries. */
function entry(
  item: Raw,
  fields: Pick<FeedEntry, "link" | "pubDate" | "content" | "tags">,
): FeedEntry {
  const title = text(item.title).trim();
  const thumbnail = firstThumbnail(item);
  const embed = safeUrl((item["media:embed"] as Raw | undefined)?.["@_url"]);
  return {
    ...fields,
    media: parseMediaList(item),
    ...(title && { title }),
    ...(thumbnail && { thumbnail }),
    ...(embed && { embed }),
  };
}

function parseItem(item: Raw): FeedEntry {
  return entry(item, {
    link: safeUrl(item.link),
    pubDate: text(item.pubDate),
    // PeerTube puts a shortened text in `description` and the full HTML here.
    content: text(item["content:encoded"]) || text(item.description),
    tags: ((item.category as unknown[] | undefined) ?? [])
      .map(text)
      .filter(Boolean),
  });
}

function parseEntry(item: Raw): FeedEntry {
  return entry(item, {
    link: atomLink(item.link),
    pubDate: text(item.published) || text(item.updated),
    content: (text(item.content) || text(item.summary)).trim(),
    tags: ((item.category as Raw[] | undefined) ?? [])
      .map((c) => text(c?.["@_term"]))
      .filter(Boolean),
  });
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

/** Hands the failure to `onError`, or logs it when there is none. */
export function reportError(
  error: unknown,
  url: string,
  onError?: ParseFeedOptions["onError"],
): void {
  if (onError) onError(error, url);
  else console.warn(`[astro-fedifeed] Failed to load ${url}:`, error);
}

/** Like `reportError`, for a misconfiguration that doesn't stop the feed from loading. */
export function reportWarning(
  message: string,
  url: string,
  onError?: ParseFeedOptions["onError"],
): void {
  if (onError) onError(new Error(message), url);
  else console.warn(`[astro-fedifeed] ${message}${url ? ` (${url})` : ""}`);
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

const emptyFeed = (): ParsedFeed => ({
  items: null,
  link: null,
  title: null,
  description: null,
  image: null,
});

function parseXml(xml: string): ParsedFeed {
  const doc = parser.parse(xml);

  const channel = doc?.rss?.channel;
  if (channel) {
    return {
      items: ((channel.item as Raw[] | undefined) ?? []).map(parseItem),
      link: safeUrl(channel.link) || null,
      title: text(channel.title) || null,
      description: text(channel.description) || null,
      image: safeUrl(channel.image?.url) || null,
    };
  }

  const feed = doc?.feed;
  if (feed && typeof feed === "object") {
    return {
      items: ((feed.entry as Raw[] | undefined) ?? []).map(parseEntry),
      link: atomLink(feed.link) || null,
      title: text(feed.title) || null,
      description: text(feed.subtitle) || null,
      // PeerTube's `icon` is the instance logo; `logo` is the avatar.
      image: safeUrl(feed.logo) || safeUrl(feed.icon) || null,
    };
  }

  throw new Error("Invalid RSS or Atom feed");
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
    reportError(error, url, onError);
    // Serve the stale copy rather than an error when we have one.
    return cacheTtlMs > 0 && cached ? cached.feed : emptyFeed();
  }
}

const time = (date: string) => Date.parse(date) || -Infinity;

/**
 * Fetches several feeds and merges their posts, newest first. Each post gets a
 * `source`. `items` is `null` only when every feed failed.
 */
export async function parseFeeds(
  urls: string[],
  options: ParseFeedOptions = {},
): Promise<MergedFeed> {
  const feeds = await Promise.all(
    urls.map(async (url) => ({ url, ...(await parseFeed(url, options)) })),
  );

  const loaded = feeds.filter((feed) => feed.items !== null);
  if (loaded.length === 0) return { items: null, feeds };

  const items = loaded
    .flatMap(({ url, link, title, image, items }) => {
      const source = { url, link, title, image };
      return (items ?? []).map((item) => ({ ...item, source }));
    })
    .sort((a, b) => time(b.pubDate) - time(a.pubDate));

  return { items, feeds };
}
