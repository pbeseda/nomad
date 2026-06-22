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
