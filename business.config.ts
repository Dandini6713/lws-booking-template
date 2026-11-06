/**
 * THE ONLY FILE YOU EDIT PER ORDER.
 * Everything a client sees (name, colours, services, hours, wording)
 * and every paid feature (dashboard, SMS, deposits, reminders) is set here.
 */

export type Mode = "booking" | "quote";
export type Tier = "basic" | "standard" | "premium";

export type Service = {
  id: string;
  name: string;
  /** Minutes. Ignored in quote mode. */
  duration: number;
  /** Pounds. Use null for "from" or price on consultation. */
  price: number | null;
  note?: string;
};

export type DayHours = { open: string; close: string } | null; // "09:00" 24h, null = closed

const config = {
  business: {
    name: "Aurora Colour Studio",
    shortName: "Aurora",
    strapline: "Colour, cuts and care in Prescot.",
    phone: "0151 000 0000",
    email: "hello@example.co.uk",
    address: "12 High Street, Prescot L34",
    website: "https://example.co.uk",
    /** Where booking alerts go. */
    notifyEmail: "hello@example.co.uk",
    notifyPhone: "+447000000000",
  },

  /** "booking" = pick a slot. "quote" = describe the job, get a quote back. */
  mode: "booking" as Mode,

  /** Sets the feature switches below. Matches the three Fiverr packages. */
  tier: "premium" as Tier,

  brand: {
    // Google Fonts family names. Pairing matters more than anything else here.
    displayFont: "Bricolage Grotesque",
    bodyFont: "Instrument Sans",
    colours: {
      ink: "#1d1a2b",      // main text
      paper: "#ecebf3",    // background
      surface: "#f8f7fb",  // panels and inputs
      accent: "#5b3df5",   // buttons and selected states
      accentInk: "#ffffff",// text on accent
      muted: "#6d6880",    // secondary text
      line: "#d9d6e6",     // borders
    },
    /** Rounded or square corners across the whole app. */
    radius: "14px",
    /** Optional hero image in /public, e.g. "/hero.jpg". Leave empty for type-only. */
    heroImage: "",
  },

  copy: {
    heroLine: "Book your next appointment in under a minute.",
    confirmLine: "A confirmation is on its way to your inbox.",
    quoteHeroLine: "Tell us about the job and we'll come back with a price.",
    quoteConfirmLine: "Thanks, we've got your details and will be in touch shortly.",
    cancellationPolicy: "Please give 24 hours notice to change or cancel.",
  },

  services: [
    { id: "cut", name: "Cut and finish", duration: 60, price: 45 },
    { id: "colour", name: "Full colour", duration: 120, price: 95 },
    { id: "balayage", name: "Balayage", duration: 180, price: 145, note: "Includes toner and gloss" },
    { id: "blowdry", name: "Blow dry", duration: 45, price: 30 },
    { id: "consult", name: "Colour consultation", duration: 20, price: null, note: "Includes a patch test" },
  ] as Service[],

  /** Quote mode only: the job types customers choose from. */
  quoteJobTypes: ["Repair", "Installation", "Inspection", "Something else"],

  hours: {
    timezone: "Europe/London",
    // 0 = Sunday
    week: {
      0: null,
      1: null,
      2: { open: "09:00", close: "17:30" },
      3: { open: "09:00", close: "17:30" },
      4: { open: "10:00", close: "20:00" },
      5: { open: "09:00", close: "17:30" },
      6: { open: "08:30", close: "15:00" },
    } as Record<number, DayHours>,
    /** Gap between slot start times, minutes. */
    slotStep: 15,
    /** How far ahead customers can book, days. */
    bookAheadDays: 42,
    /** Minimum notice, minutes. */
    minNotice: 120,
    /** Dates closed, "YYYY-MM-DD". */
    closedDates: ["2026-12-25", "2026-12-26", "2027-01-01"],
    /** How many customers can be booked at the same time (chairs, staff). */
    capacity: 1,
  },

  payments: {
    currency: "gbp",
    /** Deposit taken at booking, pounds. Premium tier only. 0 = none. */
    deposit: 20,
  },

  reminders: {
    /** Hours before the appointment the reminder goes. Premium only. */
    hoursBefore: 24,
    /** Ask for a Google review after the visit. Premium only. Empty to skip. */
    reviewLink: "",
  },
};

/** Feature switches derived from the tier. Override any line by hand if a client needs it. */
const tiers: Record<Tier, { dashboard: boolean; sms: boolean; payments: boolean; reminders: boolean; liveSlots: boolean }> = {
  basic: { dashboard: false, sms: false, payments: false, reminders: false, liveSlots: false },
  standard: { dashboard: true, sms: true, payments: false, reminders: false, liveSlots: true },
  premium: { dashboard: true, sms: true, payments: true, reminders: true, liveSlots: true },
};

export const features = tiers[config.tier];
export default config;
