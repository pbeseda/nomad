# Nomad — Sites Foundation + Atlas (Slice 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the raw ghost-town CSV into a Supabase source of truth and render a minimal, dark "Dust & Ember" Atlas of the American West's abandoned sites (Tier 1 + Tier 2).

**Architecture:** A Next.js (App Router, TypeScript) web app. Pure, unit-tested ETL cleans the CSV into normalized towns; an idempotent seed loads them into Postgres as two tables (`sites` = locked identity, `site_records` = time-layered claims) exposed through a `site_current` view. A server component reads the western regions from that view and hands them to a MapLibre client component that renders teal "dormant" markers and one ember "selected" marker with an honest detail panel.

**Tech Stack:** Next.js 15 / React 19, TypeScript (strict), MapLibre GL JS, MapTiler raster/vector style, Supabase (`@supabase/supabase-js`), Vitest + Testing Library, `csv-parse`, `tsx`, deployed on Vercel later.

## Global Constraints

- TypeScript `strict: true`. No `any` in committed code.
- No secrets in source. Env var names, verbatim: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (seed only), `NEXT_PUBLIC_MAPTILER_KEY`.
- `region` is exactly one of: `pacific`, `mountain_west`, `southwest`, `great_plains`, `latent`.
- `verification_status` is exactly one of: `presumed` (default), `reported`, `verified`, `disputed`. All seeded data is `presumed`.
- Region membership (verbatim): Pacific = California, Oregon, Washington, Alaska. Mountain West = Idaho, Montana, Wyoming, Nevada, Utah, Colorado. Southwest = Arizona, New Mexico, Texas, Oklahoma. Great Plains = North Dakota, South Dakota, Nebraska, Kansas. Everything else = `latent`.
- The atlas surfaces the four western regions. Default viewport frames the contiguous western US; Alaska is loaded and `pacific` but NOT in the initial view.
- Visual tokens (verbatim): dormant `#3f9e90`; ember core `#ffb13e`, mid `#f0a83c`, center dot `#fff0cf`; trail (reserved, unused) `#3fd9c0`; bg `#06080a`; wordmark cream `#f0e6d2`; panel bg `rgba(11,14,16,.78)`, border `#3a2c1c`; status text `#b98a3a`, status border `#4a3a1f`; unrecorded `#5b615e`.
- Branch: `nomad-slice-1-sites-atlas` (already created). Commit after every task.

---

## File Structure

| File | Responsibility |
|---|---|
| `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `vitest.setup.ts` | Project + tooling config |
| `.env.local.example` | Documents required env var names |
| `lib/types.ts` | Shared types: `Region`, `VerificationStatus`, `Site`, `SiteRecord`, `SiteCurrent`, `CleanedTown` |
| `lib/regions.ts` | `stateToRegion`, `isWesternRegion`, `WESTERN_REGIONS` |
| `scripts/etl/field-helpers.ts` | Pure cleaners: `coerceNumber`, `parseCommodities`, `isPlausibleUSCoordinate`, `slugify` |
| `scripts/etl/clean.ts` | `cleanCsv(content)` → `{ towns, skipped }` |
| `scripts/etl/seed.ts` | Idempotent loader: cleaned towns → Supabase |
| `supabase/migrations/0001_init.sql` | Enums/checks, `sites`, `site_records`, indexes, RLS, `site_current` view |
| `lib/supabase/server.ts` | Server Supabase client factory |
| `lib/supabase/client.ts` | Browser Supabase client factory |
| `lib/sites.ts` | `rowToSiteCurrent` mapper + `getWesternSites()` query |
| `components/atlas/SiteDetailPanel.tsx` | Tier 2 panel |
| `components/atlas/TopBar.tsx`, `Legend.tsx` | Chrome |
| `components/atlas/Atlas.tsx` | MapLibre map, markers, selection state |
| `app/layout.tsx`, `app/page.tsx`, `app/globals.css` | Fonts, server fetch + compose, visual language |
| `README.md` | Setup/run instructions |

---

## Task 1: Project scaffold + tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `vitest.setup.ts`, `.env.local.example`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Test: `lib/smoke.test.ts`

**Interfaces:**
- Produces: a building Next.js app and a working `npm test` (Vitest) command.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "nomad",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "etl:seed": "tsx scripts/etl/seed.ts"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "maplibre-gl": "^4.7.1",
    "@supabase/supabase-js": "^2.45.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "vitest": "^2.1.0",
    "@vitest/coverage-v8": "^2.1.0",
    "jsdom": "^25.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.5.0",
    "csv-parse": "^5.5.0",
    "tsx": "^4.19.0",
    "dotenv": "^16.4.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

- [ ] **Step 4: Create `vitest.config.ts` and `vitest.setup.ts`**

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: { "@": new URL(".", import.meta.url).pathname },
  },
});
```

`vitest.setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Create `.env.local.example`**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# Server-only, used by the seed script. Never expose to the browser.
SUPABASE_SERVICE_ROLE_KEY=

# MapTiler (map style)
NEXT_PUBLIC_MAPTILER_KEY=
```

- [ ] **Step 6: Create minimal app shell**

