import config, { features } from "@/business.config";
import BookingFlow from "@/components/BookingFlow";
import QuoteForm from "@/components/QuoteForm";
import Chrome from "@/components/Chrome";
import { bookableDates } from "@/lib/slots";
import { stripeReady } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const { cancelled } = await searchParams;
  const { copy, mode, brand } = config;
  const deposit = features.payments && config.payments.deposit > 0 && stripeReady() ? config.payments.deposit : null;

  return (
    <Chrome>
      {brand.heroImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="hero-img" src={brand.heroImage} alt="" />
      )}
      <header className="hero">
        <h1 className="display">{mode === "quote" ? "Get a quote" : "Book online"}</h1>
        <p>{mode === "quote" ? copy.quoteHeroLine : copy.heroLine}</p>
      </header>
      {cancelled && <div className="banner">Payment was cancelled, so nothing has been booked. You can pick a time again below.</div>}
      {mode === "quote" ? (
        <QuoteForm jobTypes={config.quoteJobTypes} />
      ) : (
        <BookingFlow
          services={config.services}
          dates={bookableDates()}
          liveSlots={features.liveSlots}
          deposit={deposit}
          policy={copy.cancellationPolicy}
        />
      )}
    </Chrome>
  );
}
