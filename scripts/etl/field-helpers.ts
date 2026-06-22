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
