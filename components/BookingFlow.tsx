"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Service } from "@/business.config";
import { prettyDate, prettyTime } from "@/lib/time";
import Summary from "./Summary";

type Slot = { time: string; iso: string };
type Props = {
  services: Service[];
  dates: string[];
  liveSlots: boolean;
  deposit: number | null;
  policy: string;
};

const windows = [
  { id: "morning", label: "Morning" },
  { id: "afternoon", label: "Afternoon" },
  { id: "evening", label: "Evening" },
] as const;

const titles = ["What are you booking?", "When suits you?", "Your details"];

export default function BookingFlow({ services, dates, liveSlots, deposit, policy }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(dates[0] ?? null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [win, setWin] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "", company: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const service = useMemo(() => services.find((s) => s.id === serviceId) ?? null, [services, serviceId]);

  // Load free times whenever the service or day changes.
  useEffect(() => {
    if (!liveSlots || !service || !date) return;
    let live = true;
    setSlots(null);
    setSlot(null);
    fetch(`/api/availability?date=${date}&service=${service.id}`)
      .then((r) => r.json())
      .then((j) => live && setSlots(j.slots ?? []))
      .catch(() => live && setSlots([]));
    return () => {
      live = false;
    };
  }, [liveSlots, service, date]);

  // Move focus to the new step heading so screen readers follow along.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    titleRef.current?.focus({ preventScroll: true });
    titleRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [step]);

  const canNext = step === 0 ? !!service : step === 1 ? (liveSlots ? !!slot : !!date) : true;

  async function submit() {
    setSending(true);
    setErrors({});
    setNotice(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, start: slot?.iso, date, window: win, ...form }),
      });
      const j = await res.json();
      if (res.status === 422) return setErrors(j.errors ?? {});
      if (res.status === 409) {
        setNotice(j.error);
        setStep(1);
        setSlots(null);
        const r = await fetch(`/api/availability?date=${date}&service=${serviceId}`).then((x) => x.json());
        setSlots(r.slots ?? []);
        return;
      }
      if (!res.ok) return setNotice(j.error ?? "Something went wrong. Please try again.");
      if (j.checkout) return (window.location.href = j.checkout);
      if (j.id) router.push(`/booked?id=${encodeURIComponent(j.id)}`);
    } catch {
      setNotice("We couldn't reach the booking system. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  function next() {
    if (step < 2) setStep(step + 1);
    else submit();
  }

  const whenText = liveSlots
    ? slot && date
      ? `${prettyDate(date, { weekday: "short", day: "numeric", month: "short" })}, ${prettyTime(slot.time)}`
      : null
    : date
      ? `${prettyDate(date, { weekday: "short", day: "numeric", month: "short" })}${win ? `, ${win}` : ""}`
      : null;

  const cta =
    step < 2
      ? "Continue"
      : sending
        ? "Booking..."
        : deposit
          ? `Pay £${deposit} deposit`
          : liveSlots
            ? "Confirm booking"
            : "Send request";

  return (
    <div className="layout">
      <section aria-live="polite">
        <div className="stepnav">
          {step > 0 ? (
            <button className="back" onClick={() => setStep(step - 1)}>
              Back
            </button>
          ) : (
            <span />
          )}
          <div className="progress" aria-label={`Step ${step + 1} of 3`}>
            {[0, 1, 2].map((i) => (
              <span key={i} data-on={i <= step} />
            ))}
          </div>
        </div>

        <h2 className="steptitle display" tabIndex={-1} ref={titleRef}>
          {titles[step]}
        </h2>

        {notice && <div className="banner" role="alert">{notice}</div>}

        {step === 0 && (
          <div className="panel" key="s0">
            <ul className="services">
              {services.map((s) => (
                <li key={s.id}>
                  <button
                    className="service"
                    aria-pressed={s.id === serviceId}
                    onClick={() => {
                      setServiceId(s.id);
                      setStep(1);
                    }}
                  >
                    <span className="service-name">{s.name}</span>
                    <span className="service-price">{s.price === null ? "Free" : `£${s.price}`}</span>
                    <span className="service-meta">
                      {duration(s.duration)}
                      {s.note ? `. ${s.note}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === 1 && (
          <div className="panel" key="s1">
            <div className="days" role="group" aria-label="Choose a day">
              {dates.map((d) => {
                const [, m] = d.split("-");
                return (
                  <button key={d} className="day" aria-pressed={d === date} onClick={() => setDate(d)} aria-label={prettyDate(d)}>
                    <span className="day-wd">{prettyDate(d, { weekday: "short" })}</span>
                    <span className="day-num">{Number(d.slice(8))}</span>
                    <span className="day-mo">{prettyDate(`2000-${m}-01`, { month: "short" })}</span>
                  </button>
                );
              })}
            </div>

            {date && (
              <>
                <p className="subhead">
                  {prettyDate(date)}
                  {liveSlots && slots && <small>{slots.length ? `${slots.length} times free` : "Fully booked"}</small>}
                </p>
                {liveSlots ? (
                  slots === null ? (
                    <div className="times" aria-busy="true">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="skeleton" />
                      ))}
                    </div>
                  ) : slots.length ? (
                    <div className="times" role="group" aria-label="Choose a time">
                      {slots.map((s) => (
                        <button key={s.iso} className="chip" aria-pressed={slot?.iso === s.iso} onClick={() => setSlot(s)}>
                          {prettyTime(s.time)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="empty">Nothing free on this day. Swipe along to see the next open days.</div>
                  )
                ) : (
                  <>
                    <div className="chips" role="group" aria-label="Preferred time of day">
                      {windows.map((w) => (
                        <button key={w.id} className="chip" aria-pressed={win === w.id} onClick={() => setWin(win === w.id ? null : w.id)}>
                          {w.label}
                        </button>
                      ))}
                    </div>
                    <p className="fineprint">We&apos;ll confirm an exact time with you.</p>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <form
            className="panel"
            key="s2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            noValidate
          >
            <Field label="Your name" name="name" autoComplete="name" value={form.name} error={errors.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field label="Mobile number" name="phone" type="tel" autoComplete="tel" inputMode="tel" value={form.phone} error={errors.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" value={form.email} error={errors.email} onChange={(v) => setForm({ ...form, email: v })} />
            <div className="field">
              <label htmlFor="notes">
                Anything we should know? <span className="hint">Optional</span>
              </label>
              <textarea id="notes" className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="hp" aria-hidden="true">
              <input tabIndex={-1} autoComplete="off" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <p className="fineprint">{policy}</p>
            <button type="submit" hidden />
          </form>
        )}
      </section>

      <Summary
        rows={[
          { label: "Service", value: service ? `${service.name}${service.price !== null ? `, £${service.price}` : ""}` : null },
          { label: "When", value: whenText },
          ...(deposit ? [{ label: "Deposit", value: `£${deposit} today, the rest on the day` }] : []),
        ]}
        cta={cta}
        disabled={!canNext || sending}
        onClick={next}
        emptyText="Choose a service to start"
      />
    </div>
  );
}

function duration(m: number) {
  if (m < 60) return `${m} mins`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} hr ${r} mins` : `${h} hr${h > 1 ? "s" : ""}`;
}

export function Field(props: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: "tel" | "email" | "text";
  hint?: string;
}) {
  const id = props.name;
  return (
    <div className="field">
      <label htmlFor={id}>
        {props.label} {props.hint && <span className="hint">{props.hint}</span>}
      </label>
      <input
        id={id}
        name={props.name}
        className="input"
        type={props.type ?? "text"}
        autoComplete={props.autoComplete}
        inputMode={props.inputMode}
        value={props.value}
        aria-invalid={!!props.error}
        aria-describedby={props.error ? `${id}-err` : undefined}
        onChange={(e) => props.onChange(e.target.value)}
      />
      {props.error && (
        <span className="error" id={`${id}-err`}>
          {props.error}
        </span>
      )}
    </div>
  );
}
