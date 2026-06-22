import styles from "./chrome.module.css";

export function Legend() {
  return (
    <div className={styles.legend}>
      <div><span className={styles.dot} style={{ background: "#3f9e90" }} />SITE · DORMANT</div>
      <div><span className={styles.dot} style={{ background: "#ffb13e", boxShadow: "0 0 8px #ffb13e" }} />SITE · SELECTED</div>
    </div>
  );
}
