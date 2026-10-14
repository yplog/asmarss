import type { MergedFeed, ParsedFeed } from "../types";
import { reportError, type ErrorHandler } from "./report";
import { parseXml } from "./xml";

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
  onError?: ErrorHandler;
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

const emptyFeed = (): ParsedFeed => ({
  items: null,
  link: null,
  title: null,
  description: null,
  image: null,
});

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
