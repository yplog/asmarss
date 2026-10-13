import sanitizeHtml from "sanitize-html";

const options: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "a",
    "span",
    "ul",
    "ol",
    "li",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "del",
    "s",
    "code",
    "pre",
    "blockquote",
  ],
  allowedAttributes: {
    a: ["href", "rel", "class", "target"],
    span: ["class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      rel: "nofollow noopener noreferrer",
      target: "_blank",
    }),
  },
};

/** Strips everything but the markup Mastodon produces (links, lists, quotes, code…). */
export function sanitizeContent(html: string): string {
  return sanitizeHtml(html, options);
}
