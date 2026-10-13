import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearFeedCache,
  formatDate,
  parseFeed,
  sanitizeContent,
} from "../src/feed";

const feedXml = readFileSync(
  new URL("./fixtures/feed.xml", import.meta.url),
  "utf-8",
);
const url = "https://example.social/@test.rss";

const quiet = () => vi.spyOn(console, "warn").mockImplementation(() => {});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
  clearFeedCache();
});

describe("asmarss/feed", () => {
  it("parses items, media and tags", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(feedXml)),
    );
    const { items, link } = await parseFeed(url);
    expect(link).toBe("https://example.social/@test");
    expect(items).toHaveLength(5);
    const tagged = items?.find((i) => i.link.endsWith("/3"));
    expect(tagged?.tags).toEqual(["astro", "rss"]);
    expect(tagged?.media[0]).toMatchObject({
      medium: "image",
      description: "A cat on a keyboard",
      sensitive: false,
    });
    // gifv: MIME type wins over medium="image"; javascript: media is dropped
    expect(tagged?.media).toHaveLength(2);
    expect(tagged?.media[1]).toMatchObject({
      medium: "video",
      thumbnail: "https://example.social/media/anim.png",
    });
    expect(items?.find((i) => i.link.endsWith("/4"))?.media[0].sensitive).toBe(
      true,
    );
  });

  it("returns null items on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 })),
    );
    quiet();
    expect(await parseFeed(url)).toEqual({ items: null, link: null });
  });

  it("returns null items for malformed or non-RSS XML", async () => {
    quiet();
    for (const body of ["<rss><channel>", "<html></html>", ""]) {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response(body)),
      );
      expect((await parseFeed(url)).items).toBeNull();
    }
  });

  it("returns null items on timeout", async () => {
    quiet();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_, reject) =>
            init.signal?.addEventListener("abort", () =>
              reject(init.signal?.reason),
            ),
          ),
      ),
    );
    expect((await parseFeed(url, { timeoutMs: 10 })).items).toBeNull();
  });

  it("drops unsafe and relative urls and trims whitespace", async () => {
    const xml = `<rss version="2.0"><channel><link>data:text/html,x</link>
      <item><link>javascript:alert(1)</link></item>
      <item><link>/relative</link></item>
      <item><link>  https://example.social/@t/1  </link></item>
    </channel></rss>`;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(xml)),
    );
    const { items, link } = await parseFeed(url);
    expect(link).toBeNull();
    expect(items?.map((i) => i.link)).toEqual([
      "",
      "",
      "https://example.social/@t/1",
    ]);
  });
});

describe("error reporting", () => {
  it("warns by default", async () => {
    const warn = quiet();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 500 })),
    );
    await parseFeed(url);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(url),
      expect.any(Error),
    );
  });

  it("calls onError instead of warning", async () => {
    const warn = quiet();
    const onError = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 404 })),
    );
    await parseFeed(url, { onError });
    expect(onError).toHaveBeenCalledWith(expect.any(Error), url);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("retries", () => {
  const opts = { retries: 2, retryDelayMs: 1 };

  it("retries 5xx until it succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(new Response("", { status: 429 }))
      .mockResolvedValueOnce(new Response(feedXml));
    vi.stubGlobal("fetch", fetchMock);
    expect((await parseFeed(url, opts)).items).toHaveLength(5);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("retries network errors", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network"))
      .mockResolvedValueOnce(new Response(feedXml));
    vi.stubGlobal("fetch", fetchMock);
    expect((await parseFeed(url, opts)).items).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry 4xx", async () => {
    quiet();
    const fetchMock = vi.fn(async () => new Response("", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    expect((await parseFeed(url, opts)).items).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up after the configured retries", async () => {
    quiet();
    const fetchMock = vi.fn(async () => new Response("", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    expect((await parseFeed(url, opts)).items).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe("cache", () => {
  it("does not cache by default", async () => {
    const fetchMock = vi.fn(async () => new Response(feedXml));
    vi.stubGlobal("fetch", fetchMock);
    await parseFeed(url);
    await parseFeed(url);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("serves fresh entries without fetching", async () => {
    const fetchMock = vi.fn(async () => new Response(feedXml));
    vi.stubGlobal("fetch", fetchMock);
    const a = await parseFeed(url, { cacheTtlMs: 1000 });
    const b = await parseFeed(url, { cacheTtlMs: 1000 });
    expect(b).toBe(a);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("revalidates expired entries and reuses them on 304", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(feedXml, {
          headers: {
            etag: '"v1"',
            "last-modified": "Sat, 04 Oct 2025 08:00:00 GMT",
          },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 304 }));
    vi.stubGlobal("fetch", fetchMock);

    const a = await parseFeed(url, { cacheTtlMs: 1000 });
    vi.advanceTimersByTime(1001);
    const b = await parseFeed(url, { cacheTtlMs: 1000 });

    expect(b).toBe(a);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].headers).toEqual({
      "If-None-Match": '"v1"',
      "If-Modified-Since": "Sat, 04 Oct 2025 08:00:00 GMT",
    });

    // the 304 pushed the expiry forward
    await parseFeed(url, { cacheTtlMs: 1000 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("serves the stale entry when a refresh fails", async () => {
    quiet();
    vi.useFakeTimers();
    const onError = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(feedXml))
        .mockResolvedValueOnce(new Response("", { status: 500 })),
    );
    const a = await parseFeed(url, { cacheTtlMs: 1000 });
    vi.advanceTimersByTime(1001);
    const b = await parseFeed(url, { cacheTtlMs: 1000, onError });
    expect(b).toBe(a);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("clearFeedCache empties the cache", async () => {
    const fetchMock = vi.fn(async () => new Response(feedXml));
    vi.stubGlobal("fetch", fetchMock);
    await parseFeed(url, { cacheTtlMs: 1000 });
    clearFeedCache();
    await parseFeed(url, { cacheTtlMs: 1000 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("sanitizeContent", () => {
  it("removes scripts, handlers, images and javascript: links", () => {
    const out = sanitizeContent(
      '<p>hi<script>alert(1)</script><img src=x onerror=alert(2)><a href="javascript:alert(3)">x</a></p>',
    );
    expect(out).not.toMatch(/script|onerror|<img|javascript:/i);
    expect(out).toContain("hi");
  });

  it("keeps Mastodon mentions, hashtags and invisible spans", () => {
    const html =
      '<p><span class="h-card"><a href="https://a.social/@b" class="u-url mention">@<span>b</span></a></span> ' +
      '<a href="https://a.social/tags/x" class="mention hashtag" rel="tag">#<span>x</span></a> ' +
      '<span class="invisible">https://</span></p>';
    const out = sanitizeContent(html);
    expect(out).toContain('class="h-card"');
    expect(out).toContain('class="u-url mention"');
    expect(out).toContain('<span class="invisible">https://</span>');
  });

  it("forces safe link attributes", () => {
    const out = sanitizeContent(
      '<a href="https://a.social" target="_self">x</a>',
    );
    expect(out).toContain('rel="nofollow noopener noreferrer"');
    expect(out).toContain('target="_blank"');
  });
});

describe("formatDate", () => {
  const date = new Date("2025-10-04T08:00:00Z");

  it("uses Intl with locale and timeZone", () => {
    const out = formatDate(date, {
      locale: "tr-TR",
      timeZone: "Europe/Istanbul",
    });
    expect(out).toContain("Eki");
    expect(out).toContain("11:00");
  });

  it("falls back for an invalid timeZone", () => {
    expect(formatDate(date, { timeZone: "Not/AZone" })).toContain(" at ");
  });
});
