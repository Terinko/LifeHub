import {
  Briefcase,
  ChefHat,
  CloudSun,
  Receipt,
  ShieldCheck,
  Spade,
  Tv,
  type LucideIcon,
} from "lucide-react";
// Not "../../bills": its index re-exports BillsPage, which would pull the
// whole Bills chunk (and its CSS) into the Hub.
import { BillsHubSummary } from "../../bills/HubSummary";
import type { HubTile, TileKey } from "../lib/tiles";
import styles from "./ToolTile.module.css";

const ICONS: Record<TileKey, LucideIcon> = {
  bills: Receipt,
  kitchen: ChefHat,
  poker: Spade,
  fantasy: Tv,
  weather: CloudSun,
  applications: Briefcase,
  admin: ShieldCheck,
};

type Props = {
  tile: HubTile;
  onOpen: () => void;
};

/** One Hub card: tinted icon, name, and a line about the tool. */
export function ToolTile({ tile, onOpen }: Props) {
  const Icon = ICONS[tile.key];
  const isAdmin = tile.key === "admin";
  return (
    <div
      onClick={onOpen}
      className={isAdmin ? `${styles.card} ${styles.admin}` : styles.card}
    >
      <div className={`${styles.icon} ${styles[`${tile.key}Icon`]}`}>
        <Icon size={24} strokeWidth={1.75} />
      </div>
      <div className={styles.label}>{tile.label}</div>
      {tile.key === "bills" ? (
        <BillsHubSummary
          fallback={tile.subtitle}
          subtitleClassName={styles.subtitle}
        />
      ) : (
        <div className={styles.subtitle}>{tile.subtitle}</div>
      )}
    </div>
  );
}
