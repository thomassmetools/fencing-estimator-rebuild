alter table public.lead_events
add column if not exists customer_address text not null default '';
