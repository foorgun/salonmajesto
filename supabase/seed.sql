-- Seed-Daten Salon Majesto (generiert aus src/config/salon.ts)
-- TODO: prüfen – Suad (laut Instagram „wieder da“, im Terminland-Formular nicht gelistet)
-- TODO: prüfen – Dauern geschätzt; Preis „Haare & Augenbrauen“ geschätzt; Inhalt/Preis „Salon Majesto Paket“

insert into public.barbers (slug, name, photo_url, sort) values
  ('enes', 'Enes', '/images/team-enes.jpg', 0),
  ('suad', 'Suad', '/images/team-suad.jpg', 1),
  ('yasin', 'Yasin', '/images/team-yasin.jpg', 2),
  ('yakup', 'Yakup', '/images/team-yakup.jpg', 3)
on conflict (slug) do update set sort = excluded.sort;

insert into public.services (slug, name, price_cents, duration_min, is_extra, sort) values
  ('haare', 'Haare', 2600, 30, false, 0),
  ('bart', 'Bart', 1600, 20, false, 1),
  ('augenbrauen', 'Augenbrauen', 700, 10, false, 2),
  ('haare-bart', 'Haare & Bart', 4200, 45, false, 3),
  ('haare-augenbrauen', 'Haare & Augenbrauen', 3300, 35, false, 4),
  ('haare-bart-augenbrauen', 'Haare, Bart & Augenbrauen', 4900, 50, false, 5),
  ('majesto-paket', 'Salon Majesto Paket (all inclusive)', 6500, 70, false, 6),
  ('waschen', '+ Waschen', 600, 10, true, 7),
  ('gesichtshaare-wachsen', 'Gesichtshaare wachsen', 1000, 10, true, 8),
  ('ohren-nase-wachsen', 'Ohren & Nase wachsen', 600, 5, true, 9)
on conflict (slug) do nothing;

-- Arbeitszeiten je Barber vorerst = Öffnungszeiten (Di–Fr 09–19, Sa 09–17). TODO: prüfen
insert into public.working_hours (barber_id, weekday, start_time, end_time)
select b.id, h.weekday, h.start_time, h.end_time
from public.barbers b
cross join (values
  (2, time '09:00', time '19:00'),
  (3, time '09:00', time '19:00'),
  (4, time '09:00', time '19:00'),
  (5, time '09:00', time '19:00'),
  (6, time '09:00', time '17:00')
) as h(weekday, start_time, end_time)
where not exists (select 1 from public.working_hours w where w.barber_id = b.id);

-- Admin anlegen (nach erstem Login-Versuch bzw. nach Anlegen des Users im Supabase-Dashboard):
-- insert into public.admins (user_id, email) select id, email from auth.users where email = 'barber@example.com';
