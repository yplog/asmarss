const USERNAME = /^[a-z0-9_]+([a-z0-9_.-]+[a-z0-9_]+)?$/i;

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
export function mastodonFeedUrl(account: string): string | null;
export function mastodonFeedUrl(
  instance: string,
  username: string,
): string | null;
export function mastodonFeedUrl(
  first: string,
  username?: string,
): string | null {
  let instance = first;
  let user = username;

  if (user === undefined) {
    const handle = first.trim().replace(/^@/, "");
    const at = handle.lastIndexOf("@");
    user = handle.slice(0, at);
    instance = handle.slice(at + 1);
    if (at < 0) return null;
  }

  user = user.trim().replace(/^@/, "");
  const origin = instanceOrigin(instance);
  return origin && USERNAME.test(user) ? `${origin}/@${user}.rss` : null;
}
