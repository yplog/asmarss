# asmarss

[![npm version](https://badge.fury.io/js/asmarss.svg)](https://badge.fury.io/js/asmarss)

A package that enables tracking the most recent posts of a Mastodon account and rendering them as an RSS feed in a Astro Component.

## Installation

In your Astro project, run:

```bash
npm i asmarss
```

## Usage

| Prop            | Type        | Default | Description                                                        |
| --------------- | ----------- | ------- | ------------------------------------------------------------------ |
| `url`           | `string`    | –       | RSS URL of the Mastodon account (`https://instance/@user.rss`)     |
| `account`       | `string`    | –       | Full account name, e.g. `@user@mastodon.social` (instead of `url`) |
| `instance`      | `string`    | –       | Instance host, e.g. `mastodon.social`; use with `username`         |
| `username`      | `string`    | –       | Account name on the instance, e.g. `user`; use with `instance`     |
| `classList`     | `ClassList` | `{}`    | CSS classes to add to the rendered elements                        |
| `limit`         | `number`    | all     | Maximum number of posts to render                                  |
| `separator`     | `boolean`   | `false` | Render an `<hr>` after each post                                   |
| `media`         | `boolean`   | `true`  | Render attached images (with alt text), videos and audio           |
| `tags`          | `boolean`   | `false` | Render a hashtag list linking to the instance's tag pages          |
| `labels`        | `Labels`    | English | Override the built-in texts (see below)                            |
| `locale`        | `string`    | –       | BCP 47 locale for dates, e.g. `tr-TR`                              |
| `timeZone`      | `string`    | –       | IANA time zone for dates, e.g. `Europe/Istanbul`                   |
| `header`        | `boolean`   | `false` | Render the feed's avatar, title and description                    |
| `onlyWithMedia` | `boolean`   | `false` | Only show posts with attachments                                   |
| `tag`           | `string`    | –       | Only show posts with this hashtag (`astro` or `#astro`)            |
| `replies`       | `boolean`   | `false` | Include replies (account sources only; ignored with `tag`)         |
| `sanitize`      | `boolean`   | `true`  | Strip unsafe markup from post content (see Security)               |
| `cacheTtl`      | `number`    | `0`     | Cache the parsed feed in memory for this many seconds              |
| `retries`       | `number`    | `0`     | Retry network errors, 5xx and 429 this many times                  |
| `timeout`       | `number`    | `10000` | Request timeout in milliseconds                                    |
| `onError`       | `function`  | –       | `(error, url) => void`, replaces the default `console.warn`        |

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
`account`, then `instance` + `username`:

```html
<Asmarss account="@username@mastodon.instance" />
<Asmarss instance="mastodon.instance" username="username" />
<Asmarss url="https://mastodon.instance/@username.rss" />
```

In your Astro file:

```html
---
import Asmarss from 'asmarss';
---

<Asmarss url={"https://mastodon-instance/@username.rss"} />

<Asmarss
  url={"https://mastodon.instance/@username.rss"}
  classList={{
    toot__content: "global-text-color global-font-size",
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
  toot?: string; // the class of the toot
  toot__author?: string; // the class of the author line (merged feeds)
  toot__author__avatar?: string; // the class of the author avatar
  toot__author__name?: string; // the class of the author name
  toot__header?: string; // the class of the toot header
  toot__header__date?: string; // the class of the toot date
  toot__content?: string; // the class of the toot content
  toot__media?: string; // the class of the media wrapper
  toot__media__item?: string; // the class of each img/video/audio
  toot__tags?: string; // the class of the hashtag list
  toot__tag?: string; // the class of each hashtag item
  toot__footer?: string; // the class of the toot footer
  toot__footer__link?: string; // the class of the toot footer link
};
```

The type can be imported in TypeScript:

```ts
import type { ClassList } from "asmarss/types";
```

Posts marked as sensitive on Mastodon have their media wrapped in a collapsed `<details>` element.

## Localization

All texts can be overridden with `labels`; dates follow `locale` and `timeZone`
(without them the default `Sat Oct 04 2025 at 11:00 AM` format is kept):

```html
<Asmarss
  url={"https://mastodon.instance/@username.rss"}
  locale="tr-TR"
  timeZone="Europe/Istanbul"
  labels={{
    seeMore: "Devamı",
    viewOnMastodon: "Mastodon'da gör",
    errorLoadingFeed: "Akış yüklenemedi",
    noItemsInFeed: "Gönderi yok",
    sensitiveContent: "Hassas içerik",
  }} />
```

```ts
import type { Labels } from "asmarss/types";
```

## Filtering

Mastodon's `@user.rss` feed already leaves out replies and boosts, so there is
nothing to exclude. `onlyWithMedia` and `tag` filter the posts, and `replies` adds
replies back:

```html
<Asmarss account="@username@mastodon.instance" tag="astro" onlyWithMedia />
<Asmarss account="@username@mastodon.instance" replies />
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
<Asmarss
  account={["@a@mastodon.social", "@b@fosstodon.org"]}
  header
  limit={10} />
```

## Caching and errors

With `cacheTtl` the parsed feed is kept in memory per URL. Once it expires, the
next request revalidates it with `ETag` / `Last-Modified`, and a `304` reuses the
cached copy. If a refresh fails, the stale copy is served instead of an error.

Failures are logged with `console.warn("[asmarss] Failed to load <url>: …")`;
pass `onError` to handle them yourself (the component still renders the error
message, unless a stale cached copy exists).

## Headless usage

`asmarss/feed` exposes the parser, so you can render the posts yourself:

<!-- prettier-ignore -->
```astro
---
import { parseFeed, formatDate } from "asmarss/feed";

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

`items` is `null` when the request fails or the feed is invalid. Each entry has
`link`, `pubDate`, `content` (HTML), `media` and `tags`. `parseFeed` accepts
`{ timeoutMs, cacheTtlMs, retries, retryDelayMs, onError }` as a second argument.
`parseFeeds([url1, url2], options)` merges feeds the same way as the component
(`{ items, feeds }`, each item has a `source`), and `filterItems(items, { onlyWithMedia, tag })`
applies the filters. `ParsedFeed` also has `title`, `description` and `image`.
`mastodonFeedUrl("@user@instance", { tag, onlyMedia, replies })` (or `mastodonFeedUrl("instance", "user")`) builds the
RSS address and returns `null` for invalid input. `clearFeedCache()` empties the cache, and `sanitizeContent(html)` is the same
sanitizer the component uses: apply it before `set:html` when rendering `item.content` yourself.

## Requirements

`astro` >= 4 is a peer dependency and Node.js >= 22 is required. The feed is fetched on the server at build/render time using the built-in `fetch` (10 second timeout).

## Security

Post content is rendered as HTML (`set:html`) after being sanitized with [sanitize-html](https://github.com/apostrophecms/sanitize-html): only the markup Mastodon produces (paragraphs, links, lists, quotes, code) is kept, links get `rel="nofollow noopener noreferrer"` and `target="_blank"`, and only `http`, `https` and `mailto` URLs survive. Set `sanitize={false}` to render the content as is, and only do that for instances you trust.

## Contributing

If you would like to contribute to this project, please follow the steps below:

- Fork this project.
- Create a new branch: git checkout -b my-new-feature.
- Make changes and commit them: git commit -am 'Add some feature'.
- Push to the branch: git push origin my-new-feature.
- Create a new pull request (PR).

## License

This project is licensed under the MIT License. Please refer to the license file for details.

## Dependencies

- [sanitize-html](https://github.com/apostrophecms/sanitize-html) - Cleans post content before it is rendered.
- [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) - A fast XML parser, used to read the RSS feed.
