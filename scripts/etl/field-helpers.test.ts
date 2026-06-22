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
