create table if not exists public.gallery_subscriptions (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  owner_email text not null,
  plan_code text not null default 'starter',
  status text not null default 'trialing',
  billing_interval text not null default 'monthly',
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  provider text not null default 'manual',
  provider_customer_id text,
  provider_subscription_id text,
  payment_status text not null default 'not_connected',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gallery_subscriptions_gallery_unique unique (gallery_id),
  constraint gallery_subscriptions_plan_code_check check (plan_code in ('starter', 'pro', 'premium', 'enterprise')),
  constraint gallery_subscriptions_status_check check (status in ('trialing', 'active', 'past_due', 'canceled', 'expired', 'suspended')),
  constraint gallery_subscriptions_billing_interval_check check (billing_interval in ('monthly', 'yearly')),
  constraint gallery_subscriptions_owner_email_check check (position('@' in owner_email) > 1)
);

create index if not exists idx_gallery_subscriptions_owner_email
  on public.gallery_subscriptions (lower(owner_email));

create index if not exists idx_gallery_subscriptions_status
  on public.gallery_subscriptions (status);

create index if not exists idx_gallery_subscriptions_trial_ends_at
  on public.gallery_subscriptions (trial_ends_at);

create or replace function public.set_gallery_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_gallery_subscriptions_updated_at on public.gallery_subscriptions;

create trigger trg_gallery_subscriptions_updated_at
before update on public.gallery_subscriptions
for each row
execute function public.set_gallery_subscriptions_updated_at();

alter table public.gallery_subscriptions enable row level security;
alter table public.gallery_subscriptions force row level security;

drop policy if exists "Gallery owners can read their subscription" on public.gallery_subscriptions;
create policy "Gallery owners can read their subscription"
on public.gallery_subscriptions
for select
to authenticated
using (
  auth.jwt() ->> 'email' is not null
  and lower(owner_email) = lower(auth.jwt() ->> 'email')
);

drop policy if exists "Service role can manage gallery subscriptions" on public.gallery_subscriptions;
create policy "Service role can manage gallery subscriptions"
on public.gallery_subscriptions
for all
to service_role
using (true)
with check (true);

grant select on public.gallery_subscriptions to authenticated;
grant select, insert, update, delete on public.gallery_subscriptions to service_role;

insert into public.gallery_subscriptions (
  gallery_id,
  owner_email,
  plan_code,
  status,
  billing_interval,
  trial_started_at,
  trial_ends_at,
  current_period_start,
  current_period_end,
  provider,
  payment_status,
  metadata
)
select
  galleries.id,
  lower(galleries.owner_email),
  'starter',
  'trialing',
  'monthly',
  now(),
  now() + interval '14 days',
  now(),
  now() + interval '14 days',
  'manual',
  'not_connected',
  jsonb_build_object(
    'source', 'migration_backfill',
    'note', 'Existing galleries receive a fresh 14 day trial window to avoid accidental lockout.'
  )
from public.galleries
where galleries.owner_email is not null
  and trim(galleries.owner_email) <> ''
on conflict (gallery_id) do nothing;
