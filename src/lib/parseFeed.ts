import { XMLParser } from "fast-xml-parser";
import type { ParsedFeed } from "../types";

const parser = new XMLParser({
  isArray: (name) => name === "item",
});

export async function parseFeed(url: string): Promise<ParsedFeed> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const channel = parser.parse(await res.text())?.rss?.channel;
    if (!channel) throw new Error("Invalid RSS feed");

    const items = (channel.item ?? []).map((item: Record<string, unknown>) => ({
      link: String(item.link ?? ""),
      pubDate: String(item.pubDate ?? ""),
      content: String(item.description ?? ""),
    }));

    return { items, link: channel.link ? String(channel.link) : null };
  } catch {
    return { items: null, link: null };
  }
}
