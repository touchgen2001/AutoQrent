-- Durable, shared rate limits for serverless deployments and database-side
-- aggregation for the most frequently opened gallery analytics screen.

create table if not exists public.request_rate_limits (
  key_hash text primary key,
  request_count integer not null default 0,
  reset_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint request_rate_limits_count_check check (request_count >= 0)
);

create index if not exists idx_request_rate_limits_reset_at
  on public.request_rate_limits (reset_at);

create index if not exists idx_leads_gallery_created_at
  on public.leads (gallery_id, created_at desc);

alter table public.request_rate_limits enable row level security;
alter table public.request_rate_limits force row level security;

revoke all on table public.request_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.request_rate_limits to service_role;

create or replace function public.consume_request_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_count integer;
  current_reset_at timestamptz;
begin
  if length(trim(coalesce(p_key_hash, ''))) < 32 then
    raise exception 'rate limit key is invalid';
  end if;

  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'rate limit configuration is invalid';
  end if;

  insert into public.request_rate_limits as limits (
    key_hash,
    request_count,
    reset_at,
    updated_at
  )
  values (
    p_key_hash,
    1,
    now() + make_interval(secs => p_window_seconds),
    now()
  )
  on conflict (key_hash) do update
  set
    request_count = case
      when limits.reset_at <= now() then 1
      else limits.request_count + 1
    end,
    reset_at = case
      when limits.reset_at <= now() then now() + make_interval(secs => p_window_seconds)
      else limits.reset_at
    end,
    updated_at = now()
  returning request_count, reset_at
  into current_count, current_reset_at;

  return query
  select
    current_count <= p_limit,
    greatest(p_limit - current_count, 0),
    greatest(ceil(extract(epoch from (current_reset_at - now())))::integer, 1);
end;
$$;

revoke execute on function public.consume_request_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_request_rate_limit(text, integer, integer) to service_role;

create or replace function public.get_gallery_analytics_overview(
  p_gallery_id uuid,
  p_start_at timestamptz
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with active_vehicles as (
    select id, brand, model, variant, photos
    from public.vehicles
    where gallery_id = p_gallery_id
      and status = 'active'
      and deleted_at is null
  ),
  scoped_scans as (
    select scans.id, scans.vehicle_id, scans.scanned_at, scans.ip_hash
    from public.qr_scans scans
    join active_vehicles vehicles on vehicles.id = scans.vehicle_id
    where scans.scanned_at >= p_start_at
  ),
  scoped_leads as (
    select leads.vehicle_id, leads.created_at
    from public.leads leads
    where leads.gallery_id = p_gallery_id
      and leads.created_at >= p_start_at
  ),
  days as (
    select generate_series(
      date_trunc('day', p_start_at),
      date_trunc('day', now()),
      interval '1 day'
    ) as day
  ),
  daily_stats as (
    select
      to_char(days.day, 'YYYY-MM-DD') as date,
      (
        select count(*)::integer
        from scoped_scans
        where scanned_at >= days.day and scanned_at < days.day + interval '1 day'
      ) as scans,
      (
        select count(*)::integer
        from scoped_leads
        where created_at >= days.day and created_at < days.day + interval '1 day'
      ) as leads
    from days
    order by days.day
  ),
  hours as (
    select generate_series(0, 23) as hour
  ),
  hourly_stats as (
    select
      hours.hour,
      (
        select count(*)::integer
        from scoped_scans
        where extract(hour from scanned_at)::integer = hours.hour
      ) as scans
    from hours
    order by hours.hour
  ),
  vehicle_performance as (
    select
      vehicles.id as vehicle_id,
      trim(concat_ws(' ', vehicles.brand, vehicles.model, nullif(vehicles.variant, ''))) as vehicle_title,
      vehicles.photos[1] as image,
      count(distinct scans.id)::integer as scans,
      count(distinct leads.id)::integer as leads
    from active_vehicles vehicles
    left join public.qr_scans scans
      on scans.vehicle_id = vehicles.id
      and scans.scanned_at >= p_start_at
    left join public.leads leads
      on leads.vehicle_id = vehicles.id
      and leads.gallery_id = p_gallery_id
      and leads.created_at >= p_start_at
    group by vehicles.id, vehicles.brand, vehicles.model, vehicles.variant, vehicles.photos
    having count(distinct scans.ctid) > 0 or count(distinct leads.id) > 0
    order by scans desc, leads desc
    limit 25
  )
  select jsonb_build_object(
    'metrics', jsonb_build_object(
      'totalScans', (select count(*) from scoped_scans),
      'uniqueVisitors', (select count(distinct ip_hash) from scoped_scans where ip_hash is not null),
      'totalLeads', (select count(*) from scoped_leads),
      'totalVehicles', (select count(*) from active_vehicles)
    ),
    'dailyStats', coalesce((
      select jsonb_agg(jsonb_build_object('date', date, 'scans', scans, 'leads', leads) order by date)
      from daily_stats
    ), '[]'::jsonb),
    'hourlyStats', coalesce((
      select jsonb_agg(jsonb_build_object('hour', hour, 'scans', scans) order by hour)
      from hourly_stats
    ), '[]'::jsonb),
    'vehiclePerformance', coalesce((
      select jsonb_agg(jsonb_build_object(
        'vehicleId', vehicle_id,
        'vehicleTitle', vehicle_title,
        'image', image,
        'scans', scans,
        'leads', leads,
        'conversionRate', case when scans > 0 then round((leads::numeric / scans::numeric) * 100, 1) else 0 end
      ) order by scans desc, leads desc)
      from vehicle_performance
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.get_gallery_analytics_overview(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.get_gallery_analytics_overview(uuid, timestamptz) to service_role;
