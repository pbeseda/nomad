"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { SiteCurrent } from "../../lib/types";
import { SiteDetailPanel } from "./SiteDetailPanel";
import { TopBar } from "./TopBar";
import { Legend } from "./Legend";
import styles from "./Atlas.module.css";

const KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
// Dark, desaturated MapTiler vector style (tuned further later).
const STYLE_URL = `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${KEY}`;
// Contiguous western US: [west, south, east, north]. Excludes Alaska on load.
const WEST_BOUNDS: maplibregl.LngLatBoundsLike = [[-125, 31], [-96, 49]];

function toFeatureCollection(sites: SiteCurrent[]) {
  return {
    type: "FeatureCollection" as const,
    features: sites.map((s) => ({
      type: "Feature" as const,
      id: s.id,
      geometry: { type: "Point" as const, coordinates: [s.longitude, s.latitude] },
      properties: { id: s.id },
    })),
  };
}

export function Atlas({ sites }: { sites: SiteCurrent[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [coord, setCoord] = useState("");

  const byId = useMemo(() => new Map(sites.map((s) => [s.id, s])), [sites]);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      bounds: WEST_BOUNDS,
      fitBoundsOptions: { padding: 40 },
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("sites", { type: "geojson", data: toFeatureCollection(sites) });
      map.addLayer({
        id: "sites-dormant",
        type: "circle",
        source: "sites",
        paint: {
          "circle-radius": ["case", ["boolean", ["feature-state", "selected"], false], 7, 3],
          "circle-color": ["case", ["boolean", ["feature-state", "selected"], false], "#ffb13e", "#3f9e90"],
          "circle-opacity": 0.9,
          "circle-stroke-width": ["case", ["boolean", ["feature-state", "selected"], false], 2, 0],
          "circle-stroke-color": "#ffb13e",
        },
      });

      map.on("click", "sites-dormant", (e) => {
        const f = e.features?.[0];
        if (f) setSelectedId(String(f.properties?.id));
      });
      map.on("mouseenter", "sites-dormant", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "sites-dormant", () => { map.getCanvas().style.cursor = ""; });
    });

    map.on("move", () => {
      const c = map.getCenter();
      setCoord(`${c.lat.toFixed(2)}°N ${c.lng.toFixed(2)}°W · z${map.getZoom().toFixed(0)}`);
    });

    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the GeoJSON source in sync when sites changes without recreating the map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource("sites") as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(toFeatureCollection(sites));
  }, [sites]);

  // Drive selected feature-state from React.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    for (const s of sites) {
      map.setFeatureState({ source: "sites", id: s.id }, { selected: s.id === selectedId });
    }
  }, [selectedId, sites]);

  return (
    <div className={styles.root}>
      <div ref={containerRef} className={styles.map} />
      <div className={styles.overlay} />
      <TopBar siteCount={sites.length} coord={coord} />
      <Legend />
      {selected && <SiteDetailPanel site={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
