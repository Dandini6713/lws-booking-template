import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import config from "@/business.config";
import type { Booking, NewBooking } from "./types";
import { addDays, dateIn, zonedToUtc } from "./time";

/**
 * Data layer. With SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set it uses Supabase.
 * Without them it runs in demo mode: an in-memory store seeded with sample bookings,
 * so a preview link works the moment it's deployed, before any accounts exist.
 */

export const isDemo = !(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

let client: SupabaseClient | null = null;
function db() {
  if (!client) {
    client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }
  return client;
}

// ---------- demo store ----------
const g = globalThis as unknown as { __demo?: Booking[] };

function seed(): Booking[] {
  const tz = config.hours.timezone;
  const today = dateIn(Date.now(), tz);
  const people = [
    ["Sophie Walsh", "sophie@example.com", "07700 900101"],
    ["Hannah Byrne", "hannah@example.com", "07700 900102"],
    ["Megan Doyle", "megan@example.com", "07700 900103"],
    ["Ellie Grant", "ellie@example.com", "07700 900104"],
    ["Chloe Martin", "chloe@example.com", "07700 900105"],
  ];
  const out: Booking[] = [];
  let i = 0;
  for (let d = 0; d < 6; d++) {
    const date = addDays(today, d);
    const day = config.hours.week[new Date(date + "T12:00:00Z").getUTCDay()];
    if (!day) continue;
    for (const t of ["10:00", "13:30"]) {
      const svc = config.services[i % config.services.length];
      const [name, email, phone] = people[i % people.length];
      const start = zonedToUtc(date, t, tz);
      out.push({
        id: `demo-${i}`,
        created_at: new Date(Date.now() - 86400000 * (3 - (i % 3))).toISOString(),
        kind: config.mode === "quote" ? "quote" : "booking",
        status: d === 0 && t === "10:00" ? "completed" : i % 4 === 0 ? "pending" : "confirmed",
        service_id: svc.id,
        service_name: config.mode === "quote" ? null : svc.name,
        start_at: config.mode === "quote" ? null : new Date(start).toISOString(),
        end_at: config.mode === "quote" ? null : new Date(start + (svc.duration || 60) * 60000).toISOString(),
        preferred_date: null,
        preferred_window: null,
        name,
        email,
        phone,
        notes: i % 3 === 0 ? "First visit, would like a patch test." : null,
        job_type: config.mode === "quote" ? config.quoteJobTypes[i % config.quoteJobTypes.length] : null,
        postcode: config.mode === "quote" ? "L34 5QR" : null,
        deposit_amount: config.payments.deposit || null,
        deposit_status: config.payments.deposit && config.mode === "booking" ? "paid" : "none",
        reminder_sent: false,
      });
      i++;
    }
  }
  return out;
}

function demo() {
  if (!g.__demo) g.__demo = seed();
  return g.__demo;
}

// ---------- public API ----------

/** Bookings that overlap a UTC window, excluding cancelled. Used for slot checks. */
export async function bookingsBetween(fromIso: string, toIso: string): Promise<Pick<Booking, "start_at" | "end_at">[]> {
  // An unpaid deposit holds the slot for 30 minutes (the Stripe checkout lifetime), then releases it.
  const holdCutoff = new Date(Date.now() - 30 * 60000).toISOString();
  if (isDemo) {
    return demo().filter(
      (b) =>
        b.status !== "cancelled" &&
        !(b.deposit_status === "pending" && b.created_at < holdCutoff && b.status === "pending") &&
        b.start_at && b.end_at && b.start_at < toIso && b.end_at > fromIso,
    );
  }
  const { data, error } = await db()
    .from("bookings")
    .select("start_at,end_at")
    .neq("status", "cancelled")
    .or(`deposit_status.neq.pending,created_at.gt.${holdCutoff}`)
    .lt("start_at", toIso)
    .gt("end_at", fromIso);
  if (error) throw error;
  return data ?? [];
}

export async function listBookings(): Promise<Booking[]> {
  if (isDemo) {
    return [...demo()].sort((a, b) => (a.start_at ?? a.created_at).localeCompare(b.start_at ?? b.created_at));
  }
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString();
  const { data, error } = await db()
    .from("bookings")
    .select("*")
    .or(`start_at.gte.${since},start_at.is.null`)
    .order("start_at", { ascending: true, nullsFirst: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as Booking[];
}

export async function getBooking(id: string): Promise<Booking | null> {
  if (isDemo) return demo().find((b) => b.id === id) ?? null;
  const { data } = await db().from("bookings").select("*").eq("id", id).maybeSingle();
  return (data as Booking) ?? null;
}

export async function createBooking(input: NewBooking): Promise<Booking> {
  const row = {
    status: "pending" as const,
    deposit_status: "none" as const,
    reminder_sent: false,
    ...input,
  };
  if (isDemo) {
    const b: Booking = { ...row, id: `demo-${crypto.randomUUID().slice(0, 8)}`, created_at: new Date().toISOString() };
    demo().push(b);
    return b;
  }
  const { data, error } = await db().from("bookings").insert(row).select("*").single();
  if (error) throw error;
  return data as Booking;
}

export async function updateBooking(id: string, patch: Partial<Booking>): Promise<Booking | null> {
  if (isDemo) {
    const b = demo().find((x) => x.id === id);
    if (!b) return null;
    Object.assign(b, patch);
    return b;
  }
  const { data, error } = await db().from("bookings").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data as Booking;
}

/** Confirmed live bookings starting inside the reminder window that haven't had one yet. */
export async function dueForReminder(hoursBefore: number): Promise<Booking[]> {
  const now = Date.now();
  const from = new Date(now).toISOString();
  const to = new Date(now + hoursBefore * 3600000).toISOString();
  if (isDemo) return demo().filter((b) => b.status === "confirmed" && !b.reminder_sent && b.start_at && b.start_at >= from && b.start_at <= to);
  const { data, error } = await db()
    .from("bookings")
    .select("*")
    .eq("status", "confirmed")
    .eq("reminder_sent", false)
    .gte("start_at", from)
    .lte("start_at", to);
  if (error) throw error;
  return (data ?? []) as Booking[];
}
