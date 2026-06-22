# nomad

An ongoing investigation in mapping abandoned infrastructure in the American West.

Nomad is the investigation; the Atlas is one of its visual representations. This
repo currently implements **Slice 1** — the Sites foundation and a minimal Atlas
(see `docs/superpowers/specs/2026-06-21-nomad-sites-atlas-design.md`).

## Stack
Next.js (App Router) · MapLibre GL JS + MapTiler · Supabase (Postgres) · Vitest.

## Setup
1. `npm install`
2. Copy `.env.local.example` to `.env.local` and fill in Supabase + MapTiler keys.
3. Apply the migration in `supabase/migrations/0001_init.sql` to your Supabase project.
4. Seed the data: `npm run etl:seed`
5. `npm run dev` → http://localhost:3000

## Data model
- `sites` — the locked entity: identity and canonical location.
- `site_records` — the layering of time: claims about a site at a moment in its history.
- `site_current` — view of each site joined to its latest record (what the atlas reads).

## Tests
`npm test`
