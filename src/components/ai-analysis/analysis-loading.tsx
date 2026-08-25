import styles from "./analysis-loading.module.css";
import { PixelLoadingState } from "./pixel-loading-state";

/**
 * Full-bleed loading overlay for the creative canvas while AI analysis runs.
 * Pure presentation — visibility is driven by `aiAnalysisActive` in CanvasArea.
 */
export function AnalysisLoading({
  label = "Analyzing Design…",
  badge,
}: {
  label?: string;
  /** Small pill in the corner, e.g. "Page 2" for multi-page PDFs. */
  badge?: string;
}) {
  return (
    <div className={styles.igWrap}>
      <div className={styles.igCanvas} role="img" aria-label={label}>
        <span className={styles.igDots} aria-hidden />
        <span className={styles.igGlow} aria-hidden />
        {badge && <span className={styles.igRes}>{badge}</span>}
      </div>
      <div className={styles.igStatus}>
        <PixelLoadingState label={label} variant="Drive" />
      </div>
    </div>
  );
}
