# astro-fedifeed

[![npm version](https://img.shields.io/npm/v/astro-fedifeed)](https://www.npmjs.com/package/astro-fedifeed)

An Astro component that renders the latest posts of a fediverse account from its
public RSS / Atom feed: Mastodon and Pixelfed accounts, and PeerTube accounts and
channels. No API calls and no tokens.

> Formerly `asmarss`. See [Migrating from asmarss](#migrating-from-asmarss).

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/yplog/astro-fedifeed/tree/main/example)

<img src="https://raw.githubusercontent.com/yplog/astro-fedifeed/main/.github/assets/demo.jpg" alt="astro-fedifeed rendering the latest post of a Mastodon account, a Pixelfed account and a PeerTube channel side by side">

## Installation

In your Astro project, run:

```bash
npm i astro-fedifeed
```

## Usage

| Prop            | Type        | Default   | Description                                                            |
| --------------- | ----------- | --------- | ---------------------------------------------------------------------- |
| `url`           | `string`    | –         | RSS or Atom URL, e.g. `https://instance/@user.rss`                     |
| `account`       | `string`    | –         | Full account name, e.g. `@user@mastodon.social` (instead of `url`)     |
| `channel`       | `string`    | –         | PeerTube video channel, e.g. `@name@instance`                          |
| `instance`      | `string`    | –         | Instance host, e.g. `mastodon.social`; use with `username`             |
| `username`      | `string`    | –         | Account name on the instance, e.g. `user`; use with `instance`         |
| `platform`      | `Platform`  | see below | `"mastodon"`, `"pixelfed"` or `"peertube"`                             |
| `classList`     | `ClassList` | `{}`      | CSS classes to add to the rendered elements                            |
| `limit`         | `number`    | all       | Maximum number of posts to render                                      |
| `separator`     | `boolean`   | `false`   | Render an `<hr>` after each post                                       |
| `media`         | `boolean`   | `true`    | Render attached images (with alt text), videos and audio               |
| `tags`          | `boolean`   | `false`   | Render a hashtag list linking to the instance's tag pages              |
| `labels`        | `Labels`    | English   | Override the built-in texts (see below)                                |
| `locale`        | `string`    | –         | BCP 47 locale for dates, e.g. `tr-TR`                                  |
| `timeZone`      | `string`    | –         | IANA time zone for dates, e.g. `Europe/Istanbul`                       |
| `header`        | `boolean`   | `false`   | Render the feed's avatar, title and description                        |
| `onlyWithMedia` | `boolean`   | `false`   | Only show posts with attachments (Mastodon only)                       |
| `tag`           | `string`    | –         | Only show posts with this hashtag, `astro` or `#astro` (Mastodon only) |
| `replies`       | `boolean`   | `false`   | Include replies (Mastodon account sources only; ignored with `tag`)    |
| `sanitize`      | `boolean`   | `true`    | Strip unsafe markup from post content (see Security)                   |
| `cacheTtl`      | `number`    | `0`       | Cache the parsed feed in memory for this many seconds                  |
| `retries`       | `number`    | `0`       | Retry network errors, 5xx and 429 this many times                      |
| `timeout`       | `number`    | `10000`   | Request timeout in milliseconds                                        |
| `onError`       | `function`  | –         | `(error, url) => void`, replaces the default `console.warn`            |

> `seperator` (the old, misspelled name) still works but is deprecated.

For example css file:

```css
.global-text-color {
  color: #000;
}

.global-font-size {
  font-size: 1.5rem;
}
```

The account can be given in three ways. If more than one is set, `url` wins, then
`account`, then `channel`, then `instance` + `username`:

```html
<FediFeed account="@username@mastodon.instance" />
<FediFeed instance="mastodon.instance" username="username" />
<FediFeed url="https://mastodon.instance/@username.rss" />
```

In your Astro file:

```html
---
import FediFeed from 'astro-fedifeed';
---

<FediFeed url={"https://mastodon-instance/@username.rss"} />

<FediFeed
  url={"https://mastodon.instance/@username.rss"}
  classList={{
    post__content: "global-text-color global-font-size",
  }}
  separator={true} />
```

ClassList is an object that contains the classes you want to add to the component, the default value is:

```ts
type ClassList = {
  feed?: string; // the class of the root section
  feed__list?: string; // the class of the post list (ul)
  feed__item?: string; // the class of each list item (li)
  separator?: string; // the class of the hr element
  error_loading_feed?: string; // the class of the error message
  no_items_in_feed?: string; // the class of the no items message
  see_more?: string; // the class of the see more link
  feed__header?: string; // the class of the feed header (header prop)
  feed__avatar?: string; // the class of the feed avatar
  feed__title?: string; // the class of the feed title
  feed__description?: string; // the class of the feed description
  post?: string; // the class of each post (article)
  post__author?: string; // the class of the author line (merged feeds)
  post__author__avatar?: string; // the class of the author avatar
  post__author__name?: string; // the class of the author name
  post__header?: string; // the class of the post header
  post__header__date?: string; // the class of the post date
  post__title?: string; // the class of the post title (PeerTube)
  post__thumbnail?: string; // the class of the video thumbnail (PeerTube)
  post__content?: string; // the class of the post content
  post__media?: string; // the class of the media wrapper
  post__media__item?: string; // the class of each img/video/audio
  post__tags?: string; // the class of the hashtag list
  post__tag?: string; // the class of each hashtag item
  post__footer?: string; // the class of the post footer
  post__footer__link?: string; // the class of the post footer link
};
```

The type can be imported in TypeScript:

```ts
import type { ClassList } from "astro-fedifeed/types";
```

Posts marked as sensitive on Mastodon have their media wrapped in a collapsed `<details>` element.

## Localization

All texts can be overridden with `labels`; dates follow `locale` and `timeZone`
(without them the default `Sat Oct 04 2025 at 11:00 AM` format is kept):

```html
<FediFeed
  url={"https://mastodon.instance/@username.rss"}
  locale="tr-TR"
  timeZone="Europe/Istanbul"
  labels={{
    seeMore: "Devamı",
    viewOnMastodon: "Mastodon'da gör",
    viewOnPixelfed: "Pixelfed'de gör",
    viewOnPeerTube: "PeerTube'da izle",
    errorLoadingFeed: "Akış yüklenemedi",
    noItemsInFeed: "Gönderi yok",
    sensitiveContent: "Hassas içerik",
  }} />
```

```ts
import type { Labels } from "astro-fedifeed/types";
```

## Pixelfed and PeerTube

Set `platform` to build the right feed address from `account` or
`instance` + `username`. With `url` the platform is guessed from the address
(`/users/<user>.atom` is Pixelfed, `/feeds/videos.xml` is PeerTube, anything else
Mastodon), and `platform` overrides the guess. `channel` is PeerTube only.

```html
<FediFeed platform="pixelfed" account="@user@pixelfed.social" tags />
<FediFeed platform="peertube" account="@blender@video.blender.org" />
<FediFeed channel="@blender_studio@video.blender.org" />
<FediFeed
  url="https://video.blender.org/feeds/videos.xml?videoChannelName=blender_studio"
/>
```

- **Pixelfed** (`/users/<user>.atom`): the images are rendered from the feed's
  media, so the copies Pixelfed puts at the top of the caption are removed, and
  hashtags are read from the caption and link to `/discover/tags/<tag>`.
- **PeerTube** (`/feeds/videos.xml?accountName=…` or `?videoChannelName=…`): each
  video shows its title and thumbnail linking to the video page, followed by the
  description. Video files aren't embedded (`media={false}` hides the thumbnail).
  PeerTube's categories aren't hashtags, so `tags` renders nothing.

`onlyWithMedia`, `tag` and `replies` only exist for Mastodon. On other platforms
they are ignored and reported through `onError` (or `console.warn`).

## Filtering

Mastodon's `@user.rss` feed already leaves out replies and boosts, so there is
nothing to exclude. `onlyWithMedia` and `tag` filter the posts, and `replies` adds
replies back:

```html
<FediFeed account="@username@mastodon.instance" tag="astro" onlyWithMedia />
<FediFeed account="@username@mastodon.instance" replies />
```

With `account` or `instance` + `username` the matching server feed is requested
(`/@user/tagged/astro.rss`, `?only_media=1`, `/with_replies.rss`), so a filter
doesn't run out of the usual 20 posts. The filter is applied again in the
component, which means it also works with `url`. `replies` needs an account source
and is ignored when `tag` is set.

## Header and multiple feeds

`header` renders the avatar, title and description of each feed. Pass an array to
merge several accounts, newest post first. Each post then gets an author line, and
the "See more" link is left out. Feeds that fail are skipped and reported through
`onError`:

```html
<FediFeed
  account={["@a@mastodon.social", "@b@fosstodon.org"]}
  header
  limit={10} />
```

## Caching and errors

With `cacheTtl` the parsed feed is kept in memory per URL. Once it expires, the
next request revalidates it with `ETag` / `Last-Modified`, and a `304` reuses the
cached copy. If a refresh fails, the stale copy is served instead of an error.

Failures are logged with `console.warn("[astro-fedifeed] Failed to load <url>: …")`;
pass `onError` to handle them yourself (the component still renders the error
message, unless a stale cached copy exists). Configuration warnings, such as a
Mastodon-only option on Pixelfed, are logged as `[astro-fedifeed] <message>` or passed
to `onError` the same way.

## Headless usage

`astro-fedifeed/feed` exposes the parser, so you can render the posts yourself:

<!-- prettier-ignore -->
```astro
---
import { parseFeed, formatDate } from "astro-fedifeed/feed";

const { items } = await parseFeed("https://mastodon.instance/@username.rss");
---

{items === null ? (
  <p>Could not load the feed.</p>
) : (
  <ul>
    {items.map((item) => (
      <li>
        <time>{formatDate(new Date(item.pubDate), { locale: "en-GB" })}</time>
        <div set:html={item.content} />
        {item.media.map((m) => <img src={m.url} alt={m.description} />)}
      </li>
    ))}
  </ul>
)}
```

`items` is `null` when the request fails or the feed is invalid. Both RSS and Atom
are parsed. Each entry has `link`, `pubDate`, `content` (HTML), `media` and `tags`,
plus `title` and `thumbnail` when the feed has them. `parseFeed` accepts
`{ timeoutMs, cacheTtlMs, retries, retryDelayMs, onError }` as a second argument.
`parseFeeds([url1, url2], options)` merges feeds the same way as the component
(`{ items, feeds }`, each item has a `source`), and `filterItems(items, { onlyWithMedia, tag })`
applies the filters. `ParsedFeed` also has `title`, `description` and `image`.
`mastodonFeedUrl("@user@instance", { tag, onlyMedia, replies })` (or `mastodonFeedUrl("instance", "user")`) builds the
RSS address and returns `null` for invalid input; `pixelfedFeedUrl("@user@instance")` and
`peertubeFeedUrl("@name@instance", { channel })` do the same for the other platforms.
`detectPlatform(url)` guesses the platform of a feed address, and
`normalizeEntry(item, platform)` applies the Pixelfed / PeerTube clean-up the
component does. `clearFeedCache()` empties the cache, and `sanitizeContent(html)` is the same
sanitizer the component uses: apply it before `set:html` when rendering `item.content` yourself.

## Requirements

`astro` >= 6 is a peer dependency and Node.js >= 24 is required. The feed is fetched on the server at build/render time using the built-in `fetch` (10 second timeout).

## Security

Post content is rendered as HTML (`set:html`) after being sanitized with [sanitize-html](https://github.com/apostrophecms/sanitize-html): only the markup Mastodon produces (paragraphs, links, lists, quotes, code) is kept, links get `rel="nofollow noopener noreferrer"` and `target="_blank"`, and only `http`, `https` and `mailto` URLs survive. Set `sanitize={false}` to render the content as is, and only do that for instances you trust.

## Example

[`example/`](example) is a small Astro project that renders live posts from
mastodon.social, pixelfed.social and video.blender.org: a Mastodon account, a
Pixelfed account and a PeerTube channel side by side (the screenshot above), then a
tag filter and merged feeds.
Open it in StackBlitz with the badge above, or run it locally:

```bash
cd example
npm install
npm run dev
```

## Migrating from asmarss

1. Replace the package: `npm uninstall asmarss && npm i astro-fedifeed`.
2. Update the imports: `asmarss` → `astro-fedifeed`, `asmarss/feed` →
   `astro-fedifeed/feed`, `asmarss/types` → `astro-fedifeed/types`. The component
   is the default export, so it can keep any local name.
3. Rename the `classList` keys that start with `toot` to `post` (`toot__content`
   → `post__content`). The old keys still work for now and log a one-time
   deprecation warning.
4. Log messages are prefixed with `[astro-fedifeed]` instead of `[asmarss]`.
5. Node.js >= 24 and `astro` >= 6 are required.

## Contributing

If you would like to contribute to this project, please follow the steps below:

- Fork this project.
- Create a new branch: git checkout -b my-new-feature.
- Make changes and commit them: git commit -am 'Add some feature'.
- Push to the branch: git push origin my-new-feature.
- Run `npm run format`, `npm run lint` and `npm test` before opening the pull request.
- Create a new pull request (PR).

## License

This project is licensed under the MIT License. Please refer to the license file for details.

## Dependencies

- [sanitize-html](https://github.com/apostrophecms/sanitize-html) - Cleans post content before it is rendered.
- [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) - A fast XML parser, used to read the RSS and Atom feeds.
