export function clean(v: unknown, max = 200) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function validEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

export function validPhone(v: string) {
  return v.replace(/[^\d]/g, "").length >= 10;
}

/** Shared contact checks. Returns field errors keyed by input name. */
export function contactErrors(b: { name: string; email: string; phone: string }) {
  const e: Record<string, string> = {};
  if (b.name.length < 2) e.name = "Please add your name";
  if (!validEmail(b.email)) e.email = "That email doesn't look right";
  if (!validPhone(b.phone)) e.phone = "Please add a phone number we can reach you on";
  return e;
}
