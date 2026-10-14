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
