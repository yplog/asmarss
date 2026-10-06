export type ClassList = {
  feed?: string;
  feed__list?: string;
  feed__item?: string;
  separator?: string;
  error_loading_feed?: string;
  no_items_in_feed?: string;
  see_more?: string;
  toot?: string;
  toot__header?: string;
  toot__header__date?: string;
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

export type FeedEntry = {
  link: string;
  pubDate: string;
  content: string;
  media: FeedMedia[];
  tags: string[];
};

export type ParsedFeed = {
  items: FeedEntry[] | null;
  link: string | null;
};
