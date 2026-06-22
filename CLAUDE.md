# CLAUDE.md — working in the nomad repo

## What Nomad is

**Nomad is an investigation** — an ongoing, alternate-reality / world-building project that maps abandoned infrastructure in the American West, with game-like aspects. It is *not* a single map; it is an umbrella for many experiences, organized around entities that read and influence one another:

- **Sites** — the mapped abandoned places. A site is a *locked entity* (fixed identity + location); everything written onto it (history, building, memory, extraction, boom and bust) is *transient*. The place stays; its meaning moves.
- **The Atlas** — *one of many* visual representations of the investigation; where the Trail is made apparent.
- **The Trail** — the idea that any two places connect by a mode of travel and an interval of time. Exists in the atlas and the real world. Looks different to everyone. (Color reserved teal `#3fd9c0`; not built yet.)
- **Travellers (Nomads)** — humans moving between sites; they read *and influence* the atlas. The contributors.
- **The Encyclopedia** — keeps Nomad's knowledge current; explains how entities interact.

**Ethos:** the West's development was reckless and destructive, but Nomad does not judge it good or evil — it simply *was*. Travellers enter a site's history at a moment in time as visitors, caretakers, curators; they rebuild, tear down, pave over, and reconstruct both places and their histories. Keep this non-judgmental, layered-over-time sensibility in any feature.

## Current state

**Slice 1 (Sites foundation + Atlas) is complete and live.** A dark "Dust & Ember" MapLibre atlas renders ~962 western ghost-town sites (teal dormant / ember selected) with an honest Tier 1+2 detail panel, backed by Supabase.

Design + plan live in `docs/superpowers/`:
- Spec: `docs/superpowers/specs/2026-06-21-nomad-sites-atlas-design.md`
- Plan: `docs/superpowers/plans/2026-06-21-nomad-sites-atlas.md`

Each new entity/experience (Trail, Travellers/contributions, Encyclopedia, atlas Tier 3 filters / Tier 4 connections, data enrichment) is its own design → plan → build slice. Read the spec before extending the model.

## Stack

Next.js (App Router, TS strict) · MapLibre GL JS + MapTiler style · Supabase (Postgres) · Vitest. Deploys on Vercel.

## Data model

- `sites` — locked identity (id, slug, name, state, region, longitude, latitude).
- `site_records` — the **layering of time**: claims about a site at a moment in its history (year settled/abandoned, peak population, commodities, etc.) with a `verification_status` (default `presumed`). Seeded 1-per-site now; designed to become many-per-site so overlaying records shows boom/bust/rebirth.
- `site_current` — view: each site joined to its latest record. **The atlas reads only this view.**

Regions: `pacific` (CA OR WA AK), `mountain_west` (ID MT WY NV UT CO), `southwest` (AZ NM TX OK), `great_plains` (ND SD NE KS), else `latent`. The atlas surfaces the four western regions; default viewport frames the contiguous West (Alaska is loaded but off the initial view).

## Setup & commands

1. `npm install`
2. `.env.local` (gitignored) holds: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key), `SUPABASE_SERVICE_ROLE_KEY` (secret key — seed only), `NEXT_PUBLIC_MAPTILER_KEY`. See `.env.local.example`.
3. Apply migrations in `supabase/migrations/` to the Supabase project (DDL needs a DB connection / SQL editor — the PostgREST keys can't run DDL).
4. `npm run etl:seed` — clean the CSV and load Supabase (idempotent; loads `.env.local`).
5. `npm run dev` → http://localhost:3000
6. `npm test` — Vitest. `npx tsc --noEmit && npm run build` — type-check + production build.

The ETL is pure and unit-tested (`scripts/etl/`); `lib/sites.ts` is the only module that talks SQL; atlas components are dumb renderers fed by the server page.

## Workflow conventions

- **Trunk-based: commit and push directly to `master`** for this project. Do not open feature branches or PRs unless explicitly asked. Keep commits focused and incremental.
- **Tests + build must pass before every push** (`npm test`, then `npx tsc --noEmit && npm run build`). Never push red.
- Follow TDD for logic (ETL, mappers, pure functions). Match the existing "Dust & Ember" visual tokens exactly (see the spec's palette) — never improvise colors.
- **Never commit secrets.** `.env.local` and `*.tsbuildinfo` are gitignored; keep it that way.
- End commit messages with the project's Co-Authored-By / Claude-Session trailer used in history.
