import styles from "./Sky.module.css";

const SKY_KEYS = [
  "clear",
  "partly",
  "cloudy",
  "fog",
  "rain",
  "storm",
  "snow",
].flatMap((k) => [`${k}-day`, `${k}-night`]);

/**
 * Every sky gradient stacked up, with only the current one visible, so a
 * change of conditions cross-fades instead of snapping.
 */
export function Sky({ skyKey }: { skyKey: string }) {
  return (
    <>
      {SKY_KEYS.map((k) => (
        <div
          key={k}
          className={`${styles.sky} ${styles[k]}${k === skyKey ? ` ${styles.on}` : ""}`}
        />
      ))}
    </>
  );
}
