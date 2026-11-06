import type { Metadata } from "next";
import config, { features } from "@/business.config";
import { isOwner } from "@/lib/auth";
import { isDemo, listBookings } from "@/lib/store";
import AdminBoard from "@/components/AdminBoard";
import Login from "@/components/Login";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bookings", robots: { index: false, follow: false } };

export default async function Admin() {
  if (!features.dashboard) {
    return (
      <div className="shell" style={{ padding: "64px 20px" }}>
        <h1 className="display">Not included</h1>
        <p>The bookings dashboard is part of the Standard and Premium packages. New bookings arrive by email.</p>
      </div>
    );
  }
  if (!(await isOwner())) return <Login name={config.business.name} demo={isDemo} />;

  const bookings = await listBookings();
  return (
    <AdminBoard
      bookings={bookings}
      name={config.business.name}
      tz={config.hours.timezone}
      demo={isDemo}
      mode={config.mode}
    />
  );
}
