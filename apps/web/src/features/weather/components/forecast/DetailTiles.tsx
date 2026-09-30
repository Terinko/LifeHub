import type { ReactNode } from "react";
import {
  Droplets,
  Gauge,
  SunMedium,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { compass, round, uvLabel } from "../../lib/format";
import type { CurrentConditions, DayForecast } from "../../types";
import glass from "../glass.module.css";
import text from "../text.module.css";
import styles from "./DetailTiles.module.css";

type TileProps = {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  detail: ReactNode;
};

function Tile({ icon: Icon, label, value, detail }: TileProps) {
  return (
    <div className={glass.glass}>
      <div className={text.label}>
        <Icon size={13} aria-hidden="true" />
        {` ${label}`}
      </div>
      <div className={styles.value}>{value}</div>
      <div className={text.small}>{detail}</div>
    </div>
  );
}

type Props = { current: CurrentConditions; today: DayForecast | undefined };

/** Wind, humidity, UV and pressure in a two-by-two grid. */
export function DetailTiles({ current, today }: Props) {
  // Values stay as separate JSX pieces (not one template string) so the
  // text nodes, and so the glyph positions, match the pre-TypeScript page.
  return (
    <div className={styles.tiles}>
      <Tile
        icon={Wind}
        label="WIND"
        value={<>{round(current.windSpeed)} mph</>}
        detail={
          <>
            Gusts {round(current.windGusts)}
            {" ·"} {compass(current.windDir)}
          </>
        }
      />
      <Tile
        icon={Droplets}
        label="HUMIDITY"
        value={<>{round(current.humidity)}%</>}
        detail={<>Dew point {round(current.dewPoint)}°</>}
      />
      <Tile
        icon={SunMedium}
        label="UV INDEX"
        value={round(current.uv)}
        detail={
          <>
            {uvLabel(current.uv)}
            {today?.uv != null ? ` · peak ${round(today.uv)}` : ""}
          </>
        }
      />
      <Tile
        icon={Gauge}
        label="PRESSURE"
        value={current.pressureInHg ? current.pressureInHg.toFixed(2) : "--"}
        detail="inHg"
      />
    </div>
  );
}
