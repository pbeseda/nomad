# Nomad — Roadmap & Future Work

> **Purpose.** This is the connective memory between sessions. It records where Nomad is going and *why*, including the small threads from the conversation that birthed Slice 1. Read it (with `CLAUDE.md` and the Slice 1 spec) before starting new work. Each future slice gets its own `docs/superpowers/specs/` + `docs/superpowers/plans/` cycle — this file is the backlog those cycles draw from, not a substitute for them.

Last updated: 2026-06-21 (end of Slice 1).

---

## The North Star (recap)

**Nomad is the investigation** — an alternate-reality / world-building project mapping abandoned infrastructure in the American West, with game-like aspects. It is an umbrella for many experiences. Entities read and influence one another:

- **Sites** — locked places; transient meaning. *(Built in Slice 1.)*
- **The Atlas** — one of many visual representations; where the Trail is made apparent. *(Tier 1+2 built.)*
- **The Trail** — any two places joined by a mode of travel and an interval of time; exists in the atlas *and* the real world; **looks different to everyone**. *(Not built. Color reserved: teal `#3fd9c0`.)*
- **Travellers (Nomads)** — humans moving between sites, occupying the spaces in and around them (even when refilled with new infrastructure); they **read and influence** the atlas; the **contributors**. *(Not built.)*
- **The Encyclopedia** — keeps Nomad's knowledge current; explains how entities interact. *(Not built.)*
- **…more entities revealed over time.** Leave room.

**Ethos to preserve in every feature:** the West's development was reckless and destructive, but Nomad does **not** judge it good or evil — it simply *was*. Travellers enter a site's history at a moment in time as visitors, caretakers, curators; they rebuild, tear down, pave over, renovate, reconstruct both the places *and their histories*. The place is locked; everything written onto it is transient. **Facts are claims, not truths** (hence `verification_status` and honest "— unrecorded").

---

## Status: Slice 1 — Sites foundation + Atlas ✅ (live on `master`)

Dark "Dust & Ember" MapLibre atlas of ~962 western sites (teal dormant / ember selected) + honest Tier 1+2 detail panel, backed by Supabase. Live-verified against the real DB. See `docs/superpowers/specs/2026-06-21-nomad-sites-atlas-design.md` and the plan beside it.

---

## Future slices (rough build order — each its own design → plan → build)

### A. Map-style fidelity — "Dust & Ember" on a real basemap
The locked mockup (`docs/design/02-dust-and-ember-locked.html`) is a stylized ideal; the live slippy map only *approximates* it. Tune the MapTiler style JSON toward the hand-drawn survey aesthetic: muted/desaturated rust land, ochre contour lines, faint graticule, the survey-instrument/CRT mood (subtle scanlines + vignette are already overlaid in `Atlas.module.css`). Goal: timeless — neither trendy dark-mode nor vintage parchment. Marker language is settled (teal dormant, ember selected, faint crosshair ticks + halo).

### B. Atlas Tier 3 — make the West explorable
Filter / highlight by **state**, **commodity**, **era** (settled/abandoned), and **known vs unknown**. Deferred from Slice 1 on purpose. The detail panel and data already carry these fields.

### C. The Trail — from whisper to engine
- **Tier 4 whisper (smaller first step):** select two sites → the atlas draws a connection annotated with distance and an implied interval (e.g. "412 mi"). Just the *seed* of the idea, in the reserved teal.
- **The engine (larger):** the Trail proper — mode of travel × interval of time, and the principle that **it looks different to everyone** (per-traveller/per-view rendering). Exists in the atlas *and* gestures at the real world.

### D. Travellers & contributions — the living layer
Identity / auth, then a contribution system. This is what `site_records` was built for: travellers **add records over time**, layering a site's history so overlaying records shows **boom → bust → rebirth**. Travellers rebuild, tear down, pave over, re-abandon. Honor the locked-place / transient-meaning model: never mutate the `sites` identity row; append/curate records. `verification_status` becomes a real workflow (presumed → reported → verified → disputed) and `recorded_by` gets populated.

### E. The Encyclopedia — the world's self-description
A canonical, evolving record of Nomad's entities and how they influence one another. Keeps knowledge current; explains the rules of the world to travellers. Likely both human-readable and the source of truth for entity relationships.

