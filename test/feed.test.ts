import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearFeedCache,
  detectPlatform,
  filterItems,
  formatDate,
  mastodonFeedUrl,
  normalizeEntry,
  parseFeed,
  parseFeeds,
  peertubeFeedUrl,
  pixelfedFeedUrl,
  sanitizeContent,
} from "../src/feed";
import type { FeedEntry } from "../src/feed";

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

describe("astro-fedifeed/feed", () => {
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

  it("parses the channel title, description and image", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(feedXml)),
    );
    expect(await parseFeed(url)).toMatchObject({
      title: "Test User",
      description: "Public posts from @test@example.social",
      image: "https://example.social/avatars/test.png",
    });

    const xml = `<rss version="2.0"><channel><title>x</title><image><url>javascript:alert(1)</url></image></channel></rss>`;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(xml)),
    );
    expect(await parseFeed(url)).toMatchObject({
      title: "x",
      description: null,
      image: null,
    });
  });

  it("returns null items on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 })),
    );
    quiet();
    expect(await parseFeed(url)).toEqual({
      items: null,
      link: null,
      title: null,
      description: null,
      image: null,
    });
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

const fixture = (name: string) =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf-8");

const serve = (body: string) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body)),
  );

describe("Atom feeds", () => {
  it("parses a Pixelfed feed", async () => {
    serve(fixture("pixelfed.atom"));
    const feed = await parseFeed("https://pixelfed.example/users/test.atom");
    expect(feed).toMatchObject({
      link: "https://pixelfed.example/test",
      title: "test on pixelfed.example",
      description: "Hi, I'm a photographer",
      image: "https://pixelfed.example/storage/avatars/test.jpg",
    });
    expect(feed.items).toHaveLength(2);

    const [first, second] = feed.items ?? [];
    expect(first).toMatchObject({
      link: "https://pixelfed.example/p/test/2",
      pubDate: "2025-10-04T08:00:00.000Z",
      title: "Sunset at the lake #nature",
      tags: [],
    });
    expect(first.content).toMatch(/^<div class="media-gallery">/);
    expect(first.content).toContain("Sunset at the lake");
    expect(first.media).toEqual([
      {
        url: "https://cdn.pixelfed.example/m/sunset.jpg",
        type: "image/jpg",
        medium: "image",
        description: "",
        sensitive: false,
      },
    ]);
    expect(second.media).toHaveLength(2);
  });

  it("parses a PeerTube Atom feed, preferring logo over icon", async () => {
    serve(fixture("peertube.atom"));
    const feed = await parseFeed("https://tube.example/feeds/videos.atom");
    expect(feed).toMatchObject({
      link: "https://tube.example/c/test_channel/videos",
      title: "Test Channel",
      description: "Videos from the test channel",
      image: "https://tube.example/lazy-static/avatars/test.webp",
    });
    expect(feed.items?.[0]).toMatchObject({
      link: "https://tube.example/w/abc123",
      title: "Making of: the first video",
      content: "<p>A look behind the scenes of our first video.</p>",
      media: [],
    });
  });

  it("reads published, category terms and falls back to summary", async () => {
    serve(`<feed xmlns="http://www.w3.org/2005/Atom">
      <link href="javascript:alert(1)"/>
      <entry>
        <link rel="self" href="https://example.org/self"/>
        <link rel="alternate" href="https://example.org/post"/>
        <published>2025-10-01T00:00:00Z</published>
        <updated>2025-10-05T00:00:00Z</updated>
        <summary>Only a summary</summary>
        <category term="astro"/><category term="rss"/>
      </entry>
    </feed>`);
    const feed = await parseFeed(url);
    expect(feed.link).toBeNull();
    expect(feed.items?.[0]).toEqual({
      link: "https://example.org/post",
      pubDate: "2025-10-01T00:00:00Z",
      content: "Only a summary",
      media: [],
      tags: ["astro", "rss"],
    });
  });
});

