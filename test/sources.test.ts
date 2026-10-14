import { describe, expect, it, vi } from "vitest";
import { resolveSources } from "../src/lib/sources";
import type { Platform } from "../src/lib/platforms";

const messages = (onError: ReturnType<typeof vi.fn>) =>
  onError.mock.calls.map(([error, url]) => [(error as Error).message, url]);

describe("resolveSources", () => {
  it("prefers url over account, channel and instance + username", () => {
    expect(
      resolveSources({
        url: "https://m.example/@a.rss",
        account: "@b@m.example",
        channel: "@c@tube.example",
        instance: "m.example",
        username: "d",
      }),
    ).toEqual([{ url: "https://m.example/@a.rss", platform: "mastodon" }]);
  });

  it("guesses the platform of each url unless platform is set", () => {
    expect(
      resolveSources({
        url: [
          "https://px.example/users/a.atom",
          "https://tube.example/feeds/videos.xml?accountName=a",
        ],
      }).map((s) => s.platform),
    ).toEqual(["pixelfed", "peertube"]);
    expect(
      resolveSources({
        url: "https://px.example/users/a.atom",
        platform: "mastodon",
      })[0].platform,
    ).toBe("mastodon");
  });

  it("builds feed addresses from accounts for each platform", () => {
    expect(
      resolveSources({ account: ["@a@m.example", "@b@m.example"] }),
    ).toEqual([
      { url: "https://m.example/@a.rss", platform: "mastodon" },
      { url: "https://m.example/@b.rss", platform: "mastodon" },
    ]);
    expect(
      resolveSources({ account: "@a@px.example", platform: "pixelfed" }),
    ).toEqual([
      { url: "https://px.example/users/a.atom", platform: "pixelfed" },
    ]);
    expect(
      resolveSources({
        instance: "tube.example",
        username: "a",
        platform: "peertube",
      }),
    ).toEqual([
      {
        url: "https://tube.example/feeds/videos.xml?accountName=a",
        platform: "peertube",
      },
    ]);
  });

  it("passes the Mastodon filters into the account address", () => {
    expect(
      resolveSources({
        account: "@a@m.example",
        tag: "#astro",
        onlyWithMedia: true,
      })[0].url,
    ).toBe("https://m.example/@a/tagged/astro.rss?only_media=1");
  });

  it("treats channel as PeerTube and warns when platform disagrees", () => {
    const onError = vi.fn();
    expect(
      resolveSources(
        { channel: "@c@tube.example", platform: "mastodon" },
        onError,
      ),
    ).toEqual([
      {
        url: "https://tube.example/feeds/videos.xml?videoChannelName=c",
        platform: "peertube",
      },
    ]);
    expect(messages(onError)).toEqual([
      ["`channel` only works with PeerTube; using PeerTube", ""],
    ]);
  });

  it("ignores an unknown platform with a warning", () => {
    const onError = vi.fn();
    const sources = resolveSources(
      { account: "@a@m.example", platform: "x" as Platform },
      onError,
    );
    expect(sources[0].platform).toBe("mastodon");
    expect(messages(onError)).toEqual([['Unknown platform "x"', ""]]);
  });

  it("warns about Mastodon-only options on other platforms", () => {
    const onError = vi.fn();
    resolveSources(
      {
        url: ["https://m.example/@a.rss", "https://px.example/users/a.atom"],
        tag: "astro",
        replies: true,
      },
      onError,
    );
    expect(messages(onError)).toEqual([
      [
        "Ignoring Mastodon-only options on pixelfed: tag, replies",
        "https://px.example/users/a.atom",
      ],
    ]);
  });

  it("reports invalid and missing sources and leaves them out", () => {
    const onError = vi.fn();
    expect(
      resolveSources({ url: ["", "https://m.example/@a.rss"] }, onError),
    ).toHaveLength(1);
    expect(resolveSources({ account: " nope " }, onError)).toEqual([]);
    expect(resolveSources({ instance: "m.example" }, onError)).toEqual([]);
    expect(messages(onError)).toEqual([
      ["Invalid or missing feed source", ""],
      ["Invalid or missing feed source", "nope"],
      ["Invalid or missing feed source", ""],
    ]);
  });
});
