import { NextResponse } from "next/server";
import { isOwner } from "@/lib/auth";
import { getBooking, updateBooking } from "@/lib/store";
import { notifyReview } from "@/lib/notify";
import type { Status } from "@/lib/types";

const allowed: Status[] = ["pending", "confirmed", "completed", "cancelled"];

export async function PATCH(req: Request) {
  if (!(await isOwner())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id, status } = await req.json().catch(() => ({}));
  if (!allowed.includes(status)) return NextResponse.json({ error: "Unknown status" }, { status: 400 });
  const before = await getBooking(String(id));
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await updateBooking(before.id, { status });
  // Marking a visit done is the natural moment to ask for a review.
  if (b && status === "completed" && before.status !== "completed") await notifyReview(b);
  return NextResponse.json({ booking: b });
}
