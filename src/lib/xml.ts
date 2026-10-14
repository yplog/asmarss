import { XMLParser } from "fast-xml-parser";
import type { FeedEntry, FeedMedia, ParsedFeed } from "../types";
import { safeUrl } from "./url";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // Decode numeric character references such as Pixelfed's `&#039;`.
  htmlEntities: true,
  isArray: (name) =>
    name === "item" ||
    name === "entry" ||
    name === "media:content" ||
    name === "media:thumbnail" ||
    name === "category",
});

type Raw = Record<string, unknown>;

function text(value: unknown): string {
  if (value && typeof value === "object") {
    return text((value as Raw)["#text"]);
  }
  return value == null ? "" : String(value);
}

/** An http(s) URL from an XML value, or "". */
const xmlUrl = (value: unknown) => safeUrl(text(value));

function firstThumbnail(raw: Raw): string {
  return xmlUrl(
    ((raw["media:thumbnail"] as Raw[] | undefined) ?? [])[0]?.["@_url"],
  );
}

/**
 * Atom `<link>`: a single element or a list, with `rel` missing or
 * "alternate" for the HTML page.
 */
function atomLink(value: unknown): string {
  const links = ([] as unknown[]).concat(value ?? []) as Raw[];
  const alternate = links.find((l) => {
    const rel = text(l?.["@_rel"]);
    return !rel || rel === "alternate";
  });
  return xmlUrl(alternate?.["@_href"]);
}

function parseMedia(raw: Raw): FeedMedia | null {
  const url = xmlUrl(raw["@_url"]);
  if (!url) return null;

  const type = text(raw["@_type"]);
  const mimeMedium = type.split("/")[0];
  // The MIME type wins for video/audio: gifv is published as medium="image"
  // with type="video/mp4".
  const medium =
    mimeMedium === "video" || mimeMedium === "audio"
      ? mimeMedium
      : text(raw["@_medium"]) || mimeMedium;
  const thumbnail = firstThumbnail(raw);

  return {
    url,
    type,
    medium,
    description: text(raw["media:description"]),
    sensitive: text(raw["media:rating"]) === "adult",
    ...(thumbnail && { thumbnail }),
  };
}

function parseMediaList(item: Raw): FeedMedia[] {
  return ((item["media:content"] as Raw[] | undefined) ?? [])
    .map(parseMedia)
    .filter((m): m is FeedMedia => m !== null);
}

/** Post-level fields shared by RSS items and Atom entries. */
function entry(
  item: Raw,
  fields: Pick<FeedEntry, "link" | "pubDate" | "content" | "tags">,
): FeedEntry {
  const title = text(item.title).trim();
  const thumbnail = firstThumbnail(item);
  const embed = xmlUrl((item["media:embed"] as Raw | undefined)?.["@_url"]);
  return {
    ...fields,
    media: parseMediaList(item),
    ...(title && { title }),
    ...(thumbnail && { thumbnail }),
    ...(embed && { embed }),
  };
}

function parseItem(item: Raw): FeedEntry {
  return entry(item, {
    link: xmlUrl(item.link),
    pubDate: text(item.pubDate),
    // PeerTube puts a shortened text in `description` and the full HTML here.
    content: text(item["content:encoded"]) || text(item.description),
    tags: ((item.category as unknown[] | undefined) ?? [])
      .map(text)
      .filter(Boolean),
  });
}

function parseEntry(item: Raw): FeedEntry {
  return entry(item, {
    link: atomLink(item.link),
    pubDate: text(item.published) || text(item.updated),
    content: (text(item.content) || text(item.summary)).trim(),
    tags: ((item.category as Raw[] | undefined) ?? [])
      .map((c) => text(c?.["@_term"]))
      .filter(Boolean),
  });
}

/** Parses an RSS or Atom document; throws when it is neither. */
export function parseXml(xml: string): ParsedFeed {
  const doc = parser.parse(xml);

  const channel = doc?.rss?.channel;
  if (channel) {
    return {
      items: ((channel.item as Raw[] | undefined) ?? []).map(parseItem),
      link: xmlUrl(channel.link) || null,
      title: text(channel.title) || null,
      description: text(channel.description) || null,
      image: xmlUrl(channel.image?.url) || null,
    };
  }

  const feed = doc?.feed;
  if (feed && typeof feed === "object") {
    return {
      items: ((feed.entry as Raw[] | undefined) ?? []).map(parseEntry),
      link: atomLink(feed.link) || null,
      title: text(feed.title) || null,
      description: text(feed.subtitle) || null,
      // PeerTube's `icon` is the instance logo; `logo` is the avatar.
      image: xmlUrl(feed.logo) || xmlUrl(feed.icon) || null,
    };
  }

  throw new Error("Invalid RSS or Atom feed");
}
