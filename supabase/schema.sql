create extension if not exists "pgcrypto";

create table if not exists public.contractors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  measurement_system text not null default 'metric' check (measurement_system in ('metric', 'imperial')),
  business_name text not null,
  phone text not null default '',
  email text not null default '',
  website text not null default '',
  facebook_url text not null default '',
  primary_color text not null default '#1d4f41',
  accent_color text not null default '#d8a64f',
  hero_label text not null default 'Outdoor quoting made simple',
  intro_text text not null default '',
  opening_line text not null default '',
  closing_line text not null default '',
  include_pricing_disclaimer boolean not null default true,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractors(id) on delete cascade,
  name text not null,
  description text not null default '',
  unit text not null check (unit in ('lineal metre', 'metre squared', 'each')),
  base_price numeric(12,2) not null default 0,
  is_featured boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contractors
add column if not exists measurement_system text not null default 'metric';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contractors_measurement_system_check'
      and conrelid = 'public.contractors'::regclass
  ) then
    alter table public.contractors
    add constraint contractors_measurement_system_check
    check (measurement_system in ('metric', 'imperial'));
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'products_unit_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products drop constraint products_unit_check;
  end if;

  alter table public.products
  add constraint products_unit_check
  check (unit in ('lineal metre', 'metre squared', 'lineal foot', 'square foot', 'each'));
end;
$$;