describe("PeerTube RSS", () => {
  it("prefers content:encoded and reads the title and thumbnail", async () => {
    serve(fixture("peertube.xml"));
    const feed = await parseFeed("https://tube.example/feeds/videos.xml");
    expect(feed).toMatchObject({
      link: "https://tube.example/c/test_channel/videos",
      title: "Test Channel",
      image: "https://tube.example/lazy-static/avatars/test.png",
    });

    const [video, teaser] = feed.items ?? [];
    expect(video).toMatchObject({
      title: "Making of: the first video",
      thumbnail: "https://tube.example/lazy-static/thumbnails/abc123.jpg",
      tags: ["Science & Technology"],
    });
    expect(video.content).toMatch(
      /^<p>A look behind the scenes of our first video\.<\/p>/,
    );
    // Video files inside media:group are not attachments.
    expect(video.media).toEqual([]);

    expect(teaser.content).toBe("Short teaser");
    expect(teaser).not.toHaveProperty("thumbnail");
  });

  it("leaves title and thumbnail out for Mastodon posts", async () => {
    serve(feedXml);
    for (const item of (await parseFeed(url)).items ?? []) {
      expect(item).not.toHaveProperty("title");
      expect(item).not.toHaveProperty("thumbnail");
    }
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

describe("mastodonFeedUrl", () => {
  const expected = "https://mastodon.social/@yplog.rss";

  it("builds the url from an instance and a username", () => {
    expect(mastodonFeedUrl("mastodon.social", "yplog")).toBe(expected);
    expect(mastodonFeedUrl("https://mastodon.social/", "@yplog")).toBe(
      expected,
    );
    expect(mastodonFeedUrl(" mastodon.social ", " yplog ")).toBe(expected);
    expect(mastodonFeedUrl("https://mastodon.social/@x?y=1", "yplog")).toBe(
      expected,
    );
  });

  it("builds the url from a full account name", () => {
    expect(mastodonFeedUrl("@yplog@mastodon.social")).toBe(expected);
    expect(mastodonFeedUrl("yplog@mastodon.social")).toBe(expected);
  });

  it("returns null for invalid input", () => {
    expect(mastodonFeedUrl("ftp://x.social", "a")).toBeNull();
    expect(mastodonFeedUrl("", "a")).toBeNull();
    expect(mastodonFeedUrl("mastodon.social", "")).toBeNull();
    expect(mastodonFeedUrl("mastodon.social", "a b")).toBeNull();
    expect(mastodonFeedUrl("yplog")).toBeNull();
    expect(mastodonFeedUrl("@@x")).toBeNull();
    expect(mastodonFeedUrl("@yplog@")).toBeNull();
  });
});

describe("mastodonFeedUrl options", () => {
  const base = "https://mastodon.social/@yplog";

  it("builds tag, replies and media addresses", () => {
    const acc = "@yplog@mastodon.social";
    expect(mastodonFeedUrl(acc, { onlyMedia: true })).toBe(
      `${base}.rss?only_media=1`,
    );
    expect(mastodonFeedUrl(acc, { replies: true })).toBe(
      `${base}/with_replies.rss`,
    );
    expect(mastodonFeedUrl(acc, { tag: "#Astro" })).toBe(
      `${base}/tagged/Astro.rss`,
    );
    expect(mastodonFeedUrl("mastodon.social", "yplog", { tag: "a b" })).toBe(
      `${base}/tagged/a%20b.rss`,
    );
  });

  it("lets tag win over replies and combines with media", () => {
    expect(
      mastodonFeedUrl("@yplog@mastodon.social", {
        tag: "astro",
        replies: true,
        onlyMedia: true,
      }),
    ).toBe(`${base}/tagged/astro.rss?only_media=1`);
  });
});

describe("filterItems", () => {
  const item = (tags: string[], media = false) =>
    ({
      link: tags.join(),
      pubDate: "",
      content: "",
      tags,
      media: media
        ? [
            {
              url: "u",
              type: "",
              medium: "image",
              description: "",
              sensitive: false,
            },
          ]
        : [],
    }) as FeedEntry;
  const items = [item(["Astro"], true), item(["astro"]), item(["rss"], true)];

  it("filters by media and tag, ignoring case and #", () => {
    expect(filterItems(items)).toHaveLength(3);
    expect(filterItems(items, { onlyWithMedia: true })).toHaveLength(2);
    expect(filterItems(items, { tag: "#ASTRO" })).toHaveLength(2);
    expect(filterItems(items, { tag: "astro", onlyWithMedia: true })).toEqual([
      items[0],
    ]);
  });
});

describe("parseFeeds", () => {
  const otherXml = `<rss version="2.0"><channel><title>Other</title><link>https://other.social/@o</link>
    <image><url>https://other.social/o.png</url></image>
    <item><link>https://other.social/@o/1</link><pubDate>Fri, 03 Oct 2025 12:00:00 +0000</pubDate><description>&lt;p&gt;Other toot&lt;/p&gt;</description></item>
    <item><link>https://other.social/@o/2</link><pubDate>garbage</pubDate><description>x</description></item>
  </channel></rss>`;
  const otherUrl = "https://other.social/@o.rss";

  function stub(map: Record<string, Response | Error>) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (u: string) => {
        const r = map[u];
        if (r instanceof Error) throw r;
        return r;
      }),
    );
  }

  it("merges posts newest first and tags each with its source", async () => {
    stub({ [url]: new Response(feedXml), [otherUrl]: new Response(otherXml) });
    const { items, feeds } = await parseFeeds([url, otherUrl]);
    expect(feeds.map((f) => f.url)).toEqual([url, otherUrl]);
    const links = items?.map((i) => i.link) ?? [];
    expect(links.indexOf("https://other.social/@o/1")).toBeLessThan(
      links.indexOf("https://example.social/@test/1"),
    );
    // invalid dates go last
    expect(links.at(-1)).toBe("https://other.social/@o/2");
    expect(items?.find((i) => i.link.endsWith("@o/1"))?.source).toEqual({
      url: otherUrl,
      link: "https://other.social/@o",
      title: "Other",
      image: "https://other.social/o.png",
    });
  });

  it("keeps the other feed when one fails", async () => {
    const onError = vi.fn();
    stub({ [url]: new Error("down"), [otherUrl]: new Response(otherXml) });
    const { items, feeds } = await parseFeeds([url, otherUrl], { onError });
    expect(items).toHaveLength(2);
    expect(feeds[0].items).toBeNull();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("returns null items when every feed fails", async () => {
    quiet();
    stub({
      [url]: new Error("a"),
      [otherUrl]: new Response("", { status: 500 }),
    });
    expect((await parseFeeds([url, otherUrl])).items).toBeNull();
  });
});

describe("pixelfedFeedUrl", () => {
  it("builds the Atom address from a handle or an instance and a username", () => {
    expect(pixelfedFeedUrl("@dansup@pixelfed.social")).toBe(
      "https://pixelfed.social/users/dansup.atom",
    );
    expect(pixelfedFeedUrl("pixelfed.social", "@dansup")).toBe(
      "https://pixelfed.social/users/dansup.atom",
    );
    expect(pixelfedFeedUrl("dansup")).toBeNull();
    expect(pixelfedFeedUrl("pixelfed.social", "bad name")).toBeNull();
  });
});

describe("peertubeFeedUrl", () => {
  it("builds account and channel addresses", () => {
    const base = "https://video.blender.org/feeds/videos.xml";
    expect(peertubeFeedUrl("@blender@video.blender.org")).toBe(
      `${base}?accountName=blender`,
    );
    expect(
      peertubeFeedUrl("blender_studio@video.blender.org", { channel: true }),
    ).toBe(`${base}?videoChannelName=blender_studio`);
    expect(
      peertubeFeedUrl("video.blender.org", "blender_studio", { channel: true }),
    ).toBe(`${base}?videoChannelName=blender_studio`);
    expect(peertubeFeedUrl("javascript:alert(1)", "x")).toBeNull();
  });
});

describe("detectPlatform", () => {
  it("recognises Pixelfed and PeerTube feed addresses", () => {
    expect(detectPlatform("https://pixelfed.social/users/dansup.atom")).toBe(
      "pixelfed",
    );
    expect(
      detectPlatform("https://tube.example/feeds/videos.xml?accountName=x"),
    ).toBe("peertube");
    expect(
      detectPlatform("https://tube.example/feeds/videos.atom?format=atom"),
    ).toBe("peertube");
    expect(detectPlatform("https://mastodon.social/@user.rss")).toBe(
      "mastodon",
    );
    expect(detectPlatform("not a url")).toBe("mastodon");
  });
});

describe("normalizeEntry", () => {
  it("strips the Pixelfed gallery and title and reads hashtag links", async () => {
    serve(fixture("pixelfed.atom"));
    const [post] = (await parseFeed(url)).items ?? [];
    const pixelfed = normalizeEntry(post, "pixelfed");
    expect(pixelfed).not.toHaveProperty("title");
    expect(pixelfed.content).toMatch(/^<p /);
    expect(pixelfed.content).not.toContain("media-gallery");
    expect(pixelfed.tags).toEqual(["nature"]);
    expect(pixelfed.media).toHaveLength(1);
  });

  it("drops PeerTube categories and leaves Mastodon posts alone", async () => {
    serve(fixture("peertube.xml"));
    const [video] = (await parseFeed(url)).items ?? [];
    expect(normalizeEntry(video, "peertube")).toMatchObject({
      title: "Making of: the first video",
      tags: [],
    });
    expect(normalizeEntry(video, "mastodon")).toBe(video);
  });
});
