import { Umbrella } from "lucide-react";
import { hasNowcastRain, nowcastBarHeight } from "../../lib/nowcast";
import type { Nowcast } from "../../types";
import glass from "../glass.module.css";
import text from "../text.module.css";
import styles from "./NowcastCard.module.css";

/** "Next 2 hours": a sentence, plus 15-minute bars when rain is around. */
export function NowcastCard({ nowcast }: { nowcast: Nowcast }) {
  return (
    <div className={glass.glass}>
      <div className={text.label}>
        <Umbrella size={13} aria-hidden="true" /> NEXT 2 HOURS
      </div>
      <div className={styles.text}>{nowcast.text}</div>
      {hasNowcastRain(nowcast.values) && (
        <>
          <div className={styles.bars}>
            {nowcast.values.map((v, i) => (
              <i key={i} style={{ height: `${nowcastBarHeight(v)}px` }} />
            ))}
          </div>
          <div className={styles.axis}>
            <span>Now</span>
            <span>1 hr</span>
            <span>2 hr</span>
          </div>
        </>
      )}
    </div>
  );
}
