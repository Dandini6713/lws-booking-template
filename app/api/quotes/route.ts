import { NextResponse } from "next/server";
import config from "@/business.config";
import { createBooking } from "@/lib/store";
import { notifyNew } from "@/lib/notify";
import { clean, contactErrors } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (clean(body.company)) return NextResponse.json({ ok: true });

  const jobType = config.quoteJobTypes.find((j) => j === body.jobType);
  if (!jobType) return NextResponse.json({ error: "Please choose the type of job" }, { status: 400 });

  const contact = { name: clean(body.name, 80), email: clean(body.email, 120).toLowerCase(), phone: clean(body.phone, 30) };
  const errors = contactErrors(contact);
  const notes = clean(body.notes, 2000);
  const postcode = clean(body.postcode, 10).toUpperCase();
  if (notes.length < 10) errors.notes = "A line or two about the job helps us price it";
  if (!/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(postcode)) errors.postcode = "Please add a full UK postcode";
  if (Object.keys(errors).length) return NextResponse.json({ errors }, { status: 422 });

  const b = await createBooking({
    ...contact,
    kind: "quote",
    notes,
    postcode,
    job_type: jobType,
    service_id: null,
    service_name: null,
    start_at: null,
    end_at: null,
    preferred_date: clean(body.date, 10) || null,
    preferred_window: null,
    deposit_amount: null,
  });
  await notifyNew(b);
  return NextResponse.json({ id: b.id });
}
