/** Receives load failures and misconfigurations instead of `console.warn`. */
export type ErrorHandler = (error: unknown, url: string) => void;

/** Hands the failure to `onError`, or logs it when there is none. */
export function reportError(
  error: unknown,
  url: string,
  onError?: ErrorHandler,
): void {
  if (onError) onError(error, url);
  else console.warn(`[astro-fedifeed] Failed to load ${url}:`, error);
}

/** Like `reportError`, for a misconfiguration that doesn't stop the feed from loading. */
export function reportWarning(
  message: string,
  url: string,
  onError?: ErrorHandler,
): void {
  if (onError) onError(new Error(message), url);
  else console.warn(`[astro-fedifeed] ${message}${url ? ` (${url})` : ""}`);
}
