import styles from "./chrome.module.css";

export function TopBar({ siteCount, coord }: { siteCount: number; coord: string }) {
  return (
    <div className={styles.topbar}>
      <span className={styles.wordmark}>N<b>O</b>MAD</span>
      <span className={styles.count}>{siteCount.toLocaleString("en-US")} SITES · WEST</span>
      <span className={styles.coord}>{coord}</span>
    </div>
  );
}
