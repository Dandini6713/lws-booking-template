export type Kind = "booking" | "request" | "quote";
export type Status = "pending" | "confirmed" | "completed" | "cancelled";
export type Window = "morning" | "afternoon" | "evening";

export type Booking = {
  id: string;
  created_at: string;
  kind: Kind;
  status: Status;
  service_id: string | null;
  service_name: string | null;
  /** Live slot bookings only. */
  start_at: string | null;
  end_at: string | null;
  /** Basic tier requests only. */
  preferred_date: string | null;
  preferred_window: Window | null;
  name: string;
  email: string;
  phone: string;
  notes: string | null;
  /** Quote mode only. */
  job_type: string | null;
  postcode: string | null;
  deposit_amount: number | null;
  deposit_status: "none" | "pending" | "paid";
  reminder_sent: boolean;
};

export type NewBooking = Omit<Booking, "id" | "created_at" | "status" | "deposit_status" | "reminder_sent"> & {
  status?: Status;
  deposit_status?: Booking["deposit_status"];
};
