import "server-only";
import config from "@/business.config";
import type { Booking } from "./types";

/** Stripe Checkout over plain HTTPS. Only used when the tier includes payments and a deposit is set. */

export const stripeReady = () => Boolean(process.env.STRIPE_SECRET_KEY);

async function stripe(path: string, init?: { method?: string; body?: URLSearchParams }) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: init?.body,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? "Stripe error");
  return json;
}

export async function depositCheckout(b: Booking, origin: string): Promise<string> {
  const amount = Math.round(config.payments.deposit * 100);
  const body = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": config.payments.currency,
    "line_items[0][price_data][unit_amount]": String(amount),
    "line_items[0][price_data][product_data][name]": `Deposit: ${b.service_name ?? "booking"}`,
    customer_email: b.email,
    client_reference_id: b.id,
    "metadata[booking_id]": b.id,
    success_url: `${origin}/booked?id=${b.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?cancelled=1`,
    // Unpaid holds release themselves after 30 minutes.
    expires_at: String(Math.floor(Date.now() / 1000) + 30 * 60),
  });
  const session = await stripe("checkout/sessions", { method: "POST", body });
  return session.url as string;
}

export async function sessionPaid(sessionId: string, bookingId: string) {
  const s = await stripe(`checkout/sessions/${encodeURIComponent(sessionId)}`);
  return s.payment_status === "paid" && s.client_reference_id === bookingId;
}
