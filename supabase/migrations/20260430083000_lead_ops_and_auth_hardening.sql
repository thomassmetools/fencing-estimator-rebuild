alter table public.lead_events
add column if not exists notification_status text not null default 'pending';

alter table public.lead_events
add column if not exists notification_error text;

alter table public.lead_events
add column if not exists submitter_fingerprint text;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'lead_events_source_check'
      and conrelid = 'public.lead_events'::regclass
  ) then
    alter table public.lead_events drop constraint lead_events_source_check;
  end if;

  alter table public.lead_events
  add constraint lead_events_source_check
  check (source in ('copy', 'email', 'submit'));
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lead_events_notification_status_check'
      and conrelid = 'public.lead_events'::regclass
  ) then
    alter table public.lead_events
    add constraint lead_events_notification_status_check
    check (notification_status in ('pending', 'sent', 'skipped', 'failed'));
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'lead_events_measurement_mode_check'
      and conrelid = 'public.lead_events'::regclass
  ) then
    alter table public.lead_events drop constraint lead_events_measurement_mode_check;
  end if;

  alter table public.lead_events
  add constraint lead_events_measurement_mode_check
  check (measurement_mode in ('distance'));
end;
$$;

create index if not exists lead_events_submitter_fingerprint_created_at_idx
on public.lead_events (contractor_id, submitter_fingerprint, created_at desc);
