export type FormatDateOptions = {
  locale?: string;
  timeZone?: string;
};

/**
 * Without `locale`/`timeZone` the legacy format is kept
 * ("Sat Oct 04 2025 at 11:00 AM"); otherwise `Intl.DateTimeFormat` is used.
 */
export function formatDate(
  date: Date,
  { locale, timeZone }: FormatDateOptions = {},
): string {
  if (locale || timeZone) {
    try {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone,
      }).format(date);
    } catch {
      // invalid locale or time zone: fall back to the default format
    }
  }

  const time = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date.toDateString()} at ${time}`;
}
