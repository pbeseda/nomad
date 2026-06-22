import type { Region } from "./types";

export const WESTERN_REGIONS: Region[] = [
  "pacific",
  "mountain_west",
  "southwest",
  "great_plains",
];

const STATE_REGION: Record<string, Region> = {
  // Pacific
  California: "pacific",
  Oregon: "pacific",
  Washington: "pacific",
  Alaska: "pacific",
  // Mountain West
  Idaho: "mountain_west",
  Montana: "mountain_west",
  Wyoming: "mountain_west",
  Nevada: "mountain_west",
  Utah: "mountain_west",
  Colorado: "mountain_west",
  // Southwest (incl. swing states Texas, Oklahoma)
  Arizona: "southwest",
  "New Mexico": "southwest",
  Texas: "southwest",
  Oklahoma: "southwest",
  // Great Plains
  "North Dakota": "great_plains",
  "South Dakota": "great_plains",
  Nebraska: "great_plains",
  Kansas: "great_plains",
};

export function stateToRegion(state: string): Region {
  return STATE_REGION[state.trim()] ?? "latent";
}

export function isWesternRegion(region: Region): boolean {
  return (WESTERN_REGIONS as string[]).includes(region);
}
