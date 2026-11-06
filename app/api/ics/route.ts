import config from "@/business.config";
import { getBooking } from "@/lib/store";

/** Calendar file for the confirmation page's "Add to calendar" button. Works on iPhone, Android and Outlook. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const b = await getBooking(id);
  if (!b?.start_at || !b.end_at) return new Response("Not found", { status: 404 });

  const stamp = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${b.id}@booking`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(b.start_at)}`,
    `DTEND:${stamp(b.end_at)}`,
    `SUMMARY:${esc(`${b.service_name} at ${config.business.name}`)}`,
    `LOCATION:${esc(config.business.address)}`,
    `DESCRIPTION:${esc(`${config.copy.cancellationPolicy} ${config.business.phone}`)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="booking.ics"`,
    },
  });
}
