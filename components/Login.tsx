"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login({ name, demo }: { name: string; demo: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    setBusy(false);
    if (!res.ok) return setError((await res.json()).error ?? "Couldn't sign in");
    router.refresh();
  }

  return (
    <div className="shell" style={{ maxWidth: 420, padding: "15vh 20px" }}>
      <p className="wordmark" style={{ marginBottom: 28 }}>{name}</p>
      <h1 className="display" style={{ fontSize: "2.2rem", margin: "0 0 20px", lineHeight: 1.05 }}>Your bookings</h1>
      <form onSubmit={go}>
        <div className="field">
          <label htmlFor="pw">Password</label>
          <input id="pw" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!error} />
          {error && <span className="error">{error}</span>}
          {demo && <span className="hint">Demo mode: the password is demo</span>}
        </div>
        <button className="btn" style={{ width: "100%" }} disabled={!password || busy}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
