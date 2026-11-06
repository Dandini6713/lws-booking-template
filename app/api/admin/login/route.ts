import { NextResponse } from "next/server";
import { checkPassword, signIn, signOut } from "@/lib/auth";

export async function POST(req: Request) {
  const { password, action } = await req.json().catch(() => ({}));
  if (action === "logout") {
    await signOut();
    return NextResponse.json({ ok: true });
  }
  // Small fixed delay blunts password guessing.
  await new Promise((r) => setTimeout(r, 400));
  if (!checkPassword(String(password ?? ""))) {
    return NextResponse.json({ error: "That password isn't right" }, { status: 401 });
  }
  await signIn();
  return NextResponse.json({ ok: true });
}