`app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOMAD",
  description: "An ongoing investigation in mapping abandoned infrastructure in the American West.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`app/page.tsx`:
```tsx
export default function Page() {
  return <main>NOMAD</main>;
}
```

`app/globals.css`:
```css
:root { color-scheme: dark; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; height: 100%; background: #06080a; color: #cdd4d2; }
```

- [ ] **Step 7: Write the smoke test**

`lib/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("toolchain", () => {
  it("runs tests", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 8: Install and verify**

Run: `npm install && npm test`
Expected: install succeeds; Vitest reports 1 passing test.

- [ ] **Step 9: Verify the app builds**

Run: `npm run build`
Expected: Next.js build completes with no type errors.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app + Vitest tooling"
```

---

## Task 2: Shared types

**Files:**
- Create: `lib/types.ts`
- Test: `lib/types.test.ts`

**Interfaces:**
- Produces: `Region`, `VerificationStatus`, `Site`, `SiteRecord`, `SiteCurrent`, `CleanedTown` used by every later task.

- [ ] **Step 1: Write the failing test**

`lib/types.test.ts`:
```ts
import { describe, it, expectTypeOf } from "vitest";
import type { Region, SiteCurrent, CleanedTown } from "./types";

describe("types", () => {
  it("Region is a closed union", () => {
    expectTypeOf<Region>().toEqualTypeOf<
      "pacific" | "mountain_west" | "southwest" | "great_plains" | "latent"
    >();
  });
  it("SiteCurrent carries an optional record", () => {
    const s: SiteCurrent = {
      id: "1", slug: "a-utah", name: "A", state: "Utah", region: "mountain_west",
      longitude: -111, latitude: 39, record: null,
    };
    expectTypeOf(s.record).toEqualTypeOf<CleanedTown["record"] | null>();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/types.test.ts`
Expected: FAIL — cannot find module `./types`.

- [ ] **Step 3: Write `lib/types.ts`**

```ts
export type Region =
  | "pacific"
  | "mountain_west"
  | "southwest"
  | "great_plains"
  | "latent";

export type VerificationStatus =
  | "presumed"
  | "reported"
  | "verified"
  | "disputed";

export interface Site {
  id: string;
  slug: string;
  name: string;
  state: string;
  region: Region;
  longitude: number;
  latitude: number;
}

export interface SiteRecord {
  yearSettled: number | null;
  yearAbandoned: number | null;
  peakPopulation: number | null;
  commodities: string[];
  mineSize: number | null;
  townAreaAcres: number | null;
  notes: string | null;
  verificationStatus: VerificationStatus;
}

/** Output of the ETL: a locked site plus its single seed record. */
export interface CleanedTown {
  site: Omit<Site, "id">;
  record: SiteRecord;
}

/** A row of the `site_current` view: site identity + latest record (or none). */
export interface SiteCurrent extends Site {
  record: SiteRecord | null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts lib/types.test.ts
git commit -m "feat: shared domain types for sites and records"
```

---

## Task 3: Region definition

**Files:**
- Create: `lib/regions.ts`
- Test: `lib/regions.test.ts`

**Interfaces:**
- Consumes: `Region` from `lib/types.ts`.
- Produces: `WESTERN_REGIONS: Region[]`, `stateToRegion(state: string): Region`, `isWesternRegion(region: Region): boolean`.

- [ ] **Step 1: Write the failing test**

`lib/regions.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { stateToRegion, isWesternRegion, WESTERN_REGIONS } from "./regions";

describe("stateToRegion", () => {
  it("maps core western states", () => {
    expect(stateToRegion("California")).toBe("pacific");
    expect(stateToRegion("Alaska")).toBe("pacific");
    expect(stateToRegion("Colorado")).toBe("mountain_west");
    expect(stateToRegion("New Mexico")).toBe("southwest");
    expect(stateToRegion("Kansas")).toBe("great_plains");
  });
  it("puts swing states Texas and Oklahoma in southwest", () => {
    expect(stateToRegion("Texas")).toBe("southwest");
    expect(stateToRegion("Oklahoma")).toBe("southwest");
  });
  it("treats non-western states as latent", () => {
    expect(stateToRegion("Florida")).toBe("latent");
    expect(stateToRegion("Hawaii")).toBe("latent");
    expect(stateToRegion("Michigan")).toBe("latent");
  });
  it("trims whitespace", () => {
    expect(stateToRegion("  Utah ")).toBe("mountain_west");
  });
});

describe("isWesternRegion", () => {
  it("excludes latent", () => {
    expect(isWesternRegion("latent")).toBe(false);
    expect(isWesternRegion("pacific")).toBe(true);
  });
  it("WESTERN_REGIONS has the four western regions", () => {
    expect(WESTERN_REGIONS).toEqual([
      "pacific", "mountain_west", "southwest", "great_plains",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/regions.test.ts`
Expected: FAIL — cannot find module `./regions`.

- [ ] **Step 3: Write `lib/regions.ts`**

```ts
import type { Region } from "./types";

export const WESTERN_REGIONS: Region[] = [
  "pacific",
  "mountain_west",
  "southwest",
  "great_plains",
];

const STATE_REGION: Record<string, Region> = {
  // Pacific
  California: "pacific",
  Oregon: "pacific",
  Washington: "pacific",
  Alaska: "pacific",
  // Mountain West
  Idaho: "mountain_west",
  Montana: "mountain_west",
  Wyoming: "mountain_west",
  Nevada: "mountain_west",
  Utah: "mountain_west",
  Colorado: "mountain_west",
  // Southwest (incl. swing states Texas, Oklahoma)
  Arizona: "southwest",
  "New Mexico": "southwest",
  Texas: "southwest",
  Oklahoma: "southwest",
  // Great Plains
  "North Dakota": "great_plains",
  "South Dakota": "great_plains",
  Nebraska: "great_plains",
  Kansas: "great_plains",
};

export function stateToRegion(state: string): Region {
  return STATE_REGION[state.trim()] ?? "latent";
}

export function isWesternRegion(region: Region): boolean {
  return (WESTERN_REGIONS as string[]).includes(region);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/regions.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add lib/regions.ts lib/regions.test.ts
git commit -m "feat: region definition with TX/OK in southwest, AK in pacific"
```

---

## Task 4: ETL field helpers

**Files:**
- Create: `scripts/etl/field-helpers.ts`
- Test: `scripts/etl/field-helpers.test.ts`

**Interfaces:**
- Produces:
  - `coerceNumber(raw: string | undefined | null): number | null`
  - `parseCommodities(raw: string | undefined | null): string[]`
  - `isPlausibleUSCoordinate(lon: number, lat: number): boolean`
  - `slugify(name: string, state: string): string`

- [ ] **Step 1: Write the failing test**

`scripts/etl/field-helpers.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import {
  coerceNumber, parseCommodities, isPlausibleUSCoordinate, slugify,
} from "./field-helpers";

describe("coerceNumber", () => {
  it("parses clean numbers", () => {
    expect(coerceNumber("1862")).toBe(1862);
    expect(coerceNumber(" 10000 ")).toBe(10000);
    expect(coerceNumber("104")).toBe(104);
  });
  it("rejects CSV garbage as null", () => {
    expect(coerceNumber("#VALUE!")).toBeNull();
    expect(coerceNumber("NA")).toBeNull();
    expect(coerceNumber("")).toBeNull();
    expect(coerceNumber(undefined)).toBeNull();
    expect(coerceNumber(null)).toBeNull();
  });
  it("rejects negative artifacts as null", () => {
    expect(coerceNumber("-1918")).toBeNull();
    expect(coerceNumber("-1877")).toBeNull();
  });
});

describe("parseCommodities", () => {
  it("splits and lowercases", () => {
    expect(parseCommodities("Gold, silver, lead, copper"))
      .toEqual(["gold", "silver", "lead", "copper"]);
  });
  it("returns empty for blanks", () => {
    expect(parseCommodities("")).toEqual([]);
    expect(parseCommodities(undefined)).toEqual([]);
  });
});

describe("isPlausibleUSCoordinate", () => {
  it("accepts lower-48 and Alaska", () => {
    expect(isPlausibleUSCoordinate(-112.99, 45.16)).toBe(true); // Bannack
    expect(isPlausibleUSCoordinate(-152.77, 58.01)).toBe(true); // Afognak, AK
  });
  it("rejects 0,0 and out-of-range", () => {
    expect(isPlausibleUSCoordinate(0, 0)).toBe(false);
    expect(isPlausibleUSCoordinate(40, 40)).toBe(false);
    expect(isPlausibleUSCoordinate(Number.NaN, 45)).toBe(false);
  });
});

describe("slugify", () => {
  it("builds a slug from name and state", () => {
    expect(slugify("Bannack", "Montana")).toBe("bannack-montana");
    expect(slugify("St. Stephens", "Alabama")).toBe("st-stephens-alabama");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/etl/field-helpers.test.ts`
Expected: FAIL — cannot find module `./field-helpers`.

- [ ] **Step 3: Write `scripts/etl/field-helpers.ts`**

```ts
export function coerceNumber(raw: string | undefined | null): number | null {
  if (raw == null) return null;
  const s = raw.trim();
  if (s === "" || s === "NA" || s === "#VALUE!") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null; // broken artifacts like -1918, -1877
  return n;
}

export function parseCommodities(raw: string | undefined | null): string[] {
  if (raw == null) return [];
  return raw
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter((c) => c.length > 0);
}

export function isPlausibleUSCoordinate(lon: number, lat: number): boolean {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return false;
  if (lon === 0 && lat === 0) return false;
  // Generous box covering the lower 48, Alaska, and Hawaii.
  return lon >= -180 && lon <= -60 && lat >= 15 && lat <= 72;
}

export function slugify(name: string, state: string): string {
  return `${name} ${state}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/etl/field-helpers.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/etl/field-helpers.ts scripts/etl/field-helpers.test.ts
git commit -m "feat: pure ETL field cleaners"
```

---

## Task 5: ETL clean pipeline

**Files:**
- Create: `scripts/etl/clean.ts`
- Test: `scripts/etl/clean.test.ts`

**Interfaces:**
- Consumes: field helpers (Task 4), `stateToRegion` (Task 3), `CleanedTown` (Task 2).
- Produces: `cleanCsv(content: string): { towns: CleanedTown[]; skipped: { name: string; reason: string }[] }`.

CSV column indices (0-based): 1 name, 2 state, 3 longitude, 4 latitude, 9 year settled (10 = duplicate fallback), 11 year abandoned, 13 commodities, 14 mine size, 17 town area, 18 peak population.

- [ ] **Step 1: Write the failing test**

`scripts/etl/clean.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { cleanCsv } from "./clean";

const HEADER =
  '"Town Name, State",Town Name,State,Longitude,Latitude,Coastal,Inland,Urban,Remote,Year Settled,Year Settled,Year Abandoned,Duration (years),Commodities,Mine Size,Mine Type,Mineral Distribution,Town Area (acres),Peak Population';

function row(cols: Record<number, string>): string {
  const arr = Array.from({ length: 19 }, (_, i) => cols[i] ?? "");
  return arr.map((c) => (c.includes(",") ? `"${c}"` : c)).join(",");
}

describe("cleanCsv", () => {
  it("produces one site + one presumed record per valid town", () => {
    const csv = [
      HEADER,
      row({ 1: "Bannack", 2: "Montana", 3: "-112.99", 4: "45.16",
            9: "1862", 11: "1970", 13: "Gold", 18: "10000", 14: "108" }),
    ].join("\n");

    const { towns } = cleanCsv(csv);
    expect(towns).toHaveLength(1);
    expect(towns[0].site).toMatchObject({
      slug: "bannack-montana", name: "Bannack", state: "Montana",
      region: "mountain_west", longitude: -112.99, latitude: 45.16,
    });
    expect(towns[0].record).toMatchObject({
      yearSettled: 1862, yearAbandoned: 1970, peakPopulation: 10000,
      commodities: ["gold"], mineSize: 108, verificationStatus: "presumed",
    });
  });

  it("coerces garbage fields to null", () => {
    const csv = [
      HEADER,
      row({ 1: "Clayton", 2: "Idaho", 3: "-114.4", 4: "44.26",
            9: "1881", 11: "NA", 14: "#VALUE!" }),
    ].join("\n");
    const { towns } = cleanCsv(csv);
    expect(towns[0].record.yearAbandoned).toBeNull();
    expect(towns[0].record.mineSize).toBeNull();
  });

  it("skips rows with impossible coordinates", () => {
    const csv = [
      HEADER,
      row({ 1: "Nowhere", 2: "Utah", 3: "0", 4: "0" }),
    ].join("\n");
    const { towns, skipped } = cleanCsv(csv);
    expect(towns).toHaveLength(0);
    expect(skipped[0]).toMatchObject({ name: "Nowhere", reason: "invalid coordinate" });
  });

  it("de-collides duplicate slugs", () => {
    const csv = [
      HEADER,
      row({ 1: "Boston", 2: "Alabama", 3: "-86.48", 4: "31.46" }),
      row({ 1: "Boston", 2: "Alabama", 3: "-86.49", 4: "31.47" }),
    ].join("\n");
    const { towns } = cleanCsv(csv);
    expect(towns.map((t) => t.site.slug)).toEqual(["boston-alabama", "boston-alabama-2"]);
  });

  it("falls back to the duplicate Year Settled column", () => {
    const csv = [
      HEADER,
      row({ 1: "Cleator", 2: "Arizona", 3: "-112.1", 4: "34.1", 9: "", 10: "1864" }),
    ].join("\n");
    const { towns } = cleanCsv(csv);
    expect(towns[0].record.yearSettled).toBe(1864);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/etl/clean.test.ts`
Expected: FAIL — cannot find module `./clean`.

- [ ] **Step 3: Write `scripts/etl/clean.ts`**

```ts
import { parse } from "csv-parse/sync";
import type { CleanedTown } from "../../lib/types";
import { stateToRegion } from "../../lib/regions";
import {
  coerceNumber, parseCommodities, isPlausibleUSCoordinate, slugify,
} from "./field-helpers";

export interface CleanResult {
  towns: CleanedTown[];
  skipped: { name: string; reason: string }[];
}

const COL = {
  name: 1, state: 2, lon: 3, lat: 4,
  yearSettled: 9, yearSettledAlt: 10, yearAbandoned: 11,
  commodities: 13, mineSize: 14, townArea: 17, peakPop: 18,
} as const;

export function cleanCsv(content: string): CleanResult {
  const rows = parse(content, { skip_empty_lines: true }) as string[][];
  const dataRows = rows.slice(1); // drop header
  const towns: CleanedTown[] = [];
  const skipped: { name: string; reason: string }[] = [];
  const slugCounts = new Map<string, number>();

  for (const r of dataRows) {
    const name = (r[COL.name] ?? "").trim();
    const state = (r[COL.state] ?? "").trim();
    const longitude = Number((r[COL.lon] ?? "").trim());
    const latitude = Number((r[COL.lat] ?? "").trim());

    if (!name || !state) {
      skipped.push({ name: name || "(unnamed)", reason: "missing name/state" });
      continue;
    }
    if (!isPlausibleUSCoordinate(longitude, latitude)) {
      skipped.push({ name, reason: "invalid coordinate" });
      continue;
    }

    let slug = slugify(name, state);
    const seen = (slugCounts.get(slug) ?? 0) + 1;
    slugCounts.set(slug, seen);
    if (seen > 1) slug = `${slug}-${seen}`;

    towns.push({
      site: { slug, name, state, region: stateToRegion(state), longitude, latitude },
      record: {
        yearSettled: coerceNumber(r[COL.yearSettled]) ?? coerceNumber(r[COL.yearSettledAlt]),
        yearAbandoned: coerceNumber(r[COL.yearAbandoned]),
        peakPopulation: coerceNumber(r[COL.peakPop]),
        commodities: parseCommodities(r[COL.commodities]),
        mineSize: coerceNumber(r[COL.mineSize]),
        townAreaAcres: coerceNumber(r[COL.townArea]),
        notes: null,
        verificationStatus: "presumed",
      },
    });
  }

  return { towns, skipped };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/etl/clean.test.ts`
Expected: PASS (all five cases).

- [ ] **Step 5: Run the cleaner against the real CSV (sanity check)**

Create a throwaway check, run it, then delete it:
```bash
npx tsx -e "import('./scripts/etl/clean.ts').then(async m => { const fs = await import('node:fs'); const { towns, skipped } = m.cleanCsv(fs.readFileSync('data/Ghost Towns - United States.csv','utf8')); console.log('towns', towns.length, 'skipped', skipped.length); const west = towns.filter(t => t.site.region !== 'latent'); console.log('western', west.length); })"
```
Expected: ~1439 towns (minus any skipped), a nonzero "western" count in the hundreds, skipped is small.

- [ ] **Step 6: Commit**

```bash
git add scripts/etl/clean.ts scripts/etl/clean.test.ts
git commit -m "feat: CSV clean pipeline producing sites + seed records"
```

---

## Task 6: Database migration

**Files:**
- Create: `supabase/migrations/0001_init.sql`

**Interfaces:**
- Produces: tables `sites`, `site_records`; view `site_current`; public read RLS. Columns consumed by `lib/sites.ts` (Task 8): `site_current(id, slug, name, state, region, longitude, latitude, year_settled, year_abandoned, peak_population, commodities, mine_size, town_area_acres, notes, verification_status)`.

- [ ] **Step 1: Write `supabase/migrations/0001_init.sql`**

```sql
-- Nomad slice 1: sites (locked identity) + site_records (layering of time)

create extension if not exists "pgcrypto";

create table sites (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  state       text not null,
  region      text not null
              check (region in ('pacific','mountain_west','southwest','great_plains','latent')),
  longitude   double precision not null,
  latitude    double precision not null,
  created_at  timestamptz not null default now()
);

create table site_records (
  id                  uuid primary key default gen_random_uuid(),
  site_id             uuid not null references sites(id) on delete cascade,
  year_settled        int,
  year_abandoned      int,
  peak_population     int,
  commodities         text[] not null default '{}',
  mine_size           numeric,
  town_area_acres     numeric,
  notes               text,
  verification_status text not null default 'presumed'
                      check (verification_status in ('presumed','reported','verified','disputed')),
  recorded_at         timestamptz not null default now()
);

create index sites_region_idx on sites (region);
create index site_records_site_id_idx on site_records (site_id);
create index site_records_latest_idx on site_records (site_id, recorded_at desc);

-- Each site joined to its latest record. The atlas reads only this.
create view site_current as
select distinct on (s.id)
  s.id, s.slug, s.name, s.state, s.region, s.longitude, s.latitude,
  r.year_settled, r.year_abandoned, r.peak_population, r.commodities,
  r.mine_size, r.town_area_acres, r.notes, r.verification_status
from sites s
left join site_records r on r.site_id = s.id
order by s.id, r.recorded_at desc;

-- Public read; writes happen only via the service role (seed) for now.
alter table sites enable row level security;
alter table site_records enable row level security;
create policy "public read sites"   on sites        for select using (true);
create policy "public read records" on site_records for select using (true);
```

- [ ] **Step 2: Apply the migration to Supabase**

Apply via the Supabase integration/MCP (run the SQL against the project), or the Supabase CLI:
```bash
supabase db push   # if using the CLI with a linked project
```
Or paste the file contents into the Supabase SQL editor and run.

- [ ] **Step 3: Verify the schema exists**

Run this query in the Supabase SQL editor (or via MCP):
```sql
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('sites','site_records');
select table_name from information_schema.views
where table_schema = 'public' and table_name = 'site_current';
```
Expected: both tables and the view are listed.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_init.sql
git commit -m "feat: initial schema — sites, site_records, site_current view, RLS"
```

---

## Task 7: Supabase clients + seed loader

**Files:**
- Create: `lib/supabase/server.ts`, `lib/supabase/client.ts`, `scripts/etl/seed.ts`

**Interfaces:**
- Consumes: `cleanCsv` (Task 5), env vars (Global Constraints).
- Produces: `getServerSupabase()` (server, anon key), `getBrowserSupabase()` (browser, anon key). Seed script populates `sites` + `site_records`.

- [ ] **Step 1: Write `lib/supabase/server.ts`**

```ts
import { createClient } from "@supabase/supabase-js";

export function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}
```

- [ ] **Step 2: Write `lib/supabase/client.ts`**

```ts
"use client";

import { createClient } from "@supabase/supabase-js";

export function getBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}
```

- [ ] **Step 3: Write `scripts/etl/seed.ts`**

```ts
import "dotenv/config";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { cleanCsv } from "./clean";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Missing Supabase env (URL / service role)");

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const CSV_PATH = "data/Ghost Towns - United States.csv";
const CHUNK = 500;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const { towns, skipped } = cleanCsv(readFileSync(CSV_PATH, "utf8"));
  console.log(`cleaned ${towns.length} towns, skipped ${skipped.length}`);

  // Seed phase only: site_records are all seed rows, so clear before reseeding.
  await supabase.from("site_records").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // Upsert sites by slug (stable ids preserved across re-runs).
  for (const batch of chunk(towns, CHUNK)) {
    const { error } = await supabase.from("sites").upsert(
      batch.map((t) => t.site),
      { onConflict: "slug" },
    );
    if (error) throw error;
  }

  // Map slug -> id.
  const slugToId = new Map<string, string>();
  for (const batch of chunk(towns.map((t) => t.site.slug), CHUNK)) {
    const { data, error } = await supabase.from("sites").select("id, slug").in("slug", batch);
    if (error) throw error;
    for (const row of data ?? []) slugToId.set(row.slug, row.id);
  }

  // Insert one record per site.
  const records = towns.map((t) => ({
    site_id: slugToId.get(t.site.slug),
    year_settled: t.record.yearSettled,
    year_abandoned: t.record.yearAbandoned,
    peak_population: t.record.peakPopulation,
    commodities: t.record.commodities,
    mine_size: t.record.mineSize,
    town_area_acres: t.record.townAreaAcres,
    notes: t.record.notes,
    verification_status: t.record.verificationStatus,
  }));
  for (const batch of chunk(records, CHUNK)) {
    const { error } = await supabase.from("site_records").insert(batch);
    if (error) throw error;
  }

  console.log(`seeded ${records.length} records`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 4: Run the seed (requires `.env.local` with credentials)**

Run: `npm run etl:seed`
Expected: logs `cleaned N towns`, then `seeded N records` with no errors.

- [ ] **Step 5: Verify seeded data**

Run in Supabase SQL editor (or via MCP):
```sql
select count(*) from sites;
select region, count(*) from sites group by region order by 2 desc;
select count(*) from site_records where verification_status = 'presumed';
select count(*) from site_current where region <> 'latent';
```
Expected: `sites` count matches the seed log; every region present; all records `presumed`; western count in the hundreds.

- [ ] **Step 6: Commit**

```bash
git add lib/supabase/server.ts lib/supabase/client.ts scripts/etl/seed.ts
git commit -m "feat: supabase clients + idempotent seed loader"
```

---

## Task 8: Site query + row mapper

**Files:**
- Create: `lib/sites.ts`
- Test: `lib/sites.test.ts`

**Interfaces:**
- Consumes: `SiteCurrent`, `SiteRecord` (Task 2); `getServerSupabase` (Task 7); `WESTERN_REGIONS` (Task 3).
- Produces:
  - `rowToSiteCurrent(row: SiteCurrentRow): SiteCurrent` (pure, exported for testing)
  - `getWesternSites(): Promise<SiteCurrent[]>`
  - type `SiteCurrentRow` (snake_case shape returned by the view)

- [ ] **Step 1: Write the failing test**

`lib/sites.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { rowToSiteCurrent } from "./sites";

describe("rowToSiteCurrent", () => {
  it("maps a populated row to camelCase with a record", () => {
    const result = rowToSiteCurrent({
      id: "1", slug: "bannack-montana", name: "Bannack", state: "Montana",
      region: "mountain_west", longitude: -112.99, latitude: 45.16,
      year_settled: 1862, year_abandoned: 1970, peak_population: 10000,
      commodities: ["gold"], mine_size: 108, town_area_acres: null,
      notes: null, verification_status: "presumed",
    });
    expect(result).toMatchObject({
      id: "1", slug: "bannack-montana", region: "mountain_west",
      record: { yearSettled: 1862, peakPopulation: 10000, commodities: ["gold"],
                townAreaAcres: null, verificationStatus: "presumed" },
    });
  });

  it("yields a null record when the site has no record", () => {
    const result = rowToSiteCurrent({
      id: "2", slug: "x-utah", name: "X", state: "Utah", region: "mountain_west",
      longitude: -111, latitude: 39, year_settled: null, year_abandoned: null,
      peak_population: null, commodities: null, mine_size: null,
      town_area_acres: null, notes: null, verification_status: null,
    });
    expect(result.record).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/sites.test.ts`
Expected: FAIL — cannot find module `./sites`.

- [ ] **Step 3: Write `lib/sites.ts`**

```ts
import type { SiteCurrent, VerificationStatus, Region } from "./types";
import { getServerSupabase } from "./supabase/server";
import { WESTERN_REGIONS } from "./regions";

export interface SiteCurrentRow {
  id: string;
  slug: string;
  name: string;
  state: string;
  region: Region;
  longitude: number;
  latitude: number;
  year_settled: number | null;
  year_abandoned: number | null;
  peak_population: number | null;
  commodities: string[] | null;
  mine_size: number | null;
  town_area_acres: number | null;
  notes: string | null;
  verification_status: VerificationStatus | null;
}

export function rowToSiteCurrent(row: SiteCurrentRow): SiteCurrent {
  const hasRecord = row.verification_status !== null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    state: row.state,
    region: row.region,
    longitude: row.longitude,
    latitude: row.latitude,
    record: hasRecord
      ? {
          yearSettled: row.year_settled,
          yearAbandoned: row.year_abandoned,
          peakPopulation: row.peak_population,
          commodities: row.commodities ?? [],
          mineSize: row.mine_size,
          townAreaAcres: row.town_area_acres,
          notes: row.notes,
          verificationStatus: row.verification_status as VerificationStatus,
        }
      : null,
  };
}

export async function getWesternSites(): Promise<SiteCurrent[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("site_current")
    .select("*")
    .in("region", WESTERN_REGIONS);
  if (error) throw error;
  return (data as SiteCurrentRow[]).map(rowToSiteCurrent);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/sites.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/sites.ts lib/sites.test.ts
git commit -m "feat: western sites query + row mapper"
```

---

## Task 9: Site detail panel (Tier 2)

**Files:**
- Create: `components/atlas/SiteDetailPanel.tsx`, `components/atlas/SiteDetailPanel.module.css`
- Test: `components/atlas/SiteDetailPanel.test.tsx`

**Interfaces:**
- Consumes: `SiteCurrent` (Task 2).
- Produces: `<SiteDetailPanel site={SiteCurrent} onClose={() => void} />`.

- [ ] **Step 1: Write the failing test**

`components/atlas/SiteDetailPanel.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SiteDetailPanel } from "./SiteDetailPanel";
import type { SiteCurrent } from "../../lib/types";

const bannack: SiteCurrent = {
  id: "1", slug: "bannack-montana", name: "Bannack", state: "Montana",
  region: "mountain_west", longitude: -112.99, latitude: 45.16,
  record: {
    yearSettled: 1862, yearAbandoned: 1970, peakPopulation: 10000,
    commodities: ["gold"], mineSize: 108, townAreaAcres: null,
    notes: null, verificationStatus: "presumed",
  },
};

describe("SiteDetailPanel", () => {
  it("renders name, state, and known facts", () => {
    render(<SiteDetailPanel site={bannack} onClose={() => {}} />);
    expect(screen.getByText("Bannack")).toBeInTheDocument();
    expect(screen.getByText(/Montana/)).toBeInTheDocument();
    expect(screen.getByText("1862")).toBeInTheDocument();
    expect(screen.getByText("10,000")).toBeInTheDocument();
  });

  it("shows 'unrecorded' for missing facts", () => {
    render(<SiteDetailPanel site={bannack} onClose={() => {}} />);
    expect(screen.getByText(/unrecorded/i)).toBeInTheDocument(); // town area
  });

  it("shows the presumed/unverified status badge", () => {
    render(<SiteDetailPanel site={bannack} onClose={() => {}} />);
    expect(screen.getByText(/presumed/i)).toBeInTheDocument();
  });

  it("calls onClose when the close control is clicked", () => {
    const onClose = vi.fn();
    render(<SiteDetailPanel site={bannack} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/atlas/SiteDetailPanel.test.tsx`
Expected: FAIL — cannot find module `./SiteDetailPanel`.

- [ ] **Step 3: Write `components/atlas/SiteDetailPanel.module.css`**

```css
.panel {
  position: absolute; right: 18px; top: 64px; z-index: 7; width: 266px;
  padding: 18px 18px 20px; border-radius: 10px;
  background: rgba(11, 14, 16, 0.78); backdrop-filter: blur(7px);
  border: 1px solid #3a2c1c; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  font-family: Inter, system-ui, sans-serif; color: #cdd4d2;
}
.tag { font: 600 9.5px/1 ui-monospace, Menlo, monospace; letter-spacing: .22em;
  color: #a9744a; text-transform: uppercase; }
.name { font-size: 23px; font-weight: 600; color: #f4ead6; margin: 8px 0 3px; }
.coord { font: 600 11px/1 ui-monospace, Menlo, monospace; letter-spacing: .06em; color: #7e8682; }
.divider { height: 1px; background: #241d14; margin: 14px 0; }
.row { display: flex; justify-content: space-between; font-size: 12.5px; padding: 7px 0;
  border-bottom: 1px solid #181d20; }
.label { color: #737976; font: 600 10px/1.2 ui-monospace, Menlo, monospace;
  letter-spacing: .1em; text-transform: uppercase; align-self: center; }
.value { color: #dfd6c4; font-weight: 500; }
.warm { color: #f0a83c; }
.unknown { color: #5b615e; font-size: 11px; }
.status { margin-top: 14px; display: inline-block;
  font: 600 9.5px/1 ui-monospace, Menlo, monospace; letter-spacing: .14em;
  color: #b98a3a; border: 1px solid #4a3a1f; border-radius: 4px;
  padding: 5px 8px; text-transform: uppercase; }
.close { position: absolute; top: 12px; right: 12px; background: none; border: none;
  color: #7e8682; cursor: pointer; font-size: 16px; line-height: 1; }
```

- [ ] **Step 4: Write `components/atlas/SiteDetailPanel.tsx`**

```tsx
import type { SiteCurrent } from "../../lib/types";
import styles from "./SiteDetailPanel.module.css";

function fmtInt(n: number | null): string {
  return n === null ? "" : n.toLocaleString("en-US");
}

const UNRECORDED = "— unrecorded";

export function SiteDetailPanel({
  site, onClose,
}: { site: SiteCurrent; onClose: () => void }) {
  const r = site.record;
  const lat = site.latitude.toFixed(2);
  const lon = site.longitude.toFixed(2);

  const rows: { label: string; value: string; warm?: boolean; unknown?: boolean }[] = [
    { label: "Settled", value: fmtInt(r?.yearSettled ?? null) || UNRECORDED, unknown: !r?.yearSettled },
    { label: "Abandoned", value: fmtInt(r?.yearAbandoned ?? null) || UNRECORDED, warm: !!r?.yearAbandoned, unknown: !r?.yearAbandoned },
    { label: "Peak pop.", value: fmtInt(r?.peakPopulation ?? null) || UNRECORDED, unknown: !r?.peakPopulation },
    { label: "Commodity", value: r && r.commodities.length ? r.commodities.join(", ") : UNRECORDED, unknown: !r || r.commodities.length === 0 },
    { label: "Town area", value: r?.townAreaAcres != null ? `${r.townAreaAcres} ac` : UNRECORDED, unknown: r?.townAreaAcres == null },
  ];

  return (
    <aside className={styles.panel}>
      <button className={styles.close} onClick={onClose} aria-label="Close">×</button>
      <div className={styles.tag}>Site · {r?.verificationStatus ?? "unrecorded"}</div>
      <h2 className={styles.name}>{site.name}</h2>
      <div className={styles.coord}>
        {site.state.toUpperCase()} · {lat}°N {lon}°W
      </div>
      <div className={styles.divider} />
      {rows.map((row) => (
        <div className={styles.row} key={row.label}>
          <span className={styles.label}>{row.label}</span>
          <span className={`${styles.value} ${row.warm ? styles.warm : ""} ${row.unknown ? styles.unknown : ""}`}>
            {row.value}
          </span>
        </div>
      ))}
      <span className={styles.status}>
        ◷ {r?.verificationStatus ?? "presumed"} · unverified
      </span>
    </aside>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run components/atlas/SiteDetailPanel.test.tsx`
Expected: PASS (all four cases).

- [ ] **Step 6: Commit**

```bash
git add components/atlas/SiteDetailPanel.tsx components/atlas/SiteDetailPanel.module.css components/atlas/SiteDetailPanel.test.tsx
git commit -m "feat: Tier 2 site detail panel with honest unrecorded/presumed states"
```

---

## Task 10: Chrome — TopBar and Legend

**Files:**
- Create: `components/atlas/TopBar.tsx`, `components/atlas/Legend.tsx`, `components/atlas/chrome.module.css`

**Interfaces:**
- Produces:
  - `<TopBar siteCount={number} coord={string} />`
  - `<Legend />`

- [ ] **Step 1: Write `components/atlas/chrome.module.css`**

```css
.topbar { position: absolute; top: 0; left: 0; right: 0; z-index: 6; height: 46px;
  display: flex; align-items: center; gap: 18px; padding: 0 18px;
  background: linear-gradient(180deg, rgba(7,10,12,.85), rgba(7,10,12,0));
  font-family: Inter, system-ui, sans-serif; pointer-events: none; }
.wordmark { font-weight: 700; letter-spacing: .34em; font-size: 14px; color: #f0e6d2; }
.wordmark b { color: #f0a83c; }
.count { font: 600 11px/1 ui-monospace, Menlo, monospace; letter-spacing: .12em; color: #a9744a; }
.coord { font: 600 11px/1 ui-monospace, Menlo, monospace; letter-spacing: .12em;
  color: #7e8682; margin-left: auto; }
.legend { position: absolute; left: 18px; bottom: 18px; z-index: 6;
  font: 600 10px/1.85 ui-monospace, Menlo, monospace; letter-spacing: .08em;
  color: #7e8682; pointer-events: none; }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%;
  margin-right: 8px; vertical-align: middle; }
```

- [ ] **Step 2: Write `components/atlas/TopBar.tsx`**

```tsx
import styles from "./chrome.module.css";

export function TopBar({ siteCount, coord }: { siteCount: number; coord: string }) {
  return (
    <div className={styles.topbar}>
      <span className={styles.wordmark}>N<b>O</b>MAD</span>
      <span className={styles.count}>{siteCount.toLocaleString("en-US")} SITES · WEST</span>
      <span className={styles.coord}>{coord}</span>
    </div>
  );
}
```

- [ ] **Step 3: Write `components/atlas/Legend.tsx`**

```tsx
import styles from "./chrome.module.css";

export function Legend() {
  return (
    <div className={styles.legend}>
      <div><span className={styles.dot} style={{ background: "#3f9e90" }} />SITE · DORMANT</div>
      <div><span className={styles.dot} style={{ background: "#ffb13e", boxShadow: "0 0 8px #ffb13e" }} />SITE · SELECTED</div>
    </div>
  );
}
```

- [ ] **Step 4: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/atlas/TopBar.tsx components/atlas/Legend.tsx components/atlas/chrome.module.css
git commit -m "feat: atlas chrome — top bar and legend"
```

---

## Task 11: The Atlas map + page wiring (Tier 1 end-to-end)

**Files:**
- Create: `components/atlas/Atlas.tsx`, `components/atlas/Atlas.module.css`
- Modify: `app/page.tsx`, `app/layout.tsx`, `app/globals.css`

**Interfaces:**
- Consumes: `getWesternSites` (Task 8), `SiteCurrent` (Task 2), `SiteDetailPanel` (Task 9), `TopBar`/`Legend` (Task 10), `NEXT_PUBLIC_MAPTILER_KEY`.
- Produces: `<Atlas sites={SiteCurrent[]} />` (client component).

- [ ] **Step 1: Write `components/atlas/Atlas.module.css`**

```css
.root { position: fixed; inset: 0; }
.map { position: absolute; inset: 0; }
.map :global(.maplibregl-ctrl-attrib) { font-size: 9px; opacity: .5; }
.overlay {
  position: absolute; inset: 0; pointer-events: none; z-index: 4;
  box-shadow: inset 0 0 160px rgba(0,0,0,.6);
  background: repeating-linear-gradient(0deg, rgba(0,0,0,.10) 0 1px, transparent 1px 3px);
}
```

- [ ] **Step 2: Write `components/atlas/Atlas.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { SiteCurrent } from "../../lib/types";
import { SiteDetailPanel } from "./SiteDetailPanel";
import { TopBar } from "./TopBar";
import { Legend } from "./Legend";
import styles from "./Atlas.module.css";

const KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
// Dark, desaturated MapTiler vector style (tuned further later).
const STYLE_URL = `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${KEY}`;
// Contiguous western US: [west, south, east, north]. Excludes Alaska on load.
const WEST_BOUNDS: maplibregl.LngLatBoundsLike = [[-125, 31], [-96, 49]];

function toFeatureCollection(sites: SiteCurrent[]) {
  return {
    type: "FeatureCollection" as const,
    features: sites.map((s) => ({
      type: "Feature" as const,
      id: s.id,
      geometry: { type: "Point" as const, coordinates: [s.longitude, s.latitude] },
      properties: { id: s.id },
    })),
  };
}

export function Atlas({ sites }: { sites: SiteCurrent[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [coord, setCoord] = useState("");

  const byId = useMemo(() => new Map(sites.map((s) => [s.id, s])), [sites]);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      bounds: WEST_BOUNDS,
      fitBoundsOptions: { padding: 40 },
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("sites", { type: "geojson", data: toFeatureCollection(sites) });
      map.addLayer({
        id: "sites-dormant",
        type: "circle",
        source: "sites",
        paint: {
          "circle-radius": ["case", ["boolean", ["feature-state", "selected"], false], 7, 3],
          "circle-color": ["case", ["boolean", ["feature-state", "selected"], false], "#ffb13e", "#3f9e90"],
          "circle-opacity": 0.9,
          "circle-stroke-width": ["case", ["boolean", ["feature-state", "selected"], false], 2, 0],
          "circle-stroke-color": "#ffb13e",
        },
      });

      map.on("click", "sites-dormant", (e) => {
        const f = e.features?.[0];
        if (f) setSelectedId(String(f.properties?.id));
      });
      map.on("mouseenter", "sites-dormant", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "sites-dormant", () => { map.getCanvas().style.cursor = ""; });
    });

    map.on("move", () => {
      const c = map.getCenter();
      setCoord(`${c.lat.toFixed(2)}°N ${c.lng.toFixed(2)}°W · z${map.getZoom().toFixed(0)}`);
    });

    return () => { map.remove(); mapRef.current = null; };
  }, [sites]);

  // Drive selected feature-state from React.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    for (const s of sites) {
      map.setFeatureState({ source: "sites", id: s.id }, { selected: s.id === selectedId });
    }
  }, [selectedId, sites]);

  return (
    <div className={styles.root}>
      <div ref={containerRef} className={styles.map} />
      <div className={styles.overlay} />
      <TopBar siteCount={sites.length} coord={coord} />
      <Legend />
      {selected && <SiteDetailPanel site={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
```

- [ ] **Step 3: Wire fonts in `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "NOMAD",
  description: "An ongoing investigation in mapping abandoned infrastructure in the American West.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Update `app/globals.css`**

```css
:root { color-scheme: dark; --font-inter: system-ui, sans-serif; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; height: 100%;
  background: #06080a; color: #cdd4d2;
  font-family: var(--font-inter), system-ui, sans-serif; }
```

- [ ] **Step 5: Wire the server page in `app/page.tsx`**

```tsx
import { getWesternSites } from "../lib/sites";
import { Atlas } from "../components/atlas/Atlas";

export const dynamic = "force-dynamic";

export default async function Page() {
  const sites = await getWesternSites();
  return <Atlas sites={sites} />;
}
```

- [ ] **Step 6: Type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: no type errors; build succeeds.

- [ ] **Step 7: Manual verification (requires `.env.local` + seeded DB)**

Run: `npm run dev`, open http://localhost:3000
Expected, verify each:
- Map opens framed on the contiguous western US (Alaska not in view).
- Hundreds of teal dormant site dots are visible.
- Clicking a dot turns it ember and opens the detail panel with that site's facts; missing facts read "— unrecorded"; the "◷ presumed · unverified" badge shows.
- The close (×) dismisses the panel and the dot returns to teal.
- Top bar shows the site count and a live coordinate/zoom readout; legend is bottom-left.
- Panning far north/west reveals Alaska's sites (they exist, just off the initial view).

- [ ] **Step 8: Commit**

```bash
git add components/atlas/Atlas.tsx components/atlas/Atlas.module.css app/page.tsx app/layout.tsx app/globals.css
git commit -m "feat: MapLibre atlas with teal/ember sites and Tier 2 selection"
```

---

## Task 12: README + final verification

**Files:**
- Modify: `README.md`

**Interfaces:**
- Produces: setup/run documentation.

- [ ] **Step 1: Update `README.md`**

```markdown
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
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all tests pass (types, regions, field-helpers, clean, sites, SiteDetailPanel).

- [ ] **Step 3: Final type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: setup and run instructions for slice 1"
```

---

## Self-Review

**Spec coverage:**
- §4 architecture / project structure → Tasks 1, 7, 11 (file layout realized).
- §5 data model (sites, site_records, site_current) → Task 6.
- §6 enums + region membership (TX/OK southwest, AK pacific, latent) → Tasks 3, 6.
- §7 ETL (collapse dup cols, garbage→null, commodity split, coord validation, slug, region tag, one site + one record) → Tasks 4, 5.
- §8 Atlas Tier 1+2 (map, teal/ember markers, click→panel, data flow, default viewport excludes AK) → Tasks 8–11.
- §9 visual language (palette, marker semantics, typography, scanline/vignette) → Tasks 9–11, globals.
- §10 testing (TDD clean, seed smoke, panel render) → Tasks 4, 5, 7 step 5, 9.
- §11 secrets/config (.env.local.example, env names) → Tasks 1, 7.
- §12 future entities → out of scope; not implemented (correct).

**Placeholder scan:** No TBD/TODO; every code step contains complete code.

**Type consistency:** `SiteCurrent.record` shape matches `SiteRecord` across Tasks 2, 8, 9. `rowToSiteCurrent` consumes `SiteCurrentRow` (snake_case) exactly as the view columns in Task 6 produce. `getWesternSites` filters by `WESTERN_REGIONS` (Task 3) which excludes `latent`. `stateToRegion`/`isWesternRegion` signatures consistent. Visual hex tokens match the spec's Global Constraints.

**Note on coverage gap:** The `site_current` "latest record" / multi-record layering is structurally present (view + index) but only exercised with one record per site this slice — correct per scope (§2, §12).
