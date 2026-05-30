alter table public.subscriptions
  add column if not exists trial_start timestamptz,
  add column if not exists trial_end   timestamptz;
