import { LocateFixed, Trash2 } from "lucide-react";
import { codeLabel, sceneFor, sceneKey } from "../../lib/codes";
import type { Place, PlacePreview } from "../../types";
import buttons from "../buttons.module.css";
import glass from "../glass.module.css";
import text from "../text.module.css";
import styles from "./PlaceCard.module.css";

type Props = {
  place: Place;
  preview: PlacePreview | undefined;
  current: boolean;
  editing: boolean;
  onSelect: () => void;
  onRemove: () => void;
};

/** One saved place, tinted by its current conditions once they load. */
export function PlaceCard({
  place,
  preview,
  current,
  editing,
  onSelect,
  onRemove,
}: Props) {
  const tint = preview
    ? styles[`tint-${sceneKey(sceneFor(preview.code, preview.isDay))}`]
    : undefined;
  const className = [glass.glass, styles.card, current && styles.current, tint]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <button className={styles.main} onClick={onSelect}>
        <div>
          <div className={styles.name}>
            {place.isLocation && <LocateFixed size={14} aria-hidden="true" />}{" "}
            {place.name}
          </div>
          <div className={text.small}>
            {preview ? codeLabel(preview.code, preview.isDay) : place.region}
          </div>
        </div>
        <div className={styles.temp}>
          {preview ? `${Math.round(preview.temp)}°` : ""}
        </div>
      </button>
      {editing && (
        <button
          className={`${buttons.iconBtn} ${styles.remove}`}
          onClick={onRemove}
          aria-label={`Remove ${place.name}`}
        >
          <Trash2 size={18} />
        </button>
      )}
    </div>
  );
}
