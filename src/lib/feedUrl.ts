import { normalizeTag } from "./filter";

const USERNAME = /^[a-z0-9_]+([a-z0-9_.-]+[a-z0-9_]+)?$/i;

export type FeedUrlOptions = {
  /** Only posts with this hashtag. Wins over `replies`. */
  tag?: string;
  /** Only posts with attachments. */
  onlyMedia?: boolean;
  /** Include replies. */
  replies?: boolean;
};

function instanceOrigin(instance: string): string | null {
  const raw = instance.trim();
  if (!raw) return null;
  try {
    const { protocol, origin } = new URL(
      /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`,
    );
    return protocol === "http:" || protocol === "https:" ? origin : null;
  } catch {
    return null;
  }
}

/**
 * Splits `@user@instance` (or `instance` + `user`) into an origin and a
 * validated name. Returns `null` when the input is not valid.
 */
function resolveHandle(
  first: string,
  second?: string,
): { origin: string; user: string } | null {
  let instance = first;
  let user: string;

  if (second !== undefined) {
    user = second;
  } else {
    const handle = first.trim().replace(/^@/, "");
    const at = handle.lastIndexOf("@");
    if (at < 0) return null;
    user = handle.slice(0, at);
    instance = handle.slice(at + 1);
  }

  user = user.trim().replace(/^@/, "");
  const origin = instanceOrigin(instance);
  return origin && USERNAME.test(user) ? { origin, user } : null;
}

/**
 * Builds a Mastodon RSS address from `@user@instance` or from an instance
 * and a username. Returns `null` when the input is not valid.
 */
export function mastodonFeedUrl(
  account: string,
  options?: FeedUrlOptions,
): string | null;
export function mastodonFeedUrl(
  instance: string,
  username: string,
  options?: FeedUrlOptions,
): string | null;
export function mastodonFeedUrl(
  first: string,
  second?: string | FeedUrlOptions,
  third?: FeedUrlOptions,
): string | null {
  const twoParts = typeof second === "string";
  const resolved = resolveHandle(first, twoParts ? second : undefined);
  if (!resolved) return null;
  const { origin, user } = resolved;
  const options = (twoParts ? third : second) ?? {};

  const tag = options.tag ? normalizeTag(options.tag) : "";
  const path = tag
    ? `/@${user}/tagged/${encodeURIComponent(tag)}.rss`
    : options.replies
      ? `/@${user}/with_replies.rss`
      : `/@${user}.rss`;
  return `${origin}${path}${options.onlyMedia ? "?only_media=1" : ""}`;
}

/**
 * Builds a Pixelfed Atom address (`/users/<user>.atom`) from `@user@instance`
 * or from an instance and a username. Returns `null` when the input is not valid.
 */
export function pixelfedFeedUrl(first: string, second?: string): string | null {
  const resolved = resolveHandle(first, second);
  return resolved ? `${resolved.origin}/users/${resolved.user}.atom` : null;
}

export type PeerTubeFeedUrlOptions = {
  /** The name is a video channel (`/c/<name>`) rather than an account (`/a/<name>`). */
  channel?: boolean;
};

/**
 * Builds a PeerTube RSS address for an account or, with `{ channel: true }`, a
 * video channel. Takes `@name@instance` or an instance and a name. Returns
 * `null` when the input is not valid.
 */
export function peertubeFeedUrl(
  handle: string,
  options?: PeerTubeFeedUrlOptions,
): string | null;
export function peertubeFeedUrl(
  instance: string,
  name: string,
  options?: PeerTubeFeedUrlOptions,
): string | null;
export function peertubeFeedUrl(
  first: string,
  second?: string | PeerTubeFeedUrlOptions,
  third?: PeerTubeFeedUrlOptions,
): string | null {
  const twoParts = typeof second === "string";
  const resolved = resolveHandle(first, twoParts ? second : undefined);
  if (!resolved) return null;
  const { channel } = (twoParts ? third : second) ?? {};
  const param = channel ? "videoChannelName" : "accountName";
  return `${resolved.origin}/feeds/videos.xml?${param}=${encodeURIComponent(resolved.user)}`;
}
