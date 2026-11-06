import config from "@/business.config";
import { addDays, dateIn, hhmm, minutes, weekdayOf, zonedToUtc } from "./time";

export type Slot = { time: string; iso: string };

/** Open days customers can pick from, today onwards. */
export function bookableDates(): string[] {
  const { timezone, bookAheadDays, closedDates, week } = config.hours;
  const today = dateIn(Date.now(), timezone);
  const out: string[] = [];
  for (let i = 0; i < bookAheadDays; i++) {
    const d = addDays(today, i);
    if (closedDates.includes(d)) continue;
    if (!week[weekdayOf(d)]) continue;
    out.push(d);
  }
  return out;
}

/** Free start times on a date for a service of `duration` minutes. */
export function freeSlots(
  date: string,
  duration: number,
  taken: { start_at: string | null; end_at: string | null }[],
  now = Date.now(),
): Slot[] {
  const { timezone, week, slotStep, minNotice, capacity, closedDates } = config.hours;
  const day = week[weekdayOf(date)];
  if (!day || closedDates.includes(date)) return [];
  const open = minutes(day.open);
  const close = minutes(day.close);
  const earliest = now + minNotice * 60000;
  const out: Slot[] = [];
  for (let m = open; m + duration <= close; m += slotStep) {
    const time = hhmm(m);
    const start = zonedToUtc(date, time, timezone);
    const end = start + duration * 60000;
    if (start < earliest) continue;
    const overlapping = taken.filter(
      (b) => b.start_at && b.end_at && Date.parse(b.start_at) < end && Date.parse(b.end_at) > start,
    ).length;
    if (overlapping >= capacity) continue;
    out.push({ time, iso: new Date(start).toISOString() });
  }
  return out;
}

/** UTC window covering a whole local date, for one database query. */
export function dayWindow(date: string) {
  const tz = config.hours.timezone;
  return {
    from: new Date(zonedToUtc(date, "00:00", tz)).toISOString(),
    to: new Date(zonedToUtc(addDays(date, 1), "00:00", tz)).toISOString(),
  };
}
