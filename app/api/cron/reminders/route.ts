import { NextResponse } from "next/server";
import config, { features } from "@/business.config";
import { dueForReminder, updateBooking } from "@/lib/store";
import { notifyReminder } from "@/lib/notify";

export const dynamic = "force-dynamic";

/** Called by Vercel Cron (see vercel.json). Vercel sends CRON_SECRET as a bearer token. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  if (!features.reminders) return NextResponse.json({ sent: 0, skipped: "tier" });

  const due = await dueForReminder(config.reminders.hoursBefore);
  for (const b of due) {
    await notifyReminder(b);
    await updateBooking(b.id, { reminder_sent: true });
  }
  return NextResponse.json({ sent: due.length });
}
