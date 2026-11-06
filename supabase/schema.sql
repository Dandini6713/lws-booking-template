-- Run once in the client's Supabase project: SQL Editor > New query > paste > Run.

create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  kind             text not null check (kind in ('booking','request','quote')),
  status           text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled')),
  service_id       text,
  service_name     text,
  start_at         timestamptz,
  end_at           timestamptz,
  preferred_date   date,
  preferred_window text check (preferred_window in ('morning','afternoon','evening')),
  name             text not null,
  email            text not null,
  phone            text not null,
  notes            text,
  job_type         text,
  postcode         text,
  deposit_amount   numeric(8,2),
  deposit_status   text not null default 'none' check (deposit_status in ('none','pending','paid')),
  reminder_sent    boolean not null default false
);

create index if not exists bookings_start_idx on public.bookings (start_at) where status <> 'cancelled';
create index if not exists bookings_status_idx on public.bookings (status);

-- Lock the table down. The app only talks to it from the server with the service role key,
-- so the public (anon) key can't read or write customer details.
alter table public.bookings enable row level security;
revoke all on public.bookings from anon, authenticated;
