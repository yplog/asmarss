export type ClassList = {
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

export type FeedMedia = {
  url: string;
  type: string;
  medium: string;
  description: string;
  sensitive: boolean;
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
