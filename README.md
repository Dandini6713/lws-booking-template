# Booking app template

One codebase for all three Fiverr packages. Each order is a copy of this repo with `business.config.ts` filled in, plus the client's own accounts for the paid features.

Stack: Next.js 15, TypeScript, Tailwind 4, Supabase, Vercel. No other SDKs: email (Resend), SMS (Twilio) and deposits (Stripe) go over plain HTTPS.

## What each package switches on

| | Basic | Standard | Premium |
|---|---|---|---|
| Branded booking or quote page, installable on a phone | Yes | Yes | Yes |
| How customers book | Pick a day and morning, afternoon or evening | Live free times, no double booking | Live free times, no double booking |
| Email to customer and owner | Yes | Yes | Yes |
| Owner dashboard at `/admin` | No | Yes | Yes |
| SMS to customer and owner | No | Yes | Yes |
| Stripe deposit at booking | No | No | Yes |
| Reminder before the appointment | No | No | Yes |
| Review request when marked done | No | No | Yes |

Set `tier` in `business.config.ts`. Any single feature can be overridden by hand in the `tiers` table at the bottom of that file.

Set `mode` to `"booking"` for salons, clinics and anything with appointments, or `"quote"` for trades (job type, description, postcode, contact).

## Demo mode

With no Supabase keys the app runs on sample bookings in memory. Deploy it as is and you have a working preview link for the buyer within minutes. The dashboard password in demo mode is `demo`.

## Per order checklist

1. **Copy the repo.** `gh repo create client-booking --private --template <this repo>` or duplicate the folder.
2. **Fill in `business.config.ts`.** Name, contacts, mode, tier, colours, fonts, services with durations and prices, opening hours, closed dates, capacity (chairs or staff), deposit, cancellation wording.
3. **Deploy a preview to Vercel** with no environment variables. Send the buyer the link. This is your 48 hour preview.
4. **After approval, connect the client's accounts** (all in their name, so they own everything):
   - Supabase: new project, run `supabase/schema.sql` in the SQL Editor, copy the URL and service role key.
   - Resend: add and verify their domain, create an API key, set `EMAIL_FROM` to an address on that domain.
   - Twilio (Standard and Premium): account, UK number or approved sender ID.
   - Stripe (Premium): their account, secret key.
5. **Add environment variables in Vercel** from `.env.example`. Set a strong `ADMIN_PASSWORD`, a random `SESSION_SECRET`, and `CRON_SECRET` if reminders are on.
6. **Add their domain** in Vercel (e.g. `book.theirsalon.co.uk`) and link it from their website.
7. **Test once end to end on a phone:** book, receive the email and SMS, see it in `/admin`, pay a test deposit with Stripe test card 4242 4242 4242 4242, then switch Stripe to live.
8. **Show them how to install it:** open the link on their phone, Share, Add to Home Screen.

## Files

| File | What it does |
|---|---|
| `business.config.ts` | Everything per client. The only file you should need to edit. |
| `app/page.tsx` | Customer page: booking flow or quote form depending on mode |
| `components/BookingFlow.tsx` | Service, day and time, details. Running summary in a bottom bar on phones, a side panel on desktop |
| `components/QuoteForm.tsx` | Quote request form |
| `app/booked/page.tsx` | Confirmation ticket with Add to calendar; also confirms Stripe deposits |
| `app/admin` and `components/AdminBoard.tsx` | Owner dashboard: to confirm, today, upcoming, past; call, WhatsApp, email, confirm, mark done, cancel |
| `lib/slots.ts` | Free time calculation (opening hours, notice, capacity, clock changes) |
| `lib/store.ts` | Supabase or demo data |
| `lib/notify.ts` | Email and SMS wording |
| `app/api/cron/reminders` | Daily 5pm reminder job (evening before), scheduled in `vercel.json` |
| `supabase/schema.sql` | Database table with public access locked off |

## Rules the app enforces

- A slot is checked again at the moment of booking, so two people can't take the same time.
- Unpaid deposits hold a slot for 30 minutes, then release it.
- Times are calculated in Europe/London, including the switch to and from BST.
- Bots are caught by a hidden field and quietly ignored.
- Customer data is only read and written on the server; the database refuses the public key.

## Known limits

- Deposits are confirmed when the customer lands back on the confirmation page. If they close the tab mid-payment, the booking shows as "Deposit unpaid" in the dashboard and the slot frees up after 30 minutes. A Stripe webhook would close that gap and is the next upgrade.
- One shared owner password. Fine for a sole trader or small salon; add Supabase Auth if a client needs separate staff logins.
- Reminders go out once a day at 5pm UTC for anything in the next 24 hours, which works on Vercel's free plan. On Vercel Pro you can change `vercel.json` to hourly for reminders closer to the time.

## Commands

```
npm install
npm run dev        # http://localhost:3000
npm run build
```
