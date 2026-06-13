-- Cebindegaleri is a single-user product. Keep the owner membership because
-- panel authentication depends on it, but prevent active staff memberships.

update public.gallery_staff_members
set
  status = 'suspended',
  permissions = array_remove(permissions, 'team.manage'),
  updated_at = now()
where role <> 'owner';

update public.gallery_staff_members
set
  permissions = array_remove(permissions, 'team.manage'),
  updated_at = now()
where role = 'owner'
  and 'team.manage' = any(permissions);

create or replace function public.enforce_single_gallery_user()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role <> 'owner' and new.status in ('active', 'invited') then
    raise exception 'Cebindegaleri tek kullanıcı hesabı ile çalışır.';
  end if;

  new.permissions = array_remove(coalesce(new.permissions, '{}'::text[]), 'team.manage');
  return new;
end;
$$;

drop trigger if exists trg_enforce_single_gallery_user on public.gallery_staff_members;

create trigger trg_enforce_single_gallery_user
before insert or update on public.gallery_staff_members
for each row
execute function public.enforce_single_gallery_user();
