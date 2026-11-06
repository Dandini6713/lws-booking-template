"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "./BookingFlow";

export default function QuoteForm({ jobTypes }: { jobTypes: string[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ jobType: "", notes: "", postcode: "", name: "", phone: "", email: "", company: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm({ ...form, [k]: v });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setErrors({});
    setNotice(null);
    try {
      const res = await fetch("/api/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const j = await res.json();
      if (res.status === 422) return setErrors(j.errors ?? {});
      if (!res.ok) return setNotice(j.error ?? "Something went wrong. Please try again.");
      router.push(`/booked?id=${encodeURIComponent(j.id)}`);
    } catch {
      setNotice("We couldn't send that. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="panel" onSubmit={submit} noValidate style={{ maxWidth: 620, paddingBottom: 64 }}>
      {notice && <div className="banner" role="alert">{notice}</div>}
      <p className="subhead" style={{ marginTop: 0 }}>What do you need?</p>
      <div className="chips" role="group" aria-label="Type of job" style={{ marginBottom: 22 }}>
        {jobTypes.map((j) => (
          <button type="button" key={j} className="chip" aria-pressed={form.jobType === j} onClick={() => set("jobType")(j)}>
            {j}
          </button>
        ))}
      </div>
      <div className="field">
        <label htmlFor="notes">Tell us about the job</label>
        <textarea id="notes" className="input" value={form.notes} aria-invalid={!!errors.notes} onChange={(e) => set("notes")(e.target.value)} placeholder="What's the problem, roughly how big is the job, anything we should know about access?" />
        {errors.notes && <span className="error">{errors.notes}</span>}
      </div>
      <Field label="Postcode of the job" name="postcode" autoComplete="postal-code" value={form.postcode} error={errors.postcode} onChange={set("postcode")} />
      <Field label="Your name" name="name" autoComplete="name" value={form.name} error={errors.name} onChange={set("name")} />
      <Field label="Mobile number" name="phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} error={errors.phone} onChange={set("phone")} />
      <Field label="Email" name="email" type="email" inputMode="email" autoComplete="email" value={form.email} error={errors.email} onChange={set("email")} />
      <div className="hp" aria-hidden="true">
        <input tabIndex={-1} autoComplete="off" value={form.company} onChange={(e) => set("company")(e.target.value)} />
      </div>
      <button className="btn" type="submit" disabled={!form.jobType || sending} style={{ width: "100%", marginTop: 8 }}>
        {sending ? "Sending..." : "Get my quote"}
      </button>
    </form>
  );
}
