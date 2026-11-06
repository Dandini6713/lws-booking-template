import { NextResponse } from "next/server";
import config from "@/business.config";
import { bookingsBetween } from "@/lib/store";
import { dayWindow, freeSlots } from "@/lib/slots";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? "";
  const service = config.services.find((s) => s.id === url.searchParams.get("service"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !service) {
    return NextResponse.json({ error: "Pick a service and a date" }, { status: 400 });
  }
  const { from, to } = dayWindow(date);
  const taken = await bookingsBetween(from, to);
  return NextResponse.json({ slots: freeSlots(date, service.duration, taken) });
}
