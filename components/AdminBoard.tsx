"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import config from "@/business.config";
import type { Booking, Status } from "@/lib/types";
import { addDays, dateIn, prettyDate, prettyTime, timeIn } from "@/lib/time";

type Tab = "today" | "upcoming" | "action" | "past";

export default function AdminBoard({
  bookings: initial,
  name,
  tz,
  demo,
  mode,
}: {
  bookings: Booking[];
  name: string;
  tz: string;
  demo: boolean;
  mode: "booking" | "quote";
}) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const today = dateIn(Date.now(), tz);
  const weekEnd = addDays(today, 7);

  const dayOf = (b: Booking) => (b.start_at ? dateIn(Date.parse(b.start_at), tz) : b.preferred_date ?? dateIn(Date.parse(b.created_at), tz));
  const needsAction = (b: Booking) => b.status === "pending";

  const groups = useMemo(() => {
    const live = bookings.filter((b) => b.status !== "cancelled");
    return {
      today: live.filter((b) => dayOf(b) === today && b.status !== "pending"),
      upcoming: live.filter((b) => dayOf(b) > today && b.status !== "pending"),
      action: bookings.filter(needsAction),
      past: bookings.filter((b) => dayOf(b) < today || b.status === "cancelled"),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, today]);

  const [tab, setTab] = useState<Tab>(groups.action.length ? "action" : "today");

  const prices = Object.fromEntries(config.services.map((s) => [s.id, s.price ?? 0]));
  const weekTotal = bookings
    .filter((b) => b.status !== "cancelled" && b.status !== "pending" && dayOf(b) >= today && dayOf(b) < weekEnd)
    .reduce((n, b) => n + (b.service_id ? prices[b.service_id] ?? 0 : 0), 0);

  async function setStatus(b: Booking, status: Status) {
    setBusy(b.id);
    const res = await fetch("/api/admin/bookings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: b.id, status }) });
    setBusy(null);
    if (res.status === 401) return router.refresh();
    if (res.ok) {
      const { booking } = await res.json();
      setBookings((all) => all.map((x) => (x.id === booking.id ? booking : x)));
    }
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    router.refresh();
  }

  const list = groups[tab];
  const byDay = list.reduce<Record<string, Booking[]>>((acc, b) => {
    (acc[dayOf(b)] ??= []).push(b);
    return acc;
  }, {});
  const days = Object.keys(byDay).sort(tab === "past" ? (a, b) => b.localeCompare(a) : undefined);

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "action", label: "To confirm", count: groups.action.length },
    { id: "today", label: "Today", count: groups.today.length },
    { id: "upcoming", label: "Upcoming", count: groups.upcoming.length },
    { id: "past", label: "Past", count: groups.past.length },
  ];

  return (
    <div className="shell admin">
      <nav className="topbar">
        <span className="wordmark">{name}</span>
        <button className="back" onClick={logout}>
          Sign out
        </button>
      </nav>

      {demo && <div className="banner">Demo mode. These are sample bookings and changes reset when the server restarts.</div>}

      <header className="admin-head">
        <h1 className="display">{prettyDate(today)}</h1>
        <div className="stats">
          <div>
            <strong>{groups.today.length}</strong>
            <span>{mode === "quote" ? "jobs" : "appointments"} today</span>
          </div>
          <div>
            <strong>{groups.action.length}</strong>
            <span>waiting for you</span>
          </div>
          {mode === "booking" && (
            <div>
              <strong>£{weekTotal.toLocaleString("en-GB")}</strong>
              <span>booked in next 7 days</span>
            </div>
          )}
        </div>
      </header>

      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className="tab" onClick={() => setTab(t.id)}>
            {t.label}
            {t.count > 0 && <span className="count">{t.count}</span>}
          </button>
        ))}
      </div>

      {days.length === 0 && (
        <div className="empty" style={{ marginTop: 20 }}>
          {tab === "action" ? "Nothing waiting. New requests and unpaid deposits show up here." : tab === "today" ? "Nothing booked for today." : "Nothing here yet."}
        </div>
      )}

      {days.map((d) => (
        <section key={d} className="admin-day">
          <h2>{d === today ? "Today" : d === addDays(today, 1) ? "Tomorrow" : prettyDate(d)}</h2>
          <ul>
            {byDay[d].map((b) => (
              <li key={b.id} className="card" data-status={b.status}>
                <div className="card-time">
                  {b.start_at ? prettyTime(timeIn(Date.parse(b.start_at), tz)) : b.kind === "quote" ? "Quote" : cap(b.preferred_window ?? "Any time")}
                </div>
                <div className="card-main">
                  <p className="card-title">
                    {b.name}
                    <span className={`pill pill-${b.status}`}>{label(b)}</span>
                  </p>
                  <p className="card-sub">
                    {b.service_name ?? b.job_type}
                    {b.postcode ? `, ${b.postcode}` : ""}
                    {b.deposit_status === "paid" && b.deposit_amount ? `. £${b.deposit_amount} deposit paid` : ""}
                  </p>
                  {b.notes && <p className="card-notes">{b.notes}</p>}
                  <div className="card-actions">
                    <a className="mini" href={`tel:${b.phone.replace(/\s/g, "")}`}>Call</a>
                    <a className="mini" href={`https://wa.me/${wa(b.phone)}`} target="_blank" rel="noreferrer">WhatsApp</a>
                    <a className="mini" href={`mailto:${b.email}`}>Email</a>
                    {b.status === "pending" && (
                      <button className="mini mini-solid" disabled={busy === b.id} onClick={() => setStatus(b, "confirmed")}>Confirm</button>
                    )}
                    {b.status === "confirmed" && (
                      <button className="mini mini-solid" disabled={busy === b.id} onClick={() => setStatus(b, "completed")}>Mark done</button>
                    )}
                    {b.status !== "cancelled" && b.status !== "completed" && (
                      <button
                        className="mini"
                        disabled={busy === b.id}
                        onClick={() => confirm(`Cancel ${b.name}'s booking?`) && setStatus(b, "cancelled")}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function label(b: Booking) {
  if (b.status === "pending") return b.deposit_status === "pending" ? "Deposit unpaid" : b.kind === "quote" ? "New enquiry" : "To confirm";
  return cap(b.status);
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function wa(phone: string) {
  const d = phone.replace(/[^\d]/g, "");
  return d.startsWith("0") ? "44" + d.slice(1) : d;
}