### F. Data enrichment & verification
Fill the empty history/mining fields from authoritative sources (USGS mines, US Census, GNIS): year settled/abandoned, commodities, mine size/type, mineral distribution, town area, peak population. Drive records up the verification ladder. Currently **everything is `presumed`** and most history fields are null (only ~30 of 1,439 rows came enriched).

### G. Reveal the latent territory
The whole US is already loaded and region-tagged; the atlas only surfaces the four western regions. As the investigation widens, reveal `latent` sites (TX/OK are already in `southwest`; Hawaii and the rest of the country sit `latent`; Alaska is `pacific` but kept out of the initial viewport). One config/query change to surface more.

### H. Deployment
Ship the atlas to Vercel (the stack is Vercel-ready). Wire env vars (Supabase keys, MapTiler key) as Vercel project secrets.

---

## Richer `site_records` — the time-layer fields (deferred design)

Slice 1 kept records simple. The user explicitly named these future fields so overlaying records can tell a place's full story:

- `as_of_year` — the point in the site's timeline a record describes (distinct from `recorded_at`, when a traveller logged it).
- `population_at_time` — population at a given moment (not all places are fully abandoned; some persist or were **repopulated**).
- `habitation_status` — abandoned / occupied / repopulated / **re-abandoned** ("places that cannot sustain habitation").
- `occupied_area` (geometry) — outline of the occupied area for places that **grew and shrank**.
- `recorded_by` — which traveller contributed the record.
- Possibly resurrect the original CSV's latent dimensions: **Coastal / Inland / Urban / Remote** geographic character (0 filled in source), Mine Type, Mineral Distribution, Duration (derived).

Overlaying these layers is what "**inspires travellers to build, to tear down, or to re-abandon**."

---

## Technical fast-follows (debt carried out of Slice 1)

From the task reviews; none block, all worth doing:

- **Seed smoke test** — spec §10 called for it (expected row counts, every site one `presumed` record, region distribution); `lib/smoke.test.ts` is still just a toolchain placeholder. (We *did* verify these live during Slice 1.)
- **Atlas selection effect** — silently no-ops if `selectedId` changes before the map style finishes loading (`components/atlas/Atlas.tsx`). Harmless today (clicks can't precede load); add a `load`/`idle` fallback before deep-linking or URL-driven selection.
- **`commodities ?? []` branch** in `lib/sites.ts` isn't observably unit-tested — add one assertion.
- **`vitest.config.ts` alias** uses `URL().pathname` (not Windows-portable); the `@` alias is currently unused.
- **`eslint-disable`** on the Atlas init effect lacks an inline rationale comment.
- **Slug de-collision** keys on the base slug, not the emitted suffix — negligible (DB `unique` constraint guards at seed), but tighten if dedup logic is touched.

*(Already resolved: `next-env.d.ts` / `*.tsbuildinfo` gitignored; seed loads `.env.local`; map inits once + `setData` sync; panel design fidelity + zero-value handling.)*

---

## Data notes (live DB, as of Slice 1 seed)

- 1,439 sites seeded; **1 row skipped** for an invalid coordinate (worth identifying/repairing if completeness matters).
- Western surfaced: **962** — `southwest` 435 (incl. TX/OK), `mountain_west` 309, `pacific` 183 (incl. AK), `great_plains` 35.
- Non-western states remain in the DB as `latent` (e.g. the original CSV's 254 Texas rows are now `southwest`; Florida 95, Michigan 72, etc. are `latent`).
- Most history/mining fields are null; all records are `presumed`. Source CSV had near-empty Coastal/Inland/Urban/Remote, Mine Type, Mineral Distribution, Town Area, Peak Population.

---

## Visual references (locked design)

Self-contained HTML mockups, openable in any browser:
- `docs/design/01-three-directions.html` — the three mood directions (Phosphor / Dust & Signal / Bone) we chose from.
- `docs/design/02-dust-and-ember-locked.html` — **the locked atlas look** (palette, markers, panel chrome).
- `docs/design/03-regions.html` — the regional scheme (Pacific / Mountain West / Southwest / Great Plains / latent), TX & OK resolved to Southwest.

Exact palette/typography tokens are in the Slice 1 spec's "Visual language" section.
