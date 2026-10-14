import { mastodonFeedUrl, peertubeFeedUrl, pixelfedFeedUrl } from "./feedUrl";
import { reportError, reportWarning } from "./parseFeed";
import type { ParseFeedOptions } from "./parseFeed";
import {
  detectPlatform,
  mastodonOnlyOptions,
  platforms,
  type Platform,
} from "./platforms";

/** The component props that decide which feeds are loaded. */
export type SourceOptions = {
  url?: string | string[];
  account?: string | string[];
  channel?: string | string[];
  instance?: string;
  username?: string;
  platform?: Platform;
  tag?: string;
  replies?: boolean;
  onlyWithMedia?: boolean;
};

export type ResolvedSource = { url: string; platform: Platform };

const toList = (value: string | string[] | undefined) =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

/**
 * Turns the source props into feed addresses (url > account > channel >
 * instance + username). Invalid sources and ignored options are reported
 * through `onError` and left out.
 */
export function resolveSources(
  {
    url,
    account,
    channel,
    instance,
    username,
    platform,
    tag,
    replies = false,
    onlyWithMedia = false,
  }: SourceOptions,
  onError?: ParseFeedOptions["onError"],
): ResolvedSource[] {
  let platformProp = platform;
  if (platformProp !== undefined && !platforms.includes(platformProp)) {
    reportWarning(`Unknown platform "${platformProp}"`, "", onError);
    platformProp = undefined;
  }
  if (channel !== undefined && platformProp && platformProp !== "peertube") {
    reportWarning(
      "`channel` only works with PeerTube; using PeerTube",
      "",
      onError,
    );
  }
  const handlePlatform: Platform =
    channel !== undefined ? "peertube" : (platformProp ?? "mastodon");

  const feedUrlOptions = { tag, onlyMedia: onlyWithMedia, replies };
  const peertubeOptions = { channel: channel !== undefined };
  function buildUrl(first: string, second?: string): string | null {
    switch (handlePlatform) {
      case "pixelfed":
        return pixelfedFeedUrl(first, second);
      case "peertube":
        return second === undefined
          ? peertubeFeedUrl(first, peertubeOptions)
          : peertubeFeedUrl(first, second, peertubeOptions);
      default:
        return second === undefined
          ? mastodonFeedUrl(first, feedUrlOptions)
          : mastodonFeedUrl(first, second, feedUrlOptions);
    }
  }

  const handles = account ?? channel;
  const candidates: {
    given: string;
    url: string | null;
    platform: Platform;
  }[] =
    url !== undefined
      ? toList(url).map((u) => ({
          given: u,
          url: u || null,
          platform: platformProp ?? detectPlatform(u),
        }))
      : handles !== undefined
        ? toList(handles).map((h) => ({
            given: h,
            url: buildUrl(h),
            platform: handlePlatform,
          }))
        : instance !== undefined && username !== undefined
          ? [
              {
                given: `${instance} ${username}`,
                url: buildUrl(instance, username),
                platform: handlePlatform,
              },
            ]
          : [];

  if (candidates.length === 0) {
    reportError(new Error("Invalid or missing feed source"), "", onError);
  }

  const usedMastodonOnly = mastodonOnlyOptions.filter(
    (name) => ({ tag, replies, onlyWithMedia })[name],
  );
  const sources: ResolvedSource[] = [];
  for (const candidate of candidates) {
    if (!candidate.url) {
      reportError(
        new Error("Invalid or missing feed source"),
        candidate.given.trim(),
        onError,
      );
      continue;
    }
    sources.push({ url: candidate.url, platform: candidate.platform });
    if (candidate.platform !== "mastodon" && usedMastodonOnly.length > 0) {
      reportWarning(
        `Ignoring Mastodon-only options on ${candidate.platform}: ${usedMastodonOnly.join(", ")}`,
        candidate.url,
        onError,
      );
    }
  }
  return sources;
}
