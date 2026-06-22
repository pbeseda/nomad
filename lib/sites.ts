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
