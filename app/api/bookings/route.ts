import { NextResponse } from "next/server";
import config, { features } from "@/business.config";
import { bookingsBetween, createBooking } from "@/lib/store";
import { bookableDates, dayWindow, freeSlots } from "@/lib/slots";
import { notifyNew } from "@/lib/notify";
import { depositCheckout, stripeReady } from "@/lib/stripe";
import { clean, contactErrors } from "@/lib/validate";
import { dateIn } from "@/lib/time";
import type { Window } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  // Bots fill every field, people never see this one.
  if (clean(body.company)) return NextResponse.json({ ok: true });

  const service = config.services.find((s) => s.id === body.serviceId);
  if (!service) return NextResponse.json({ error: "Please choose a service" }, { status: 400 });

  const contact = { name: clean(body.name, 80), email: clean(body.email, 120).toLowerCase(), phone: clean(body.phone, 30) };
  const errors = contactErrors(contact);
  if (Object.keys(errors).length) return NextResponse.json({ errors }, { status: 422 });
  const notes = clean(body.notes, 1000) || null;

  const base = {
    ...contact,
    notes,
    service_id: service.id,
    service_name: service.name,
    job_type: null,
    postcode: null,
    deposit_amount: null,
  };

  // ----- Basic tier: a request for a day and part of the day -----
  if (!features.liveSlots) {
    const date = clean(body.date, 10);
    const window = (["morning", "afternoon", "evening"] as Window[]).find((w) => w === body.window) ?? null;
    if (!bookableDates().includes(date)) return NextResponse.json({ error: "Please choose an open day" }, { status: 400 });
    const b = await createBooking({ ...base, kind: "request", start_at: null, end_at: null, preferred_date: date, preferred_window: window });
    await notifyNew(b);
    return NextResponse.json({ id: b.id });
  }

  // ----- Live slots: re-check the slot is still free right now -----
  const startIso = clean(body.start, 40);
  const start = Date.parse(startIso);
  if (!start) return NextResponse.json({ error: "Please choose a time" }, { status: 400 });
  const date = dateIn(start, config.hours.timezone);
  const { from, to } = dayWindow(date);
  const free = freeSlots(date, service.duration, await bookingsBetween(from, to));
  if (!free.some((s) => s.iso === new Date(start).toISOString())) {
    return NextResponse.json({ error: "Sorry, that time has just gone. Please pick another.", taken: true }, { status: 409 });
  }

  const takeDeposit = features.payments && config.payments.deposit > 0 && stripeReady();
  const b = await createBooking({
    ...base,
    kind: "booking",
    start_at: new Date(start).toISOString(),
    end_at: new Date(start + service.duration * 60000).toISOString(),
    preferred_date: null,
    preferred_window: null,
    status: takeDeposit ? "pending" : "confirmed",
    deposit_amount: takeDeposit ? config.payments.deposit : null,
    deposit_status: takeDeposit ? "pending" : "none",
  });

  if (takeDeposit) {
    const origin = req.headers.get("origin") ?? new URL(req.url).origin;
    const url = await depositCheckout(b, origin);
    return NextResponse.json({ id: b.id, checkout: url });
  }

  await notifyNew(b);
  return NextResponse.json({ id: b.id });
}
