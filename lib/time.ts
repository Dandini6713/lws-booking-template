// Timezone helpers with no dependencies. Everything is stored in UTC and shown in the business timezone.

function partsIn(ms: number, tz: string) {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const o: Record<string, string> = {};
  for (const p of f.formatToParts(new Date(ms))) o[p.type] = p.value;
  return o;
}

function offsetMs(ms: number, tz: string) {
  const p = partsIn(ms, tz);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** "2026-11-10" + "09:30" in Europe/London -> UTC milliseconds. Handles BST changes. */
export function zonedToUtc(date: string, time: string, tz: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const first = guess - offsetMs(guess, tz);
  // Second pass settles the hour either side of a clock change.
  return guess - offsetMs(first, tz);
}

export function dateIn(ms: number, tz: string) {
  const p = partsIn(ms, tz);
  return `${p.year}-${p.month}-${p.day}`;
}

export function timeIn(ms: number, tz: string) {
  const p = partsIn(ms, tz);
  return `${p.hour}:${p.minute}`;
}

export function weekdayOf(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(date: string, n: number) {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export function minutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function hhmm(mins: number) {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

export function prettyDate(date: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function prettyTime(hhmmStr: string) {
  const [h, m] = hhmmStr.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}.${String(m).padStart(2, "0")}${suffix}`;
}
