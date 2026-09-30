import { List } from "lucide-react";
import buttons from "./buttons.module.css";
import styles from "./WeatherHeader.module.css";

type Props = { onBack: () => void; onOpenPlaces: () => void };

export function WeatherHeader({ onBack, onOpenPlaces }: Props) {
  return (
    <header className={styles.header}>
      <button className={buttons.link} onClick={onBack}>
        ‹ Hub
      </button>
      <button
        className={buttons.iconBtn}
        onClick={onOpenPlaces}
        aria-label="Places"
      >
        <List size={22} strokeWidth={1.8} />
      </button>
    </header>
  );
}
