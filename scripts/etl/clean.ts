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
