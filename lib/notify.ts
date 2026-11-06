import "server-only";
import config, { features } from "@/business.config";
import type { Booking } from "./types";
import { dateIn, prettyDate, prettyTime, timeIn } from "./time";

/**
 * Email through Resend and SMS through Twilio, both over plain HTTPS so there are no SDKs to update.
 * Anything missing a key is logged instead of sent, which is what you want in demo mode.
 */

const tz = config.hours.timezone;

export function when(b: Booking) {
  if (b.start_at) {
    const ms = Date.parse(b.start_at);
    return `${prettyDate(dateIn(ms, tz))} at ${prettyTime(timeIn(ms, tz))}`;
  }
  if (b.preferred_date) return `${prettyDate(b.preferred_date)}, ${b.preferred_window ?? "any time"}`;
  return "To be arranged";
}

export async function sendEmail(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.log(`[email skipped] to=${to} subject="${subject}"`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text, reply_to: config.business.email }),
  });
  if (!res.ok) console.error("[email failed]", res.status, await res.text());
}

export async function sendSms(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!features.sms || !sid || !token || !from || !to) {
    console.log(`[sms skipped] to=${to}`);
    return;
  }
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: toE164(to), From: from, Body: body }),
  });
  if (!res.ok) console.error("[sms failed]", res.status, await res.text());
}

/** UK numbers typed as 07... become +447... */
function toE164(n: string) {
  const d = n.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) return d;
  if (d.startsWith("0")) return "+44" + d.slice(1);
  return d;
}

const name = config.business.name;
const footer = `\n\n${name}\n${config.business.address}\n${config.business.phone}`;

export async function notifyNew(b: Booking) {
  const isQuote = b.kind === "quote";
  const isRequest = b.kind === "request";
  const what = isQuote ? b.job_type ?? "Quote request" : b.service_name ?? "Appointment";

  // To the customer
  const customerSubject = isQuote
    ? `We've got your enquiry, ${name}`
    : isRequest
      ? `Your booking request with ${name}`
      : `You're booked in: ${what}`;
  const customerBody = isQuote
    ? `Hi ${first(b.name)},\n\nThanks for getting in touch about: ${what}. We'll look at the details and come back to you with a price shortly.${footer}`
    : isRequest
      ? `Hi ${first(b.name)},\n\nThanks for your request for ${what} on ${when(b)}. We'll confirm an exact time with you shortly.${footer}`
      : `Hi ${first(b.name)},\n\nYou're booked in for ${what} on ${when(b)}.\n\n${config.copy.cancellationPolicy}${footer}`;
  await sendEmail(b.email, customerSubject, customerBody);

  // To the business
  const lines = [
    `${isQuote ? "New quote request" : isRequest ? "New booking request" : "New booking"}: ${what}`,
    `When: ${when(b)}`,
    `Name: ${b.name}`,
    `Phone: ${b.phone}`,
    `Email: ${b.email}`,
    b.postcode ? `Postcode: ${b.postcode}` : "",
    b.notes ? `Notes: ${b.notes}` : "",
  ].filter(Boolean);
  await sendEmail(config.business.notifyEmail, lines[0], lines.join("\n"));
  await sendSms(config.business.notifyPhone, lines.slice(0, 4).join("\n"));
  if (!isQuote) await sendSms(b.phone, `${name}: ${isRequest ? "request received for" : "you're booked in for"} ${what}, ${when(b)}.`);
}

export async function notifyReminder(b: Booking) {
  const what = b.service_name ?? "your appointment";
  await sendEmail(b.email, `See you soon: ${what}`, `Hi ${first(b.name)},\n\nJust a reminder that you're booked in for ${what} on ${when(b)}.\n\n${config.copy.cancellationPolicy}${footer}`);
  await sendSms(b.phone, `${name}: reminder, ${what} ${when(b)}. ${config.copy.cancellationPolicy}`);
}

export async function notifyReview(b: Booking) {
  if (!config.reminders.reviewLink) return;
  await sendEmail(
    b.email,
    `Thanks for visiting ${name}`,
    `Hi ${first(b.name)},\n\nThanks for coming in. If you have a minute, a quick review really helps a small business like ours:\n${config.reminders.reviewLink}${footer}`,
  );
}

function first(n: string) {
  return n.trim().split(/\s+/)[0];
}
