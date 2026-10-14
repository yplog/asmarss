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
  toot?: string;
  toot__author?: string;
  toot__author__avatar?: string;
  toot__author__name?: string;
  toot__header?: string;
  toot__header__date?: string;
  toot__title?: string;
  toot__thumbnail?: string;
  toot__content?: string;
  toot__media?: string;
  toot__media__item?: string;
  toot__tags?: string;
  toot__tag?: string;
  toot__footer?: string;
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
