import styles from "./pixel-loading-state.module.css";

const chevron = Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3);
  const c = i % 3;
  return (c + Math.abs(r - 1)) * 90;
});

const ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3];
const orbit = Array.from({ length: 9 }, (_, i) => {
  const k = ORBIT_ORDER.indexOf(i);
  return k === -1 ? null : k * 110;
});

const PATTERNS: Record<
  string,
  { delays: (number | null)[]; dur: number; round: boolean }
> = {
  Drive: { delays: chevron, dur: 650, round: false },
  Dots: { delays: chevron, dur: 650, round: true },
  Orbit: { delays: orbit, dur: 950, round: false },
};

function LoaderGrid({
  delays,
  dur,
  round,
}: {
  delays: (number | null)[];
  dur: number;
  round: boolean;
}) {
  return (
    <span aria-hidden className={styles.grid}>
      {delays.map((delay, index) => (
        <span
          key={index}
          className={`${styles.cell} ${round ? styles.cellRound : ""} ${
            delay === null ? styles.cellDim : styles.cellLit
          }`}
          style={
            delay === null
              ? undefined
              : {
                  animationDuration: `${dur}ms`,
                  animationDelay: `${delay}ms`,
                }
          }
        />
      ))}
    </span>
  );
}

export function PixelLoadingState({
  label = "Analyzing Design…",
  variant = "Drive",
}: {
  label?: string;
  variant?: keyof typeof PATTERNS;
}) {
  const { delays, dur, round } = PATTERNS[variant] ?? PATTERNS.Drive;

  return (
    <div role="status" className={styles.row}>
      <LoaderGrid delays={delays} dur={dur} round={round} />
      <span className={styles.label}>{label}</span>
    </div>
  );
}
