# Changelog

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
