# asmarss

[![npm version](https://badge.fury.io/js/asmarss.svg)](https://badge.fury.io/js/asmarss)

A package that enables tracking the most recent posts of a Mastodon account and rendering them as an RSS feed in a Astro Component.

## Installation

In your Astro project, run:

```bash
npm i asmarss
```

## Usage

| Prop        | Type        | Default | Description                                                    |
| ----------- | ----------- | ------- | -------------------------------------------------------------- |
| `url`       | `string`    | –       | RSS URL of the Mastodon account (`https://instance/@user.rss`) |
| `classList` | `ClassList` | `{}`    | CSS classes to add to the rendered elements                    |
| `limit`     | `number`    | all     | Maximum number of posts to render                              |
| `separator` | `boolean`   | `false` | Render an `<hr>` after each post                               |
| `media`     | `boolean`   | `true`  | Render attached images (with alt text), videos and audio       |
| `tags`      | `boolean`   | `false` | Render a hashtag list linking to the instance's tag pages      |
| `labels`    | `Labels`    | English | Override the built-in texts (see below)                        |
| `locale`    | `string`    | –       | BCP 47 locale for dates, e.g. `tr-TR`                          |
| `timeZone`  | `string`    | –       | IANA time zone for dates, e.g. `Europe/Istanbul`               |

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
  toot?: string; // the class of the toot
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
`{ timeoutMs }` as a second argument.

## Requirements

`astro` >= 4 is a peer dependency and Node.js >= 22 is required. The feed is fetched on the server at build/render time using the built-in `fetch` (10 second timeout).

## Security

Post content is rendered as raw HTML (`set:html`). Mastodon sanitizes it on the server side, but only point `url` at instances you trust.

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

- [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) - A fast XML parser, used to read the RSS feed.
