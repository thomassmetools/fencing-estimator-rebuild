create table if not exists public.subscription_billing_events (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractors(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  stripe_event_id text not null unique,
  event_type text not null,
  invoice_id text,
  invoice_status text,
  amount_paid integer,
  amount_due integer,
  currency text,
  billing_reason text,
  period_end timestamptz,
  summary text not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.subscription_billing_events enable row level security;

drop policy if exists "Members can read billing events" on public.subscription_billing_events;
create policy "Members can read billing events"
on public.subscription_billing_events
for select
using (
  exists (
    select 1
    from public.contractor_users cu
    where cu.contractor_id = subscription_billing_events.contractor_id
      and cu.auth_user_id = auth.uid()
  )
);
