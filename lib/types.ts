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
