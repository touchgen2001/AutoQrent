-- Operations suite:
-- - granular staff permissions
-- - WhatsApp/customer interaction history
-- - online vehicle reservation requests
-- - moderated gallery reviews and trust score
-- - recoverable vehicle deletion

alter table public.gallery_staff_members
  add column if not exists permissions text[] not null default '{}';

update public.gallery_staff_members
set permissions = case role
  when 'owner' then array[
    'vehicles.create',
    'vehicles.update',
    'vehicles.delete',
    'leads.manage',
    'whatsapp.manage',
    'reservations.manage',
    'reviews.manage',
    'reports.view',
    'audit.view',
    'settings.manage',
    'team.manage',
    'notifications.manage'
  ]::text[]
  when 'sales' then array[
    'leads.manage',
    'whatsapp.manage',
    'reservations.manage'
  ]::text[]
  else array['reports.view']::text[]
end
where cardinality(permissions) = 0;

alter table public.vehicles
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by_email text;

create index if not exists idx_vehicles_gallery_deleted_at
  on public.vehicles (gallery_id, deleted_at, created_at desc);

create table if not exists public.lead_interactions (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  actor_email text not null,
  channel text not null,
  direction text not null default 'outbound',
  template_key text,
  message_preview text,
  created_at timestamptz not null default now(),
  constraint lead_interactions_channel_check check (channel in ('whatsapp', 'phone', 'email', 'note')),
  constraint lead_interactions_direction_check check (direction in ('outbound', 'inbound'))
);

create index if not exists idx_lead_interactions_gallery_created
  on public.lead_interactions (gallery_id, created_at desc);

create index if not exists idx_lead_interactions_lead_created
  on public.lead_interactions (lead_id, created_at desc);

create table if not exists public.vehicle_reservations (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  note text,
  status text not null default 'pending',
  deposit_amount numeric(12,2) not null default 0,
  payment_status text not null default 'unpaid',
  handled_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_reservations_status_check check (status in ('pending', 'approved', 'declined', 'cancelled', 'completed')),
  constraint vehicle_reservations_payment_status_check check (payment_status in ('unpaid', 'pending', 'paid', 'refunded')),
  constraint vehicle_reservations_deposit_amount_check check (deposit_amount >= 0)
);

create index if not exists idx_vehicle_reservations_gallery_status
  on public.vehicle_reservations (gallery_id, status, created_at desc);

create index if not exists idx_vehicle_reservations_vehicle
  on public.vehicle_reservations (vehicle_id, created_at desc);

create table if not exists public.gallery_reviews (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  customer_name text not null,
  customer_email text,
  rating smallint not null,
  comment text not null,
  status text not null default 'pending',
  moderated_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gallery_reviews_rating_check check (rating between 1 and 5),
  constraint gallery_reviews_status_check check (status in ('pending', 'published', 'rejected'))
);

create index if not exists idx_gallery_reviews_gallery_status
  on public.gallery_reviews (gallery_id, status, created_at desc);

create or replace function public.set_operations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_vehicle_reservations_updated_at on public.vehicle_reservations;
create trigger trg_vehicle_reservations_updated_at
before update on public.vehicle_reservations
for each row execute function public.set_operations_updated_at();

drop trigger if exists trg_gallery_reviews_updated_at on public.gallery_reviews;
create trigger trg_gallery_reviews_updated_at
before update on public.gallery_reviews
for each row execute function public.set_operations_updated_at();

alter table public.lead_interactions enable row level security;
alter table public.lead_interactions force row level security;
alter table public.vehicle_reservations enable row level security;
alter table public.vehicle_reservations force row level security;
alter table public.gallery_reviews enable row level security;
alter table public.gallery_reviews force row level security;

drop policy if exists "Service role manages lead interactions" on public.lead_interactions;
create policy "Service role manages lead interactions"
on public.lead_interactions for all to service_role
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "Service role manages vehicle reservations" on public.vehicle_reservations;
create policy "Service role manages vehicle reservations"
on public.vehicle_reservations for all to service_role
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "Service role manages gallery reviews" on public.gallery_reviews;
create policy "Service role manages gallery reviews"
on public.gallery_reviews for all to service_role
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

grant select, insert, update, delete on public.lead_interactions to service_role;
grant select, insert, update, delete on public.vehicle_reservations to service_role;
grant select, insert, update, delete on public.gallery_reviews to service_role;
