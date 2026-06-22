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
