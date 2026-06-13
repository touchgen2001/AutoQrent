create table if not exists public.gallery_staff_members (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  full_name text not null,
  role text not null default 'sales',
  status text not null default 'active',
  invited_by_email text,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gallery_staff_members_gallery_email_unique unique (gallery_id, email),
  constraint gallery_staff_members_email_check check (position('@' in email) > 1),
  constraint gallery_staff_members_full_name_check check (length(trim(full_name)) >= 2),
  constraint gallery_staff_members_role_check check (role in ('owner', 'sales', 'viewer')),
  constraint gallery_staff_members_status_check check (status in ('active', 'invited', 'suspended'))
);

create index if not exists idx_gallery_staff_members_gallery_status
  on public.gallery_staff_members (gallery_id, status);

create index if not exists idx_gallery_staff_members_email
  on public.gallery_staff_members (lower(email));

create or replace function public.set_gallery_staff_members_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_gallery_staff_members_updated_at on public.gallery_staff_members;

create trigger trg_gallery_staff_members_updated_at
before update on public.gallery_staff_members
for each row
execute function public.set_gallery_staff_members_updated_at();

alter table public.gallery_staff_members enable row level security;
alter table public.gallery_staff_members force row level security;

drop policy if exists "Gallery staff can read their memberships" on public.gallery_staff_members;
create policy "Gallery staff can read their memberships"
on public.gallery_staff_members
for select
to authenticated
using (
  lower(email) = lower(auth.jwt() ->> 'email')
  or exists (
    select 1
    from public.galleries galleries
    where galleries.id = gallery_staff_members.gallery_id
      and lower(galleries.owner_email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Service role can manage gallery staff" on public.gallery_staff_members;
create policy "Service role can manage gallery staff"
on public.gallery_staff_members
for all
to service_role
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

grant select on public.gallery_staff_members to authenticated;
grant select, insert, update, delete on public.gallery_staff_members to service_role;

insert into public.gallery_staff_members (
  gallery_id,
  email,
  full_name,
  role,
  status,
  invited_by_email,
  accepted_at
)
select
  galleries.id,
  lower(galleries.owner_email),
  'Galeri Sahibi',
  'owner',
  'active',
  lower(galleries.owner_email),
  now()
from public.galleries galleries
where galleries.owner_email is not null
  and trim(galleries.owner_email) <> ''
on conflict (gallery_id, email) do update
set
  role = 'owner',
  status = 'active',
  accepted_at = coalesce(public.gallery_staff_members.accepted_at, now()),
  updated_at = now();
