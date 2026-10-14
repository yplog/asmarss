# Changelog

## Unreleased

### Added

- Pixelfed and PeerTube support. A `platform` prop (`"mastodon"`, `"pixelfed"`, `"peertube"`) builds the feed address from `account` or `instance` + `username`; with `url` the platform is guessed from the address. A new `channel` prop takes a PeerTube video channel.
- Pixelfed posts drop the duplicate image gallery from the caption and their title, and read hashtags from the caption (linking to `/discover/tags/<tag>`). PeerTube posts render the video title and thumbnail (`toot__title`, `toot__thumbnail`) and drop the category tags.
- `viewOnPixelfed` and `viewOnPeerTube` labels.
- `pixelfedFeedUrl`, `peertubeFeedUrl`, `detectPlatform`, `normalizeEntry` and the `Platform` and `PeerTubeFeedUrlOptions` types in `asmarss/feed`.
- `onlyWithMedia`, `tag` and `replies` are ignored on Pixelfed and PeerTube, with a warning through `onError` / `console.warn`. An unknown `platform` is reported the same way.
- Atom feeds are parsed alongside RSS (`<feed>` / `<entry>`: `published` or `updated`, `content` or `summary`, the alternate `<link>`, `category` terms; `subtitle` and `logo` / `icon` for the header). Pixelfed (`/users/<user>.atom`) and PeerTube Atom feeds now work through `url`.
- RSS items prefer `content:encoded` over `description`, so PeerTube feeds show the full video description.
- `FeedEntry` has the optional fields `title` (PeerTube and Pixelfed) and `thumbnail` (the post-level `media:thumbnail`, e.g. a PeerTube video thumbnail).

### Changed

- **Breaking:** requires Node.js >= 24 and `astro` >= 6. CI now runs on Node.js 24 against Astro 6 and 7.

### Fixed

- Numeric character references such as `&#039;` are decoded.

## 0.8.0

### Added

- `onlyWithMedia`, `tag` and `replies` props. Account sources request the matching server feed (`/tagged/<tag>.rss`, `?only_media=1`, `/with_replies.rss`); the filters are also applied in the component, so they work with `url` too.
- `header` prop that renders each feed's avatar, title and description, with new `feed__header`, `feed__avatar`, `feed__title` and `feed__description` classes.
- `url` and `account` accept arrays to merge several feeds, newest first. Posts get an author line (`toot__author`, `toot__author__avatar`, `toot__author__name`), and failing feeds are skipped and reported through `onError`.
- `parseFeeds`, `filterItems` and the `FeedSource`, `MergedFeed`, `FeedUrlOptions` and `FilterOptions` types in `asmarss/feed`; `mastodonFeedUrl` takes `{ tag, onlyMedia, replies }`.

### Changed

- `ParsedFeed` has the new fields `title`, `description` and `image`, and `FeedEntry` an optional `source`.

## 0.7.0

### Added

- `account` prop (`@user@instance`) and `instance` + `username` props as shorter alternatives to `url`. Precedence: `url`, then `account`, then `instance` + `username`.
- `mastodonFeedUrl` export in `asmarss/feed` to build the RSS address from an account name.
- An invalid or missing source renders the error message and is reported through `onError` / `console.warn` without a request.

### Changed

- `url` is no longer required when `account` or `instance` + `username` is given.

## 0.6.0

### Added

- `cacheTtl` prop / `cacheTtlMs` option: in-memory feed cache with `ETag` / `Last-Modified` revalidation and stale-on-error.
- `retries` (and `retryDelayMs`) for network errors, 5xx and 429; `timeout` prop.
- `onError` callback for failed requests.
- `sanitize` prop (default `true`) and `sanitizeContent` export in `asmarss/feed`; `clearFeedCache` and `ParseFeedOptions` are exported too.
- `test:coverage` script; more tests for failure paths, caching, retries and sanitization.

### Changed

- Post content is sanitized by default (Mastodon markup only). Pass `sanitize={false}` for the previous behaviour.
- Failed requests are logged with `console.warn` instead of being swallowed silently.
- New dependency: `sanitize-html`.

## 0.5.0

### Added

- Videos render with a `poster` taken from `media:thumbnail`; `FeedMedia` has an optional `thumbnail`.

### Changed

- `engines.node` is now `>=22` (the tested versions).

### Fixed

- Animated gifs (published as `medium="image"` with a `video/*` type) render as `<video>` instead of a broken `<img>`.
- Non-http(s) URLs (e.g. `javascript:`) in post links, the channel link and media are dropped.
- The "View on Mastodon" footer is omitted when a post has no valid link.
- The headless example in the README passed literal strings instead of expressions.

## 0.4.0

### Added

- `labels` prop to override the built-in texts (`seeMore`, `viewOnMastodon`, `errorLoadingFeed`, `noItemsInFeed`, `sensitiveContent`).
- `locale` and `timeZone` props for date formatting; the default format is unchanged when neither is set.
- New `ClassList` keys: `feed`, `feed__list`, `feed__item`.
- `asmarss/feed` export (`parseFeed`, `formatDate` and feed types) for rendering posts with your own markup.
- `Labels` type.

### Changed

- Semantic markup: posts are now `<ul>/<li>` with an `<article>` containing `<header>` and `<footer>`; the extra wrapper `<div>`s were removed. Existing `classList` keys still apply to the same logical parts, but styles that target elements (e.g. `section > div`) may need updating.

## 0.3.0

### Added

- Media support: images (with alt text), videos and audio from `media:content` are rendered by default; disable with `media={false}`. Sensitive media is wrapped in a collapsed `<details>`.
- `tags` prop to render a hashtag list from `category` elements.
- New `ClassList` keys: `toot__media`, `toot__media__item`, `toot__tags`, `toot__tag`.
- `asmarss/types` export so `ClassList` can be imported.
- 10 second timeout on the feed request.
- `npm run check` (`astro check`) in CI; `engines.node >= 18`.

### Fixed

- A negative `limit` no longer drops posts from the end; it renders none.
- README still listed `rss-parser` as a dependency.

## 0.2.0

### Added

- `limit` prop to cap the number of rendered posts.
- `separator` prop (correct spelling); `seperator` is kept as a deprecated alias.
- Exported `ClassList` type shared by all components.
- Tests (vitest + Astro container API) and GitHub Actions CI.

### Changed

- Replaced `rss-parser` with the built-in `fetch` and `fast-xml-parser`.
- `astro` is now a peer dependency (`>=4`); package publishes only `src/` via `files`/`exports`.
- Posts with a missing or invalid date no longer render `Invalid Date`; dates use a `<time>` element.
- Updated prettier and prettier-plugin-astro.

### Fixed

- README documented `seperate`, which never matched the actual prop.
