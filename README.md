# Fencing Estimator Rebuild

A multi-tenant fencing estimator scaffold designed to be hosted once, shared from Facebook, and optionally embedded on contractor websites.

## What is now included

- Public estimator route per contractor at `/:slug`
- Contractor login at `/login`
- Protected admin route per contractor at `/admin/:slug`
- Supabase-backed contractor settings and product persistence
- Lead capture stored in Supabase and visible in admin
- Mapbox address search and optional satellite view
- Turnstile-protected lead submission through a Supabase Edge Function
- Leaflet map measurement flow for distance and area
- Product selector with rough material subtotals
- Copy-to-clipboard enquiry box for Messenger, email, or website forms
- Cloudflare Pages SPA routing support

## Local development

1. Create a Supabase project.
2. In the Supabase SQL editor, run [supabase/schema.sql](C:\Users\Thomas Howie\JS\fencing-estimator-rebuild\supabase\schema.sql).
3. Create at least one auth user in Supabase Authentication.
4. Insert a matching row into `contractor_users` linking that auth user to a contractor.
5. Copy `.env.example` to `.env.local` and fill in your Supabase URL and anon key.
6. Add your Mapbox public token and Cloudflare Turnstile site key to `.env.local`.
7. Start the app:

```bash
npm install
npm run dev
```

If Supabase env vars are missing, the public pages fall back to seed data, but admin login stays disabled until the backend is configured.

For the new map and anti-bot features:

- `VITE_MAPBOX_ACCESS_TOKEN` enables address search and satellite view
- `VITE_TURNSTILE_SITE_KEY` enables the Turnstile widget on lead submission

## Deployment on Cloudflare Pages

1. Push this project to GitHub.
2. In Cloudflare Pages, create a new project from that repo.
3. Use these build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Add environment variables in Cloudflare Pages:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_MAPBOX_ACCESS_TOKEN`
   - `VITE_TURNSTILE_SITE_KEY`
5. Deploy.

The [public/_redirects](C:\Users\Thomas Howie\JS\fencing-estimator-rebuild\public\_redirects) file ensures direct visits to routes like `/tasman-fencing` and `/admin/tasman-fencing` resolve correctly in a static Pages deployment.

The optional [wrangler.toml](C:\Users\Thomas Howie\JS\fencing-estimator-rebuild\wrangler.toml) file is included so you can also deploy with Wrangler if you prefer.

## Supabase structure

Core tables:

- `contractors`
- `products`
- `contractor_users`
- `lead_events`

The schema file also includes:

- seeded sample contractors and products
- row-level security policies for public reads and contractor-only admin access
- update timestamp triggers
- stored lead geometry for replaying customer pins later

## App structure

- [src/App.tsx](C:\Users\Thomas Howie\JS\fencing-estimator-rebuild\src\App.tsx): route wiring
- [src/contexts/AuthContext.tsx](C:\Users\Thomas Howie\JS\fencing-estimator-rebuild\src\contexts\AuthContext.tsx): Supabase session handling
- [src/lib/repository.ts](C:\Users\Thomas Howie\JS\fencing-estimator-rebuild\src\lib\repository.ts): contractor and product data access
- [src/pages/LoginPage.tsx](C:\Users\Thomas Howie\JS\fencing-estimator-rebuild\src\pages\LoginPage.tsx): contractor login screen
- [src/pages/EstimatorPage.tsx](C:\Users\Thomas Howie\JS\fencing-estimator-rebuild\src\pages\EstimatorPage.tsx): customer estimator
- [src/pages/AdminPage.tsx](C:\Users\Thomas Howie\JS\fencing-estimator-rebuild\src\pages\AdminPage.tsx): protected admin flow

## Linking Supabase users to contractors

After you create a user in Supabase Authentication, use SQL like this in the SQL editor:

```sql
select id, email
from auth.users
order by created_at desc;
```

Then link the chosen user to a contractor:

```sql
insert into public.contractor_users (contractor_id, auth_user_id, role)
select c.id, '00000000-0000-0000-0000-000000000000'::uuid, 'admin'
from public.contractors c
where c.slug = 'tasman-fencing'
on conflict (contractor_id, auth_user_id) do update
set role = excluded.role;
```

Examples you can adapt:

```sql
insert into public.contractor_users (contractor_id, auth_user_id, role)
select c.id, 'REPLACE_WITH_TASMAN_USER_ID'::uuid, 'admin'
from public.contractors c
where c.slug = 'tasman-fencing';

insert into public.contractor_users (contractor_id, auth_user_id, role)
select c.id, 'REPLACE_WITH_BOUNDARYLINE_USER_ID'::uuid, 'admin'
from public.contractors c
where c.slug = 'boundaryline-rural';
```

## Lead capture flow

The public estimator now records submitted leads through a protected edge function. Each lead stores:

- measurement totals
- the actual clicked map points
- selected products
- customer contact details

Admin users can review the most recent captured leads from the contractor admin screen.

## Edge Function Setup

Deploy the Supabase Edge Function used for protected lead submission:

```bash
supabase functions deploy submit-lead
```

Then set the Turnstile secret in Supabase:

```bash
supabase secrets set TURNSTILE_SECRET_KEY=your-turnstile-secret
```

The edge function also needs your standard Supabase function environment:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Recommended next product step

After this, the strongest next move is outbound notifications:

- email the contractor automatically when a lead is submitted
- optionally send the lead into a CRM or job tracking system
- add a status field so staff can mark leads as quoted, won, or lost
