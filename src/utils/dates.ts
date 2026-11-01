/**
 * Parsing and rendering API date values without shifting the day.
 *
 * The API sends two shapes, and they must be parsed differently:
 *
 *   date-only   "1985-04-12"            a calendar date (toDateOnly server-side)
 *   datetime    "2026-09-13 09:56:38"   already converted to the viewer's zone
 *                                       by toTimezone server-side
 *
 * `new Date("1985-04-12")` is specified to parse as **UTC midnight**, so
 * rendering it with toLocaleDateString() shows the previous day anywhere behind
 * UTC — 12 April becomes 11 April in Chicago. Appending a time makes the engine
 * parse it as local midnight instead, which is what a calendar date means.
 *
 * The datetime shape has no zone marker and is already local, so a plain parse
 * is correct for it.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse an API date value into a Date that represents the intended local day.
 */
export const parseApiDate = (value?: string | null): Date | null => {
    if (!value) return null;

    const raw = String(value).trim();

    // A bare calendar date: pin it to local midnight so the day cannot move.
    const normalised = DATE_ONLY.test(raw)
        ? `${raw}T00:00:00`
        : raw.includes('T') ? raw : raw.replace(' ', 'T');

    const date = new Date(normalised);

    return Number.isNaN(date.getTime()) ? null : date;
};

/** True when the value is a calendar date with no time component. */
export const isDateOnly = (value?: string | null): boolean =>
    !!value && DATE_ONLY.test(String(value).trim());

/**
 * Render an API date value. Falls back to the raw string when unparseable, so a
 * value in an unexpected shape is shown rather than swallowed.
 */
export const formatApiDate = (
    value?: string | null,
    withTime = false,
    fallback: string | null = null
): string | null => {
    if (!value) return fallback;

    const date = parseApiDate(value);
    if (!date) return String(value);

    // A calendar date has no time to show, whatever the caller asked for.
    const showTime = withTime && !isDateOnly(value);

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        ...(showTime ? { hour: 'numeric', minute: '2-digit' } : {}),
    });
};

const RELATIVE_TIME = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/**
 * "Just now", "5 minutes ago", "3 hours ago", "yesterday", "4 days ago" for the
 * last week, then the date ("Sep 1, 2026"). For datetimes with a zone (ISO
 * 8601 with offset, as the notifications API sends them).
 */
export const formatRelativeTime = (value?: string | null, now: Date = new Date()): string => {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return RELATIVE_TIME.format(-Math.floor(seconds / 60), 'minute');
    if (seconds < 86400) return RELATIVE_TIME.format(-Math.floor(seconds / 3600), 'hour');
    if (seconds < 7 * 86400) return RELATIVE_TIME.format(-Math.floor(seconds / 86400), 'day');

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * A picked calendar date as "YYYY-MM-DD" for an API filter, read in the
 * viewer's own zone. Not `toISOString().split('T')[0]`: that is the UTC day, so
 * east of UTC local midnight falls on the previous day - picking 19 Oct in
 * Dhaka (UTC+6) sent 18 Oct.
 */
export const toLocalYmd = (date?: Date | string | null): string | null => {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** A Date as local "YYYY-MM-DD HH:mm:ss", the shape the activity API takes. */
export const toLocalDateTimeString = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${toLocalYmd(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

/**
 * The value for a date-time picker's onChange (BUG-057). Clicking a day in the
 * panel gives that day at midnight, so the previously chosen time is kept; a
 * date typed into the input already carries its own time, so it is used as-is.
 */
export const mergePickedDateTime = (
  picked: Date | null | undefined,
  previous: Date | null | undefined,
  originalEvent?: { target?: EventTarget | null } | null
): Date | null => {
  if (!picked) return null;
  const merged = new Date(picked);
  const typed = (originalEvent?.target as HTMLElement | null)?.tagName === 'INPUT';
  if (typed) {
    merged.setSeconds(0, 0);
  } else {
    const prev = previous || new Date();
    merged.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
  }
  return merged;
};
