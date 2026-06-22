# Nomad — Sites Foundation + Atlas (Slice 1) — Design

- **Date:** 2026-06-21
- **Author:** Patrick Beseda (with Claude)
- **Status:** Approved design → ready for implementation plan
- **Scope:** First buildable slice of the larger Nomad investigation

---

## 1. What Nomad is

**Nomad is the investigation** — an ongoing, alternate-reality world-building project that maps abandoned infrastructure in the American West, with game-like aspects. It is *not* a single map. It is an umbrella for many experiences, organized around a set of entities that read and influence one another:

- **Sites** — the mapped abandoned places. A site is a *locked entity* (fixed identity and location), but everything written onto it — history, building, memory, extraction, accumulation, boom and bust — is *transient*. The place stays; its meaning moves.
- **The Atlas** — *one of many* visual representations of the investigation. Where the Trail is made apparent.
- **The Trail** — the ethereal idea that any two places can be connected by a mode of travel and an interval of time. Exists in the atlas and the real world. Looks different to everyone.
- **Travellers (Nomads)** — humans moving between sites, occupying the spaces in and around them (even when refilled with new infrastructure). They read *and influence* the atlas. They are the contributors.
- **The Encyclopedia** — keeps Nomad's knowledge current; explains how the entities interact.
- **…and more entities revealed over time.**

**Ethos.** The West was developed without intention or care — reckless, destructive. Nomad does not judge it as good or evil; it simply *was*. Travellers enter a site's history at a moment in time as visitors, caretakers, and curators — they rebuild, tear down, pave over, renovate, and reconstruct both the places and their histories.

This document specifies only the **first slice**: the **Sites foundation** and a **minimal Atlas**. They are the basis for everything else.

---

## 2. Slice 1 scope

**In scope**
- Clean and structure the existing dataset into a Postgres source of truth.
- Tag every site by region; surface the western regions in the atlas.
- A minimal Atlas: **Tier 1** (the map exists — all western sites as points) and **Tier 2** (sites are legible — click a site to see its detail panel, honest about what is unknown).
- The "Dust & Ember" visual language.

**Out of scope (the skeleton has these rooms; we do not furnish them yet)**
- The Trail engine and any visible trail (color is reserved; no rendering).
- Tier 3 (filters / search) and Tier 4 (two-site connection).
- Travellers: identity, auth, contributions, editing.
- The Encyclopedia.
- External data enrichment (USGS / census / GNIS).
- Richer time-layer record fields (as-of-year population, occupied-area outlines, repopulation / re-abandonment status).

---

## 3. Key decisions

| Decision | Choice |
|---|---|
| Platform | Web app |
| Stack | Next.js (App Router, TypeScript), MapLibre GL JS + MapTiler style, Supabase (Postgres), Vercel (deploy later) |
| Data scope | Whole US loaded, **tagged by region**; atlas opens in the West |
| Data architecture | **Supabase as source of truth** (Approach A); cleaned CSV seeded via migration + script |
| Data foundation depth | **Lean** — clean / structure / load + honesty about uncertainty; **no** external enrichment this slice |
| Atlas depth | **Tier 1 + Tier 2** only |
| Visual mood | **"Dust & Ember"** — dark mode; slate night + warm rust land; teal dormant sites; ember selected site; teal reserved for the Trail |

---

## 4. Architecture & project structure

Server Components read from Supabase; the map is a Client Component. ETL is pure, testable transformation isolated from the database. `lib/sites.ts` is the only module that knows SQL.

```
nomad/
  app/
    layout.tsx
    page.tsx                 # the Atlas (server component: fetch + compose)
    globals.css
  components/atlas/
    Atlas.tsx                # MapLibre container + MapTiler style (client)
    SitesLayer.tsx           # dormant (teal) / selected (ember) markers
    SiteDetailPanel.tsx      # Tier 2 panel
    TopBar.tsx
    Legend.tsx
  lib/
    supabase/
      client.ts              # browser client
      server.ts              # server client
    sites.ts                 # data-access queries (reads site_current)
    regions.ts               # region definition + state→region mapping
    types.ts                 # Site, SiteRecord, SiteCurrent types
  scripts/etl/
    clean.ts                 # CSV → normalized JSON (pure, unit-tested)
    seed.ts                  # normalized JSON → Supabase upsert (idempotent)
  supabase/migrations/
    0001_init.sql            # enums, sites, site_records, site_current view
  data/
    Ghost Towns - United States.csv   # raw input (kept as-is)
  .env.local.example
  README.md
```

