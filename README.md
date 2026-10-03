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
  separator?: string; // the class of the hr element
  error_loading_feed?: string; // the class of the error message
  no_items_in_feed?: string; // the class of the no items message
  see_more?: string; // the class of the see more link
  toot?: string; // the class of the toot
  toot__header?: string; // the class of the toot header
  toot__header__date?: string; // the class of the toot date
  toot__content?: string; // the class of the toot content
  toot__footer?: string; // the class of the toot footer
  toot__footer__link?: string; // the class of the toot footer link
};
```

## Requirements

`astro` >= 4 is a peer dependency. The feed is fetched on the server at build/render time using the built-in `fetch`.

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

- [rss-parser](https://github.com/rbren/rss-parser#readme) - A small library for turning RSS XML feeds into JavaScript objects.
