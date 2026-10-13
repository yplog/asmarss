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
  let instance = first;
  let user: string;
  let options: FeedUrlOptions;

  if (typeof second === "string") {
    user = second;
    options = third ?? {};
  } else {
    options = second ?? {};
    const handle = first.trim().replace(/^@/, "");
    const at = handle.lastIndexOf("@");
    if (at < 0) return null;
    user = handle.slice(0, at);
    instance = handle.slice(at + 1);
  }

  user = user.trim().replace(/^@/, "");
  const origin = instanceOrigin(instance);
  if (!origin || !USERNAME.test(user)) return null;

  const tag = options.tag ? normalizeTag(options.tag) : "";
  const path = tag
    ? `/@${user}/tagged/${encodeURIComponent(tag)}.rss`
    : options.replies
      ? `/@${user}/with_replies.rss`
      : `/@${user}.rss`;
  return `${origin}${path}${options.onlyMedia ? "?only_media=1" : ""}`;
}
