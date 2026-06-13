-- Keep persistent QA tenants available for end-to-end production checks while
-- excluding their synthetic activity from platform and finance reporting.

alter table public.galleries
  add column if not exists is_qa_account boolean not null default false;

create index if not exists idx_galleries_is_qa_account
  on public.galleries (is_qa_account)
  where is_qa_account = true;

comment on column public.galleries.is_qa_account is
  'Marks an isolated QA tenant. QA tenants remain functional but must be excluded from platform metrics and finance reporting.';