create table if not exists public.contractor_users (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractors(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now(),
  unique (contractor_id, auth_user_id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractors(id) on delete cascade,
  customer_email text not null,
  customer_name text not null default '',
  plan_code text not null default 'starter-monthly',
  status text not null default 'pending',
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_checkout_session_id text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

alter table public.subscriptions
add column if not exists current_period_end timestamptz;

create unique index if not exists subscriptions_stripe_subscription_id_key
on public.subscriptions (stripe_subscription_id)
where stripe_subscription_id is not null;

create table if not exists public.onboarding_progress (
  contractor_id uuid primary key references public.contractors(id) on delete cascade,
  current_step text not null default 'business-details',
  is_live boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_events (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractors(id) on delete cascade,
  customer_name text not null default '',
  customer_email text not null default '',
  customer_phone text not null default '',
  customer_address text not null default '',
  message text not null,
  measurement_mode text check (measurement_mode in ('distance')),
  measurement_value numeric(12,2),
  measurement_unit text,
  measurement_points jsonb not null default '[]'::jsonb,
  estimated_total numeric(12,2),
  selected_products_summary text[] not null default '{}',
  source text not null check (source in ('copy', 'email', 'submit')),
  status text not null default 'new' check (status in ('new', 'contacted', 'quoted', 'won', 'lost')),
  internal_notes text not null default '',
  notification_status text not null default 'pending' check (notification_status in ('pending', 'sent', 'skipped', 'failed')),
  notification_error text,
  submitter_fingerprint text,
  last_contacted_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lead_events
add column if not exists measurement_points jsonb not null default '[]'::jsonb;

alter table public.lead_events
add column if not exists status text not null default 'new';

alter table public.lead_events
add column if not exists internal_notes text not null default '';

alter table public.lead_events
add column if not exists notification_status text not null default 'pending';

alter table public.lead_events
add column if not exists notification_error text;

alter table public.lead_events
add column if not exists submitter_fingerprint text;

alter table public.lead_events
add column if not exists last_contacted_at timestamptz;

alter table public.lead_events
add column if not exists archived_at timestamptz;

alter table public.lead_events
add column if not exists deleted_at timestamptz;

alter table public.lead_events
add column if not exists updated_at timestamptz not null default now();

alter table public.lead_events
add column if not exists customer_address text not null default '';

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

create index if not exists lead_events_submitter_fingerprint_created_at_idx
on public.lead_events (contractor_id, submitter_fingerprint, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists contractors_touch_updated_at on public.contractors;
create trigger contractors_touch_updated_at
before update on public.contractors
for each row
execute function public.touch_updated_at();

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
before update on public.products
for each row
execute function public.touch_updated_at();

drop trigger if exists subscriptions_touch_updated_at on public.subscriptions;
create trigger subscriptions_touch_updated_at
before update on public.subscriptions
for each row
execute function public.touch_updated_at();

drop trigger if exists onboarding_progress_touch_updated_at on public.onboarding_progress;
create trigger onboarding_progress_touch_updated_at
before update on public.onboarding_progress
for each row
execute function public.touch_updated_at();

drop trigger if exists lead_events_touch_updated_at on public.lead_events;
create trigger lead_events_touch_updated_at
before update on public.lead_events
for each row
execute function public.touch_updated_at();

alter table public.contractors enable row level security;
alter table public.products enable row level security;
alter table public.contractor_users enable row level security;
alter table public.lead_events enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_billing_events enable row level security;
alter table public.onboarding_progress enable row level security;

drop policy if exists "Public can read published contractors" on public.contractors;
create policy "Public can read published contractors"
on public.contractors
for select
using (is_published = true);

drop policy if exists "Members can read their contractors" on public.contractors;
create policy "Members can read their contractors"
on public.contractors
for select
using (
  exists (
    select 1
    from public.contractor_users cu
    where cu.contractor_id = contractors.id
      and cu.auth_user_id = auth.uid()
  )
);

drop policy if exists "Admins can update their contractors" on public.contractors;
create policy "Admins can update their contractors"
on public.contractors
for update
using (
  exists (
    select 1
    from public.contractor_users cu
    where cu.contractor_id = contractors.id
      and cu.auth_user_id = auth.uid()
      and cu.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.contractor_users cu
    where cu.contractor_id = contractors.id
      and cu.auth_user_id = auth.uid()
      and cu.role = 'admin'
  )
);

drop policy if exists "Public can read products for published contractors" on public.products;
create policy "Public can read products for published contractors"
on public.products
for select
using (
  exists (
    select 1
    from public.contractors c
    where c.id = products.contractor_id
      and c.is_published = true
  )
);

drop policy if exists "Members can read their products" on public.products;
create policy "Members can read their products"
on public.products
for select
using (
  exists (
    select 1
    from public.contractor_users cu
    where cu.contractor_id = products.contractor_id
      and cu.auth_user_id = auth.uid()
  )
);

drop policy if exists "Admins can manage their products" on public.products;
create policy "Admins can manage their products"
on public.products
for all
using (
  exists (
    select 1
    from public.contractor_users cu
    where cu.contractor_id = products.contractor_id
      and cu.auth_user_id = auth.uid()
      and cu.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.contractor_users cu
    where cu.contractor_id = products.contractor_id
      and cu.auth_user_id = auth.uid()
      and cu.role = 'admin'
  )
);

drop policy if exists "Members can read their contractor memberships" on public.contractor_users;
create policy "Members can read their contractor memberships"
on public.contractor_users
for select
using (auth_user_id = auth.uid());

drop policy if exists "Public can create leads for published contractors" on public.lead_events;
create policy "Public can create leads for published contractors"
on public.lead_events
for insert
with check (
  exists (
    select 1
    from public.contractors c
    where c.id = lead_events.contractor_id
      and c.is_published = true
  )
);

drop policy if exists "Members can read their contractor leads" on public.lead_events;
create policy "Members can read their contractor leads"
on public.lead_events
for select
using (
  exists (
    select 1
    from public.contractor_users cu
    where cu.contractor_id = lead_events.contractor_id
      and cu.auth_user_id = auth.uid()
  )
);

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

drop policy if exists "Members can read their subscriptions" on public.subscriptions;
create policy "Members can read their subscriptions"
on public.subscriptions
for select
using (
  exists (
    select 1
    from public.contractor_users cu
    where cu.contractor_id = subscriptions.contractor_id
      and cu.auth_user_id = auth.uid()
  )
);

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

drop policy if exists "Members can read onboarding progress" on public.onboarding_progress;
create policy "Members can read onboarding progress"
on public.onboarding_progress
for select
using (
  exists (
    select 1
    from public.contractor_users cu
    where cu.contractor_id = onboarding_progress.contractor_id
      and cu.auth_user_id = auth.uid()
  )
);

drop policy if exists "Admins can update onboarding progress" on public.onboarding_progress;
create policy "Admins can update onboarding progress"
on public.onboarding_progress
for update
using (
  exists (
    select 1
    from public.contractor_users cu
    where cu.contractor_id = onboarding_progress.contractor_id
      and cu.auth_user_id = auth.uid()
      and cu.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.contractor_users cu
    where cu.contractor_id = onboarding_progress.contractor_id
      and cu.auth_user_id = auth.uid()
      and cu.role = 'admin'
  )
);

insert into public.contractors (
  slug,
  measurement_system,
  business_name,
  phone,
  email,
  website,
  facebook_url,
  primary_color,
  accent_color,
  hero_label,
  intro_text,
  opening_line,
  closing_line,
  include_pricing_disclaimer,
  is_published
)
values
(
  'tasman-fencing',
  'metric',
  'Tasman Fencing Co.',
  '+64 21 555 0199',
  'quotes@tasmanfencing.co.nz',
  'https://tasmanfencing.example',
  'https://facebook.com/tasmanfencing',
  '#1d4f41',
  '#d8a64f',
  'Outdoor quoting made simple',
  'Measure the site, choose your preferred fence style, and copy a clean enquiry message ready to send.',
  'Hi Tasman Fencing, I would like a quote for the following project:',
  'Please get in touch to confirm pricing, site access, and install timing.',
  true,
  true
),
(
  'boundaryline-rural',
  'metric',
  'Boundaryline Rural',
  '+64 27 444 8821',
  'hello@boundarylinerural.co.nz',
  'https://boundaryline.example',
  'https://facebook.com/boundaryline',
  '#55331d',
  '#9db86f',
  'Fast rural fence planning',
  'Built for Facebook traffic and website embeds so rural customers can self-measure before they call.',
  'Hello Boundaryline Rural, here is my fencing estimate request:',
  'Let me know the next step and whether you need site photos as well.',
  true,
  true
)
on conflict (slug) do update set
  business_name = excluded.business_name,
  measurement_system = excluded.measurement_system,
  phone = excluded.phone,
  email = excluded.email,
  website = excluded.website,
  facebook_url = excluded.facebook_url,
  primary_color = excluded.primary_color,
  accent_color = excluded.accent_color,
  hero_label = excluded.hero_label,
  intro_text = excluded.intro_text,
  opening_line = excluded.opening_line,
  closing_line = excluded.closing_line,
  include_pricing_disclaimer = excluded.include_pricing_disclaimer,
  is_published = excluded.is_published;

insert into public.products (contractor_id, name, description, unit, base_price, is_featured, display_order)
select c.id, p.name, p.description, p.unit, p.base_price, p.is_featured, p.display_order
from (
  values
    ('tasman-fencing', 'Aluminium slat fence', 'Modern horizontal slats with powder-coated finish.', 'lineal metre', 185, true, 0),
    ('tasman-fencing', 'Pool fencing panel', 'Compliant black tubular pool fencing.', 'lineal metre', 162, false, 1),
    ('tasman-fencing', 'Single pedestrian gate', 'Matching gate hardware and latch set included.', 'each', 690, false, 2),
    ('boundaryline-rural', 'Post and wire', 'Traditional rural fencing with treated timber posts.', 'lineal metre', 92, true, 0),
    ('boundaryline-rural', 'Deer fencing', 'High-tensile netting for lifestyle blocks and grazing paddocks.', 'lineal metre', 124, false, 1),
    ('boundaryline-rural', 'Farm gate', 'Heavy-duty galvanised swing gate.', 'each', 540, false, 2)
) as p(slug, name, description, unit, base_price, is_featured, display_order)
join public.contractors c on c.slug = p.slug
where not exists (
  select 1
  from public.products existing
  where existing.contractor_id = c.id
    and existing.name = p.name
);

insert into public.onboarding_progress (contractor_id, current_step, is_live)
select c.id, 'complete', true
from public.contractors c
where c.slug in ('tasman-fencing', 'boundaryline-rural')
on conflict (contractor_id) do update set
  current_step = excluded.current_step,
  is_live = excluded.is_live,
  completed_at = coalesce(public.onboarding_progress.completed_at, now());
