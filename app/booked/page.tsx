import { notFound } from "next/navigation";
import config from "@/business.config";
import Chrome from "@/components/Chrome";
import { getBooking, updateBooking } from "@/lib/store";
import { sessionPaid } from "@/lib/stripe";
import { notifyNew, when } from "@/lib/notify";

export const dynamic = "force-dynamic";

export default async function Booked({ searchParams }: { searchParams: Promise<{ id?: string; session_id?: string }> }) {
  const { id, session_id } = await searchParams;
  if (!id) notFound();
  let b = await getBooking(id);
  if (!b) notFound();

  // Back from Stripe: confirm the deposit, then send the confirmations that were held back.
  if (session_id && b.deposit_status === "pending") {
    try {
      if (await sessionPaid(session_id, b.id)) {
        b = (await updateBooking(b.id, { deposit_status: "paid", status: "confirmed" })) ?? b;
        await notifyNew(b);
      }
    } catch (e) {
      console.error("[deposit check failed]", e);
    }
  }

  const awaitingDeposit = b.deposit_status === "pending";
  const isQuote = b.kind === "quote";
  const isRequest = b.kind === "request";
  const title = awaitingDeposit ? "Almost there" : isQuote ? "Enquiry sent" : isRequest ? "Request sent" : "You're booked in";
  const line = awaitingDeposit
    ? "We haven't received your deposit yet, so this time isn't held. If you paid, give it a minute and refresh."
    : isQuote
      ? config.copy.quoteConfirmLine
      : isRequest
        ? "We'll be in touch to confirm an exact time."
        : config.copy.confirmLine;

  return (
    <Chrome>
      <div className="ticket">
        <div className="ticket-top">
          <h1 className="display">{title}</h1>
          <p>{line}</p>
        </div>
        <dl className="ticket-body">
          <div>
            <dt>{isQuote ? "Job" : "Service"}</dt>
            <dd>{isQuote ? b.job_type : b.service_name}</dd>
          </div>
          {!isQuote && (
            <div>
              <dt>When</dt>
              <dd>{when(b)}</dd>
            </div>
          )}
          {b.deposit_status === "paid" && b.deposit_amount && (
            <div>
              <dt>Deposit paid</dt>
              <dd>£{b.deposit_amount}</dd>
            </div>
          )}
          <div>
            <dt>Where</dt>
            <dd>{isQuote ? b.postcode : config.business.address}</dd>
          </div>
        </dl>
        <div className="ticket-actions">
          {b.start_at && !awaitingDeposit && (
            <a className="btn" href={`/api/ics?id=${encodeURIComponent(b.id)}`}>
              Add to calendar
            </a>
          )}
          <a className="btn btn-ghost" href={`tel:${config.business.phone.replace(/\s/g, "")}`}>
            Call us
          </a>
        </div>
      </div>
    </Chrome>
  );
}
