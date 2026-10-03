export type ClassList = {
  separator?: string;
  error_loading_feed?: string;
  no_items_in_feed?: string;
  see_more?: string;
  toot?: string;
  toot__header?: string;
  toot__header__date?: string;
  toot__content?: string;
  toot__footer?: string;
  toot__footer__link?: string;
};

export type FeedEntry = {
  link: string;
  pubDate: string;
  content: string;
};

export type ParsedFeed = {
  items: FeedEntry[] | null;
  link: string | null;
};
