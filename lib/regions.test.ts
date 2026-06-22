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
