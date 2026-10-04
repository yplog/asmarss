import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Asmarss from "../src/index.astro";

const feedXml = readFileSync(
  new URL("./fixtures/feed.xml", import.meta.url),
  "utf-8",
);
const emptyXml = `<?xml version="1.0"?><rss version="2.0"><channel><title>x</title><link>https://example.social/@test</link></channel></rss>`;

const url = "https://example.social/@test.rss";

function mockFetch(body: string, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body, { status })),
  );
}

async function render(props: Record<string, unknown> = {}) {
  const container = await AstroContainer.create();
  return container.renderToString(Asmarss, { props: { url, ...props } });
}

afterEach(() => vi.unstubAllGlobals());

describe("Asmarss", () => {
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
    const html = await render({ classList: { toot: "my-toot" } });
    expect(html).toContain("my-toot");
  });

  it("renders media with alt text", async () => {
    mockFetch(feedXml);
    const html = await render();
    expect(html).toContain("<img");
    expect(html).toContain('alt="A cat on a keyboard"');
    expect(html).toContain("https://example.social/media/cat.jpg");
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
});
