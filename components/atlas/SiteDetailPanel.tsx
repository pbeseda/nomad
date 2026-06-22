import type { SiteCurrent } from "../../lib/types";
import styles from "./SiteDetailPanel.module.css";

const UNRECORDED = "— unrecorded";

export function SiteDetailPanel({
  site, onClose,
}: { site: SiteCurrent; onClose: () => void }) {
  const r = site.record;
  const lat = site.latitude.toFixed(2);
  const lon = site.longitude.toFixed(2);

  const rows: { label: string; value: string; warm?: boolean; unknown?: boolean }[] = [
    { label: "Settled", value: r?.yearSettled != null ? String(r.yearSettled) : UNRECORDED, unknown: r?.yearSettled == null },
    { label: "Abandoned", value: r?.yearAbandoned != null ? String(r.yearAbandoned) : UNRECORDED, warm: r?.yearAbandoned != null, unknown: r?.yearAbandoned == null },
    { label: "Peak pop.", value: r?.peakPopulation != null ? r.peakPopulation.toLocaleString("en-US") : UNRECORDED, unknown: r?.peakPopulation == null },
    { label: "Commodity", value: r && r.commodities.length ? r.commodities.join(", ") : UNRECORDED, unknown: !r || r.commodities.length === 0 },
    { label: "Town area", value: r?.townAreaAcres != null ? `${r.townAreaAcres} ac` : UNRECORDED, unknown: r?.townAreaAcres == null },
  ];

  return (
    <aside className={styles.panel}>
      <button className={styles.close} onClick={onClose} aria-label="Close">×</button>
      <div className={styles.tag}>Site · {r?.verificationStatus ?? "presumed"}</div>
      <h2 className={styles.name}>{site.name}</h2>
      <div className={styles.coord}>
        {site.state} · {lat}°N {lon}°W
      </div>
      <div className={styles.divider} />
      {rows.map((row) => (
        <div className={styles.row} key={row.label}>
          <span className={styles.label}>{row.label}</span>
          <span className={`${styles.value} ${row.warm ? styles.warm : ""} ${row.unknown ? styles.unknown : ""}`}>
            {row.value}
          </span>
        </div>
      ))}
      <span className={styles.status}>
        ◷ {r?.verificationStatus ?? "presumed"} · unverified
      </span>
    </aside>
  );
}
