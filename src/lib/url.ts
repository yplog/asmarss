/** Only http(s) URLs are allowed; anything else (e.g. `javascript:`) becomes "". */
export function safeUrl(value: string): string {
  const raw = value.trim();
  try {
    const { protocol } = new URL(raw);
    return protocol === "http:" || protocol === "https:" ? raw : "";
  } catch {
    return "";
  }
}

/** Whether `url` is https and on the same origin as `base`. */
export function isSameOriginHttps(url: string, base: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" && parsed.origin === new URL(base).origin
    );
  } catch {
    return false;
  }
}
