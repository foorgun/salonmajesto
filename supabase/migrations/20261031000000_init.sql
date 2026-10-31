-- Salon Majesto – Grundschema
-- Wochentage: 0 = Sonntag … 6 = Samstag (JS-Konvention)

create extension if not exists btree_gist;

create table public.barbers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  photo_url text,
  active boolean not null default true,
  sort integer not null default 0
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  price_cents integer not null check (price_cents >= 0),
  duration_min integer not null check (duration_min > 0),
  is_extra boolean not null default false,
  active boolean not null default true,
  sort integer not null default 0
);

create table public.working_hours (
  id bigint generated always as identity primary key,
  barber_id uuid not null references public.barbers (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);
create index working_hours_barber_idx on public.working_hours (barber_id, weekday);

-- barber_id null = ganzer Salon
create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid references public.barbers (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  check (ends_at > starts_at)
);
create index time_off_range_idx on public.time_off using gist (tstzrange(starts_at, ends_at, '[)'));

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null, -- inkl. Puffer
  customer_name text not null,
  phone text not null default '',
  email text,
  is_returning boolean not null default false,
  note text,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'no_show')),
  cancel_token text not null unique,
  source text not null default 'online' check (source in ('online', 'admin', 'walk_in')),
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Doppelbuchungen auf DB-Ebene verhindern
  constraint bookings_no_overlap exclude using gist (
    barber_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status <> 'cancelled')
);
create index bookings_starts_idx on public.bookings (starts_at);

-- Preise/Dauer zum Buchungszeitpunkt einfrieren
create table public.booking_services (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  service_id uuid not null references public.services (id),
  price_cents integer not null,
  duration_min integer not null,
  primary key (booking_id, service_id)
);

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text
);

-- ---------- Row Level Security ----------
alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.working_hours enable row level security;
alter table public.time_off enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_services enable row level security;
alter table public.admins enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Öffentlich: nur Lesen von aktiven Barbern/Leistungen und Arbeitszeiten aktiver Barber
create policy "public read barbers" on public.barbers for select using (active);
create policy "public read services" on public.services for select using (active);
create policy "public read working hours" on public.working_hours for select
  using (exists (select 1 from public.barbers b where b.id = barber_id and b.active));

-- Admins: Vollzugriff (Verfügbarkeit & Buchung laufen über Server Actions mit Service-Role-Key)
create policy "admin all barbers" on public.barbers for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all services" on public.services for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all working hours" on public.working_hours for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all time off" on public.time_off for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all bookings" on public.bookings for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all booking services" on public.booking_services for all using (public.is_admin()) with check (public.is_admin());
create policy "admin read self" on public.admins for select using (user_id = auth.uid());
