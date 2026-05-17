/**
 * Formatting + sanitisation helpers for second-precision durations.
 *
 * Durations across the app are stored as floating-point seconds with no
 * upper bound. Helpers here keep IEEE float drift out of displays and
 * automatically switch to milliseconds for sub-second values so short
 * intervals (0.5s, 0.1s) stay readable instead of getting rounded up to
 * "1s" or rendered with awkward decimals.
 */

/**
 * Sanitise a free-form decimal: ensures finite, at least `min`, and strips
 * IEEE float drift (e.g. 0.1 + 0.2 → 0.30000000000000004 → 0.3) by
 * round-tripping through 3 decimal places. No upper bound is imposed —
 * the user is free to enter very large second values.
 */
export function cleanSec(n: unknown, min = 0): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  const clamped = Math.max(min, v);
  return Number.parseFloat(clamped.toFixed(3));
}

/**
 * Bare decimal display ("4", "0.5", "0.1") — used as input field values
 * where attaching units would prevent the user from editing.
 */
export function fmtSec(n: number): string {
  return cleanSec(n).toString();
}

/**
 * Unit-suffixed label that switches to milliseconds for sub-second
 * values: 0.5 → "500ms", 0.1 → "100ms", 4 → "4s", 1.5 → "1.5s".
 */
export function fmtSecLabel(n: number): string {
  const v = cleanSec(n);
  if (v > 0 && v < 1) return `${Math.round(v * 1000)}ms`;
  return `${fmtSec(v)}s`;
}

/**
 * Long-form duration: "1h 2m 30s", "1m 14.4s", "500ms", "0s".
 *
 * Float drift is stripped before splitting into hours/minutes/seconds,
 * and the seconds component switches to ms when sub-second so we never
 * show e.g. "1m 0.5s" — that becomes "1m 500ms".
 */
export function fmtDuration(seconds: number): string {
  const total = cleanSec(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = cleanSec(total % 60);
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) {
    if (s > 0 && s < 1) parts.push(`${Math.round(s * 1000)}ms`);
    else parts.push(`${fmtSec(s)}s`);
  }
  return parts.join(" ");
}

/**
 * Big-countdown label inside the orb. For phases ≥ 1s we render ceil-seconds
 * (matching the classic "3 · 2 · 1" countdown). For sub-second phases we
 * switch to milliseconds, snapped to 100ms steps so the number doesn't
 * jitter every animation frame.
 */
export function fmtPhaseRemaining(remaining: number, duration: number): string {
  if (duration > 0 && duration < 1) {
    const ms = Math.max(0, Math.ceil(remaining * 10) * 100);
    return `${ms}ms`;
  }
  return String(Math.max(1, Math.ceil(remaining)));
}
