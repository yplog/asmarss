import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import FediFeed from "../src/index.astro";
import { clearFeedCache } from "../src/feed";

const feedXml = readFileSync(
  new URL("./fixtures/feed.xml", import.meta.url),
  "utf-8",
);
const emptyXml = `<?xml version="1.0"?><rss version="2.0"><channel><title>x</title><link>https://example.social/@test</link></channel></rss>`;

const url = "https://example.social/@test.rss";

const fixture = (name: string) =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf-8");

function mockFetch(body: string, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body, { status })),
  );
}

async function render(props: Record<string, unknown> = {}) {
  const container = await AstroContainer.create();
  return container.renderToString(FediFeed, { props: { url, ...props } });
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  clearFeedCache();
});

describe("FediFeed", () => {
  it("renders every toot and the see more link", async () => {
    mockFetch(feedXml);
    const html = await render();
    expect(html).toContain("Second toot");
    expect(html).toContain("First toot");
    expect(html).toContain("See more");
    expect(html).toContain('href="https://example.social/@test"');
  });

  it("renders a message for an empty feed", async () => {
    mockFetch(emptyXml);
    expect(await render()).toContain("No items in feed");
  });

  it("renders an error when the request fails", async () => {
    mockFetch("nope", 500);
    const html = await render();
    expect(html).toContain("Error loading feed");
    expect(html).not.toContain("See more");
  });

  it("renders an error when fetch throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network");
      }),
    );
    expect(await render()).toContain("Error loading feed");
  });

  it("limits the number of toots", async () => {
    mockFetch(feedXml);
    const html = await render({ limit: 1 });
    expect(html).toContain("Second toot");
    expect(html).not.toContain("First toot");
  });

  it("renders separators with `separator` and the deprecated `seperator`", async () => {
    mockFetch(feedXml);
    expect(await render()).not.toContain("<hr");
    expect(await render({ separator: true })).toContain("<hr");
    expect(await render({ seperator: true })).toContain("<hr");
  });

  it("applies classList entries", async () => {
    mockFetch(feedXml);
    const html = await render({ classList: { post: "my-toot" } });
    expect(html).toContain("my-toot");
  });

  it("renders media with alt text", async () => {
    mockFetch(feedXml);
    const html = await render();
    expect(html).toContain("<img");
    expect(html).toContain('alt="A cat on a keyboard"');
    expect(html).toContain("https://example.social/media/cat.jpg");
  });

  it("renders video with a poster and drops unsafe urls", async () => {
    mockFetch(feedXml);
    const html = await render();
    expect(html).toContain("<video");
    expect(html).toContain('poster="https://example.social/media/anim.png"');
    expect(html).not.toContain("javascript:");
  });

  it("skips media with `media={false}`", async () => {
    mockFetch(feedXml);
    expect(await render({ media: false })).not.toContain("<img");
  });

  it("wraps sensitive media in <details>", async () => {
    mockFetch(feedXml);
    const html = await render();
    expect(html).toMatch(
      /<details[^>]*>\s*<summary[^>]*>Sensitive content<\/summary>/,
    );
    expect(html).toContain('alt="Hidden picture"');
  });

  it("renders hashtags only with `tags`", async () => {
    mockFetch(feedXml);
    expect(await render()).not.toContain("#astro");
    const html = await render({ tags: true });
    expect(html).toContain("#astro");
    expect(html).toContain('href="https://example.social/tags/rss"');
  });

  it("sanitizes post content unless `sanitize={false}`", async () => {
    mockFetch(feedXml);
    const safe = await render();
    expect(safe).toContain("Unsafe toot");
    expect(safe).not.toContain("<script>alert(1)");
    expect(safe).not.toContain("onerror");
    const raw = await render({ sanitize: false });
    expect(raw).toContain("<script>alert(1)</script>");
  });

  it("treats NaN and fractional limits sanely", async () => {
    mockFetch(feedXml);
    expect(await render({ limit: NaN })).toContain("First toot");
    const html = await render({ limit: 1.9 });
    expect(html).toContain("Second toot");
    expect(html).not.toContain("First toot");
  });

  it("caches with `cacheTtl` and reports errors through `onError`", async () => {
    mockFetch(feedXml);
    await render({ cacheTtl: 60 });
    await render({ cacheTtl: 60 });
    expect(fetch).toHaveBeenCalledTimes(1);

    clearFeedCache();
    mockFetch("nope", 500);
    const onError = vi.fn();
    expect(await render({ onError })).toContain("Error loading feed");
    expect(onError).toHaveBeenCalledWith(expect.any(Error), url);
  });

  it("renders no posts for a negative limit", async () => {
    mockFetch(feedXml);
    const html = await render({ limit: -1 });
    expect(html).not.toContain("Second toot");
    expect(html).not.toContain("First toot");
  });

  it("passes an abort signal to fetch", async () => {
    mockFetch(feedXml);
    await render();
    expect(fetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("overrides labels and keeps the rest in English", async () => {
    mockFetch(feedXml);
    const html = await render({
      labels: {
        seeMore: "Devamı",
        viewOnMastodon: "Mastodon'da gör",
        sensitiveContent: "Hassas içerik",
      },
    });
    expect(html).toContain("Devamı");
    expect(html).toContain("Mastodon&#39;da gör");
    expect(html).toContain("Hassas içerik");
    expect(html).not.toContain("See more");

    mockFetch(emptyXml);
    expect(await render({ labels: { seeMore: "Devamı" } })).toContain(
      "No items in feed",
    );
    expect(await render({ labels: { noItemsInFeed: "Boş" } })).toContain("Boş");
    mockFetch("nope", 500);
    expect(await render({ labels: { errorLoadingFeed: "Hata" } })).toContain(
      "Hata",
    );
  });

  it("keeps the default date format", async () => {
    mockFetch(feedXml);
    expect(await render()).toMatch(/Oct 0\d 2025 at /);
  });

  it("formats dates with locale and timeZone", async () => {
    mockFetch(feedXml);
    const html = await render({ locale: "tr-TR", timeZone: "Europe/Istanbul" });
    expect(html).toContain("Eki");
    expect(html).toContain("11:00"); // 08:00 UTC
    expect(html).not.toContain(" at ");
  });

  it("falls back to the default format for an invalid timeZone", async () => {
    mockFetch(feedXml);
    expect(await render({ timeZone: "Not/AZone" })).toMatch(/ 2025 at /);
  });

  it("renders semantic markup and the new classList keys", async () => {
    mockFetch(feedXml);
    const html = await render({
      separator: true,
      classList: { feed: "f", feed__list: "fl", feed__item: "fi" },
    });
    for (const tag of ["<article", "<ul", "<li", "<header", "<footer"]) {
      expect(html).toContain(tag);
    }
    expect(html).toMatch(/<section[^>]*class="f"/);
    expect(html).toMatch(/<ul[^>]*class="fl"/);
    expect(html).toMatch(/<li[^>]*class="fi"/);
    expect(html).toMatch(/<\/article>\s*<hr[^>]*>\s*<\/li>/);
  });

  it("builds the url from `account` or `instance` + `username`", async () => {
    mockFetch(feedXml);
    const expected = "https://example.social/@test.rss";
    const opts = expect.objectContaining({ signal: expect.any(AbortSignal) });

    expect(
      await render({ url: undefined, account: "@test@example.social" }),
    ).toContain("First toot");
    expect(fetch).toHaveBeenLastCalledWith(expected, opts);

    await render({
      url: undefined,
      instance: "example.social",
      username: "test",
    });
    expect(fetch).toHaveBeenLastCalledWith(expected, opts);
  });

  it("prefers `url`, then `account`, then `instance` + `username`", async () => {
    mockFetch(feedXml);
    await render({ account: "@other@other.social" });
    expect(fetch).toHaveBeenLastCalledWith(url, expect.anything());

    await render({
      url: undefined,
      account: "@a@a.social",
      instance: "b.social",
      username: "b",
    });
    expect(fetch).toHaveBeenLastCalledWith(
      "https://a.social/@a.rss",
      expect.anything(),
    );
  });

  it("renders the error without fetching for an invalid source", async () => {
    mockFetch(feedXml);
    const onError = vi.fn();
    const html = await render({ url: undefined, account: "nope", onError });
    expect(html).toContain("Error loading feed");
    expect(fetch).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.any(Error), "nope");

    expect(await render({ url: undefined })).toContain("Error loading feed");
    expect(console.warn).toHaveBeenCalled();
  });

  it("renders a header with the avatar and title", async () => {
    mockFetch(feedXml);
    expect(await render()).not.toContain("Public posts from");
    const html = await render({
      header: true,
      classList: { feed__header: "fh", feed__avatar: "fa", feed__title: "ft" },
    });
    expect(html).toMatch(/<header[^>]*class="fh"/);
    expect(html).toMatch(
      /<img[^>]*class="fa"[^>]*src="https:\/\/example.social\/avatars\/test.png"/,
    );
    expect(html).toContain("Test User");
    expect(html).toContain("Public posts from @test@example.social");
  });

  it("filters with `onlyWithMedia` and `tag`", async () => {
    mockFetch(feedXml);
    const media = await render({ onlyWithMedia: true });
    expect(media).toContain("Tagged toot");
    expect(media).not.toContain("Second toot");

    const tagged = await render({ tag: "#RSS" });
    expect(tagged).toContain("Tagged toot");
    expect(tagged).not.toContain("Second toot");

    expect(await render({ tag: "missing" })).toContain("No items in feed");
  });

  it("asks the server for tag, replies and media feeds of an account", async () => {
    mockFetch(feedXml);
    const base = "https://example.social/@test";
    const account = "@test@example.social";
    const calls = async (props: Record<string, unknown>) => {
      vi.mocked(fetch).mockClear();
      await render({ url: undefined, account, ...props });
      return vi.mocked(fetch).mock.calls.map((c) => c[0]);
    };
    expect(await calls({ tag: "rss" })).toEqual([`${base}/tagged/rss.rss`]);
    expect(await calls({ replies: true })).toEqual([
      `${base}/with_replies.rss`,
    ]);
    expect(await calls({ onlyWithMedia: true })).toEqual([
      `${base}.rss?only_media=1`,
    ]);
  });

  it("merges several accounts with authors and no see more link", async () => {
    const other = `<rss version="2.0"><channel><title>Other</title><link>https://other.social/@o</link>
      <image><url>https://other.social/o.png</url></image>
      <item><link>https://other.social/@o/1</link><pubDate>Mon, 06 Oct 2025 12:00:00 +0000</pubDate><description>&lt;p&gt;Other toot&lt;/p&gt;</description></item>
    </channel></rss>`;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (u: string) =>
        u.includes("other.social")
          ? new Response(other)
          : new Response(feedXml),
      ),
    );
    const html = await render({
      url: undefined,
      account: ["@test@example.social", "@o@other.social"],
      header: true,
      classList: { post__author: "au", post__author__name: "an" },
    });
    expect(html.indexOf("Other toot")).toBeLessThan(
      html.indexOf("Second toot"),
    );
    expect(html).toMatch(/class="au"/);
    expect(html).toMatch(/<a[^>]*class="an"[^>]*>\s*Other\s*<\/a>/);
    expect(html).not.toContain("See more");
    expect(html.match(/<header/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("still renders the feeds that load when one of several fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (u: string) =>
        u.includes("other.social")
          ? new Response("", { status: 404 })
          : new Response(feedXml),
      ),
    );
    const onError = vi.fn();
    const html = await render({
      url: undefined,
      account: ["@test@example.social", "@o@other.social"],
      onError,
    });
    expect(html).toContain("Second toot");
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("doesn't add authors for a single feed", async () => {
    mockFetch(feedXml);
    expect(await render({ classList: { post__author: "au" } })).not.toContain(
      'class="au"',
    );
  });

  it("renders a Pixelfed feed from its url", async () => {
    mockFetch(fixture("pixelfed.atom"));
    const html = await render({
      url: "https://pixelfed.example/users/test.atom",
      tags: true,
    });
    expect(html).toContain("Sunset at the lake");
    expect(html).not.toContain("media-gallery");
    // Each image once, from the media list.
    expect(html.match(/sunset\.jpg/g)).toHaveLength(1);
    expect(html).toContain(
      'href="https://pixelfed.example/discover/tags/nature"',
    );
    expect(html).toContain("View on Pixelfed");
    expect(html).not.toContain("View on Mastodon");
  });

  it("renders a PeerTube channel with titles and thumbnails", async () => {
    mockFetch(fixture("peertube.xml"));
    const html = await render({
      url: undefined,
      channel: "@test_channel@tube.example",
      tags: true,
      classList: { post__title: "tt", post__thumbnail: "th" },
    });
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      "https://tube.example/feeds/videos.xml?videoChannelName=test_channel",
    );
    expect(html).toMatch(
      /class="tt"[^>]*>\s*<a href="https:\/\/tube.example\/w\/abc123"/,
    );
    expect(html).toContain("Making of: the first video");
    expect(html).toMatch(
      /<img class="th" src="https:\/\/tube.example\/lazy-static\/thumbnails\/abc123.jpg"/,
    );
    expect(html).toContain("A look behind the scenes of our first video.");
    expect(html).not.toContain("Science &amp; Technology");
    expect(html).toContain("Watch on PeerTube");

    expect(
      await render({
        url: undefined,
        channel: "@test_channel@tube.example",
        media: false,
      }),
    ).not.toContain("thumbnails/abc123.jpg");
  });

  it("builds Pixelfed and PeerTube addresses from `platform`", async () => {
    mockFetch(emptyXml);
    const calls = async (props: Record<string, unknown>) => {
      vi.mocked(fetch).mockClear();
      await render({ url: undefined, ...props });
      return vi.mocked(fetch).mock.calls.map((c) => c[0]);
    };
    expect(
      await calls({ platform: "pixelfed", account: "@test@pixelfed.example" }),
    ).toEqual(["https://pixelfed.example/users/test.atom"]);
    expect(
      await calls({
        platform: "peertube",
        instance: "tube.example",
        username: "test",
      }),
    ).toEqual(["https://tube.example/feeds/videos.xml?accountName=test"]);
  });

  it("warns about and ignores Mastodon-only options on other platforms", async () => {
    mockFetch(fixture("pixelfed.atom"));
    const onError = vi.fn();
    const html = await render({
      url: undefined,
      platform: "pixelfed",
      account: "@test@pixelfed.example",
      tag: "missing",
      replies: true,
      onError,
    });
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      "https://pixelfed.example/users/test.atom",
    );
    expect(html).toContain("Sunset at the lake");
    expect(onError).toHaveBeenCalledTimes(1);
    expect(String(onError.mock.calls[0][0])).toContain(
      "Ignoring Mastodon-only options on pixelfed: tag, replies",
    );
  });

  it("warns without the load-failure wording when there is no onError", async () => {
    mockFetch(emptyXml);
    await render({ platform: "myspace" });
    expect(console.warn).toHaveBeenCalledWith(
      '[astro-fedifeed] Unknown platform "myspace"',
    );
  });

  it("reports an unknown platform and a channel on another platform", async () => {
    mockFetch(emptyXml);
    const onError = vi.fn();
    await render({ platform: "myspace", onError });
    expect(String(onError.mock.calls[0][0])).toContain(
      'Unknown platform "myspace"',
    );

    onError.mockClear();
    vi.mocked(fetch).mockClear();
    await render({
      url: undefined,
      platform: "pixelfed",
      channel: "@c@tube.example",
      onError,
    });
    expect(String(onError.mock.calls[0][0])).toContain(
      "`channel` only works with PeerTube",
    );
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      "https://tube.example/feeds/videos.xml?videoChannelName=c",
    );
  });

  it("maps deprecated toot classList keys to post and warns once", async () => {
    mockFetch(feedXml);
    const html = await render({
      classList: { toot: "old", toot__content: "c", post__content: "new" },
    });
    expect(html).toMatch(/<article[^>]*class="old"/);
    expect(html).toContain('class="new"');
    expect(html).not.toContain('class="c"');
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'classList keys starting with "toot" are deprecated',
      ),
    );

    vi.mocked(console.warn).mockClear();
    await render({ classList: { toot: "old" } });
    expect(console.warn).not.toHaveBeenCalled();
  });
});
