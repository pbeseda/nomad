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
