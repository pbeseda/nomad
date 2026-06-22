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
