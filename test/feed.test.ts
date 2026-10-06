import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatDate, parseFeed } from "../src/feed";

const feedXml = readFileSync(
  new URL("./fixtures/feed.xml", import.meta.url),
  "utf-8",
);
const url = "https://example.social/@test.rss";

afterEach(() => vi.unstubAllGlobals());

describe("asmarss/feed", () => {
  it("parses items, media and tags", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(feedXml)),
    );
    const { items, link } = await parseFeed(url);
    expect(link).toBe("https://example.social/@test");
    expect(items).toHaveLength(4);
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
    expect(await parseFeed(url)).toEqual({ items: null, link: null });
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
