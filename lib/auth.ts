import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { isDemo } from "./store";

/** One shared owner password, set as ADMIN_PASSWORD. Demo mode accepts "demo". */

const COOKIE = "owner_session";

function password() {
  return process.env.ADMIN_PASSWORD || (isDemo ? "demo" : "");
}

function token() {
  const secret = process.env.SESSION_SECRET || password();
  return createHmac("sha256", secret).update("owner:" + password()).digest("hex");
}

export function checkPassword(attempt: string) {
  const real = password();
  if (!real) return false;
  const a = Buffer.from(attempt);
  const b = Buffer.from(real);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function signIn() {
  (await cookies()).set(COOKIE, token(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function signOut() {
  (await cookies()).delete(COOKIE);
}

export async function isOwner() {
  if (!password()) return false;
  return (await cookies()).get(COOKIE)?.value === token();
}
