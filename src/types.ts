export type ClassList = {
  feed?: string;
  feed__list?: string;
  feed__item?: string;
  separator?: string;
  error_loading_feed?: string;
  no_items_in_feed?: string;
  see_more?: string;
  feed__header?: string;
  feed__avatar?: string;
  feed__title?: string;
  feed__description?: string;
  post?: string;
  post__author?: string;
  post__author__avatar?: string;
  post__author__name?: string;
  post__header?: string;
  post__header__date?: string;
  post__title?: string;
  post__thumbnail?: string;
  post__content?: string;
  post__media?: string;
  post__media__item?: string;
  post__tags?: string;
  post__tag?: string;
  post__footer?: string;
  post__footer__link?: string;
  /** @deprecated Use `post`. */
  toot?: string;
  /** @deprecated Use `post__author`. */
  toot__author?: string;
  /** @deprecated Use `post__author__avatar`. */
  toot__author__avatar?: string;
  /** @deprecated Use `post__author__name`. */
  toot__author__name?: string;
  /** @deprecated Use `post__header`. */
  toot__header?: string;
  /** @deprecated Use `post__header__date`. */
  toot__header__date?: string;
  /** @deprecated Use `post__title`. */
  toot__title?: string;
  /** @deprecated Use `post__thumbnail`. */
  toot__thumbnail?: string;
  /** @deprecated Use `post__content`. */
  toot__content?: string;
  /** @deprecated Use `post__media`. */
  toot__media?: string;
  /** @deprecated Use `post__media__item`. */
  toot__media__item?: string;
  /** @deprecated Use `post__tags`. */
  toot__tags?: string;
  /** @deprecated Use `post__tag`. */
  toot__tag?: string;
  /** @deprecated Use `post__footer`. */
  toot__footer?: string;
  /** @deprecated Use `post__footer__link`. */
  toot__footer__link?: string;
};

export type Labels = {
  seeMore?: string;
  viewOnMastodon?: string;
  viewOnPixelfed?: string;
  viewOnPeerTube?: string;
  errorLoadingFeed?: string;
  noItemsInFeed?: string;
  sensitiveContent?: string;
};

export type FeedMedia = {
  url: string;
  type: string;
  medium: string;
  description: string;
  sensitive: boolean;
  thumbnail?: string;
};

/** Where a post came from; set on posts returned by `parseFeeds`. */
export type FeedSource = {
  url: string;
  link: string | null;
  title: string | null;
  image: string | null;
};

export type FeedEntry = {
  link: string;
  /** RSS `pubDate`, or Atom `published` / `updated`. */
  pubDate: string;
  content: string;
  media: FeedMedia[];
  tags: string[];
  /** Post title (PeerTube video title; Pixelfed repeats the caption). Missing on Mastodon. */
  title?: string;
  /** Post-level preview image, e.g. a PeerTube video thumbnail. */
  thumbnail?: string;
  source?: FeedSource;
};

export type ParsedFeed = {
  items: FeedEntry[] | null;
  link: string | null;
  title: string | null;
  description: string | null;
  /** The channel image (the avatar on Mastodon). */
  image: string | null;
};

export type MergedFeed = {
  items: FeedEntry[] | null;
  feeds: (ParsedFeed & { url: string })[];
};
