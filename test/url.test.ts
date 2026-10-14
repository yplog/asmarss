import { describe, expect, it } from "vitest";
import { isSameOriginHttps, safeUrl } from "../src/lib/url";

describe("safeUrl", () => {
  it("keeps http(s) URLs and drops everything else", () => {
    expect(safeUrl(" https://a.example/x ")).toBe("https://a.example/x");
    expect(safeUrl("http://a.example/")).toBe("http://a.example/");
    expect(safeUrl("javascript:alert(1)")).toBe("");
    expect(safeUrl("not a url")).toBe("");
  });
});

describe("isSameOriginHttps", () => {
  const base = "https://tube.example/w/x";

  it("accepts https URLs on the base origin", () => {
    expect(isSameOriginHttps("https://tube.example/videos/embed/x", base)).toBe(
      true,
    );
  });

  it("rejects other origins, http and unparsable input", () => {
    expect(isSameOriginHttps("https://evil.example/embed/x", base)).toBe(false);
    expect(isSameOriginHttps("http://tube.example/embed/x", base)).toBe(false);
    expect(isSameOriginHttps("not a url", base)).toBe(false);
    expect(isSameOriginHttps("https://tube.example/x", "")).toBe(false);
  });
});
