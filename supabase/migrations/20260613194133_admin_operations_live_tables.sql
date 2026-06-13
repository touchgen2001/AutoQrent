create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid references public.galleries(id) on delete set null,
  requester_name text,
  requester_email text,
  requester_phone text,
  subject text not null,
  body text,
  channel text not null default 'PANEL',
  status text not null default 'OPEN',
  priority text not null default 'MEDIUM',
  assigned_admin text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint support_tickets_subject_check check (char_length(trim(subject)) between 3 and 200),
  constraint support_tickets_channel_check check (channel in ('EMAIL', 'PHONE', 'WHATSAPP', 'PANEL')),
  constraint support_tickets_status_check check (status in ('OPEN', 'PENDING', 'SOLVED', 'CLOSED')),
  constraint support_tickets_priority_check check (priority in ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  constraint support_tickets_requester_email_check check (requester_email is null or position('@' in requester_email) > 1)
);

create table if not exists public.support_ticket_notes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author text not null,
  body text not null,
  internal boolean not null default true,
  created_at timestamptz not null default now(),
  constraint support_ticket_notes_body_check check (char_length(trim(body)) between 2 and 2000)
);

create table if not exists public.support_ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  file_name text not null,
  object_path text,
  size_bytes integer,
  mime_type text,
  uploaded_at timestamptz not null default now(),
  constraint support_ticket_attachments_file_name_check check (char_length(trim(file_name)) between 1 and 240),
  constraint support_ticket_attachments_size_check check (size_bytes is null or size_bytes >= 0)
);

create table if not exists public.support_ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  actor text not null,
  event text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint support_ticket_events_event_check check (char_length(trim(event)) between 2 and 500)
);

create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  source_audit_log_id bigint references public.audit_logs(id) on delete set null,
  gallery_id uuid references public.galleries(id) on delete set null,
  kind text not null,
  reporter text,
  severity text not null default 'MEDIUM',
  status text not null default 'NEW',
  reason text not null,
  evidence text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint moderation_reports_kind_check check (kind in ('SUSPICIOUS_GALLERY', 'SPAM_REPORT', 'ABUSE_REPORT')),
  constraint moderation_reports_severity_check check (severity in ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  constraint moderation_reports_status_check check (status in ('NEW', 'WARNED', 'SUSPENDED', 'CONTENT_REMOVED', 'DISMISSED')),
  constraint moderation_reports_reason_check check (char_length(trim(reason)) between 3 and 1000)
);

create table if not exists public.moderation_report_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.moderation_reports(id) on delete cascade,
  actor text not null,
  event text not null,
  status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint moderation_report_events_status_check check (status is null or status in ('NEW', 'WARNED', 'SUSPENDED', 'CONTENT_REMOVED', 'DISMISSED')),
  constraint moderation_report_events_event_check check (char_length(trim(event)) between 2 and 500)
);

create table if not exists public.admin_broadcasts (
  id uuid primary key default gen_random_uuid(),
  target text not null,
  subject text not null,
  body text not null,
  channel text not null default 'email',
  requested_by text not null,
  target_count integer not null default 0,
  delivery_provider text not null default 'not_connected',
  delivery_status text not null default 'audit_only',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_broadcasts_target_check check (target in ('ALL_TENANTS', 'ACTIVE_TENANTS', 'TRIAL_TENANTS', 'SUSPENDED_TENANTS')),
  constraint admin_broadcasts_channel_check check (channel in ('panel', 'email', 'sms', 'whatsapp')),
  constraint admin_broadcasts_subject_check check (char_length(trim(subject)) between 3 and 120),
  constraint admin_broadcasts_body_check check (char_length(trim(body)) between 5 and 1000),
  constraint admin_broadcasts_target_count_check check (target_count >= 0)
);

create index if not exists idx_support_tickets_gallery_id on public.support_tickets(gallery_id);
create index if not exists idx_support_tickets_status_updated_at on public.support_tickets(status, updated_at desc);
create index if not exists idx_support_ticket_notes_ticket_id on public.support_ticket_notes(ticket_id, created_at desc);
create index if not exists idx_support_ticket_attachments_ticket_id on public.support_ticket_attachments(ticket_id, uploaded_at desc);
create index if not exists idx_support_ticket_events_ticket_id on public.support_ticket_events(ticket_id, created_at desc);
create index if not exists idx_moderation_reports_gallery_id on public.moderation_reports(gallery_id);
create index if not exists idx_moderation_reports_status_created_at on public.moderation_reports(status, created_at desc);
create index if not exists idx_moderation_report_events_report_id on public.moderation_report_events(report_id, created_at desc);
create index if not exists idx_admin_broadcasts_created_at on public.admin_broadcasts(created_at desc);

create or replace function public.set_admin_operations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_support_tickets_updated_at on public.support_tickets;
create trigger trg_support_tickets_updated_at
before update on public.support_tickets
for each row
execute function public.set_admin_operations_updated_at();

drop trigger if exists trg_moderation_reports_updated_at on public.moderation_reports;
create trigger trg_moderation_reports_updated_at
before update on public.moderation_reports
for each row
execute function public.set_admin_operations_updated_at();

alter table public.support_tickets enable row level security;
alter table public.support_tickets force row level security;
alter table public.support_ticket_notes enable row level security;
alter table public.support_ticket_notes force row level security;
alter table public.support_ticket_attachments enable row level security;
alter table public.support_ticket_attachments force row level security;
alter table public.support_ticket_events enable row level security;
alter table public.support_ticket_events force row level security;
alter table public.moderation_reports enable row level security;
alter table public.moderation_reports force row level security;
alter table public.moderation_report_events enable row level security;
alter table public.moderation_report_events force row level security;
alter table public.admin_broadcasts enable row level security;
alter table public.admin_broadcasts force row level security;

drop policy if exists "Service role can manage support tickets" on public.support_tickets;
create policy "Service role can manage support tickets" on public.support_tickets
for all to service_role using (true) with check (true);

drop policy if exists "Service role can manage support ticket notes" on public.support_ticket_notes;
create policy "Service role can manage support ticket notes" on public.support_ticket_notes
for all to service_role using (true) with check (true);

drop policy if exists "Service role can manage support ticket attachments" on public.support_ticket_attachments;
create policy "Service role can manage support ticket attachments" on public.support_ticket_attachments
for all to service_role using (true) with check (true);

drop policy if exists "Service role can manage support ticket events" on public.support_ticket_events;
create policy "Service role can manage support ticket events" on public.support_ticket_events
for all to service_role using (true) with check (true);

drop policy if exists "Service role can manage moderation reports" on public.moderation_reports;
create policy "Service role can manage moderation reports" on public.moderation_reports
for all to service_role using (true) with check (true);

drop policy if exists "Service role can manage moderation report events" on public.moderation_report_events;
create policy "Service role can manage moderation report events" on public.moderation_report_events
for all to service_role using (true) with check (true);

drop policy if exists "Service role can manage admin broadcasts" on public.admin_broadcasts;
create policy "Service role can manage admin broadcasts" on public.admin_broadcasts
for all to service_role using (true) with check (true);

grant select, insert, update, delete on public.support_tickets to service_role;
grant select, insert, update, delete on public.support_ticket_notes to service_role;
grant select, insert, update, delete on public.support_ticket_attachments to service_role;
grant select, insert, update, delete on public.support_ticket_events to service_role;
grant select, insert, update, delete on public.moderation_reports to service_role;
grant select, insert, update, delete on public.moderation_report_events to service_role;
grant select, insert, update, delete on public.admin_broadcasts to service_role;