Each unit has one job and a clear interface: ETL transforms data (no DB), `lib/sites.ts` queries it, atlas components render what the server page hands them.

---

## 5. Data model

The thesis — *the place is locked; everything written onto it is transient* — is encoded as **two tables plus a view**.

### `sites` — the locked entity (source of truth)
Identity and canonical location. Does not change after seeding.

```
id          uuid primary key default gen_random_uuid()
slug        text unique not null         -- e.g. "bannack-mt"
name        text not null
state       text not null                -- full state name
region      text not null                -- enum: see §6
longitude   double precision not null
latitude    double precision not null
created_at  timestamptz not null default now()
```
(No `source` column — after seeding, the CSV's provenance is moot.)

### `site_records` — the layering of time
Claims about a site at a moment in its history. Seeded **one per site** now; designed to become **one-to-many** so that overlaying records reveals a place's boom, bust, and rebirth — the layers that will later inspire Travellers to build, tear down, or re-abandon.

```
id                   uuid primary key default gen_random_uuid()
site_id              uuid not null references sites(id) on delete cascade
year_settled         int
year_abandoned       int
peak_population       int
commodities          text[]                              -- ['gold','silver']
mine_size            numeric                             -- garbage coerced to null
town_area_acres      numeric
notes                text
verification_status  text not null default 'presumed'    -- enum: see §6
recorded_at          timestamptz not null default now()
-- future: recorded_by, as_of_year, population_at_time,
--         occupied_area (geometry), habitation_status, ...
```

### `site_current` — the view the atlas reads
Each site joined to its **latest** record (by `recorded_at`). The atlas reads only this view, so it is indifferent to how many layers exist beneath a site. When contributions arrive later, the view's definition changes; the atlas does not.

**Indexes:** `sites(region)`, `site_records(site_id)`, `site_records(site_id, recorded_at desc)`.

---

## 6. Enumerations & region definition

**`verification_status`:** `presumed` (default) · `reported` · `verified` · `disputed`.
The seeded data is all `presumed` — the atlas never presents a claim as truth.

**`region`** values and state membership:

| Region | States | Surfaced at load? |
|---|---|---|
| `pacific` | California, Oregon, Washington, **Alaska** | Yes — but AK is outside the default viewport |
| `mountain_west` | Idaho, Montana, Wyoming, Nevada, Utah, Colorado | Yes |
| `southwest` | Arizona, New Mexico, **Texas, Oklahoma** | Yes |
| `great_plains` | North Dakota, South Dakota, Nebraska, Kansas | Yes |
| `latent` | All other states/territories (incl. Hawaii) | No — loaded, not surfaced |

The atlas surfaces the four western regions. **Default viewport** frames the contiguous western US; Alaska is a Pacific member but the map does not zoom to include it on load (reachable by panning / zooming out). Hawaii and Alaska's classification are single-line config changes.

---

## 7. Data foundation (ETL)

A one-time, re-runnable pipeline of pure transforms, then an idempotent seed.

**`clean.ts`** (pure functions, unit-tested):
1. Parse `data/Ghost Towns - United States.csv`.
2. Collapse duplicate columns (`"Town Name, State"` and the doubled `Year Settled`).
3. Coerce garbage to `null`: `#VALUE!`, `NA`, and broken mine-size artifacts (`-1918`, `-1877`); keep only sane non-negative numbers.
4. Split commodity strings (`"Gold, silver, lead"`) → lowercased, trimmed `text[]`.
5. Validate coordinates are within plausible US ranges; flag impossible ones.
6. Derive `slug` (`name` + state abbreviation, de-collided).
7. Tag `region` via `lib/regions.ts`.
8. Emit normalized output: **one `site` + one seed `site_record` per town.**

**`seed.ts`:** upserts sites and their seed records into Supabase. Idempotent (re-runnable) keyed on `slug`.

---

## 8. The Atlas (Tier 1 + 2)

- **`Atlas.tsx`** — MapLibre map on a MapTiler style, opening over the contiguous western US.
- **`SitesLayer.tsx`** — western sites as a GeoJSON source with data-driven styling: **teal** dormant, **ember** selected. Click selects a site.
- **`SiteDetailPanel.tsx`** — name, state, lat/long, the latest record's fields, `— unrecorded` for nulls, and the `◷ presumed · unverified` status badge.
- **`TopBar.tsx` / `Legend.tsx`** — wordmark, site count, live coordinate/zoom readout; legend for dormant/selected.

**Data flow:** `page.tsx` (server) → `lib/sites.ts` queries `site_current` where `region` in the four western regions → passes the array to `Atlas` (client) → MapLibre renders. All needed fields load up front (payload is tiny for ~western-region sites), so selecting a site is instant with no extra fetch.

**Map-style expectation.** The mockup's hand-drawn contour look is a stylized ideal. On a real slippy basemap we *approximate* "Dust & Ember": a darkened, desaturated MapTiler style for the land, then our ember/teal markers and chrome (top bar, legend, optional scanline/vignette) on top. The first build gets into the neighborhood; the style JSON is then tuned iteratively. It will not be pixel-identical to the mockup on day one.

---

## 9. Visual language — "Dust & Ember"

Dark mode. Cool ground, one warm presence. Color carries meaning: **warm = presence** (where you are looking / a traveller is), **cool teal = the Trail** (connection between places — reserved this slice).

**Marker semantics**
- **Dormant site** — teal `#3f9e90`, small, quiet. Recedes into the ground.
- **Selected site** — ember: core `#ffb13e`, halo gradient from `#f0a83c`, center dot `#fff0cf`. Ring + soft halo; crosshair reduced to four faint outboard ticks (the halo carries the eye).
- **Trail** — color reserved (`#3fd9c0`); not rendered this slice.

**Palette**
- Background: `#06080a` / `#070a0c` / `#0a0e10` (radial, lighter toward upper-right)
- Land (rust): `#241712`, `#201510`; contour lines (ochre): `#6a4126`; graticule: `#12181b`
- Wordmark: cream `#f0e6d2` with the `O` in ember `#f0a83c`
- Detail panel: bg `rgba(11,14,16,.78)`, border `#3a2c1c`; status badge text `#b98a3a` / border `#4a3a1f`; "unrecorded" `#5b615e`

**Typography**
- UI / headings: Inter (system sans fallback)
- Data, coordinates, labels, status: monospace (`ui-monospace`/Menlo), uppercase, wide letter-spacing

**Atmosphere:** faint scanlines + vignette over the map for a survey-instrument / CRT feel — restrained, timeless (neither trendy dark-mode nor vintage parchment).

---

## 10. Testing strategy

- **TDD on `clean.ts`** — the heart of correctness. Cover: garbage → null coercion, commodity splitting, region tagging (incl. swing states TX/OK → southwest, AK → pacific), coordinate validation, slug de-collision.
- **Seed smoke test** — expected row counts; every site has valid coordinates; every site has exactly one record defaulting to `presumed`; region distribution matches §6.
- **Light render test** for `SiteDetailPanel` — renders `unrecorded` and `presumed` states correctly.
- **Map interaction** — verified manually.

---

## 11. Secrets & configuration

No secrets in source. `.env.local` (gitignored) holds:
- Supabase project URL + anon key (+ service-role key for the seed script only)
- `NEXT_PUBLIC_MAPTILER_KEY` for the map style

`.env.local.example` documents the required names. Supabase may be provisioned and migrated via the Supabase integration, or via credentials supplied out-of-band.

---

## 12. Future entities (named, not built)

Trail engine & visible trail · Tier 3 filters/search · Tier 4 two-site connection · Travellers (identity, auth, contributions, editing) · the Encyclopedia · external enrichment · richer time-layer record fields. Each becomes its own design → plan → implementation cycle, growing into the structure this slice establishes.
