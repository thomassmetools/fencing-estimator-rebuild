alter table public.lead_events
add column if not exists status text not null default 'new';

alter table public.lead_events
add column if not exists internal_notes text not null default '';

alter table public.lead_events
add column if not exists last_contacted_at timestamptz;

alter table public.lead_events
add column if not exists archived_at timestamptz;

alter table public.lead_events
add column if not exists deleted_at timestamptz;

alter table public.lead_events
add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lead_events_status_check'
      and conrelid = 'public.lead_events'::regclass
  ) then
    alter table public.lead_events
    add constraint lead_events_status_check
    check (status in ('new', 'contacted', 'quoted', 'won', 'lost'));
  end if;
end;
$$;

drop trigger if exists lead_events_touch_updated_at on public.lead_events;
create trigger lead_events_touch_updated_at
before update on public.lead_events
for each row
execute function public.touch_updated_at();

drop policy if exists "Admins can update their contractor leads" on public.lead_events;
create policy "Admins can update their contractor leads"
on public.lead_events
for update
using (
  exists (
    select 1
    from public.contractor_users cu
    where cu.contractor_id = lead_events.contractor_id
      and cu.auth_user_id = auth.uid()
      and cu.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.contractor_users cu
    where cu.contractor_id = lead_events.contractor_id
      and cu.auth_user_id = auth.uid()
      and cu.role = 'admin'
  )
);
