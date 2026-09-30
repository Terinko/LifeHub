import { useNavigate } from "react-router-dom";
import type { HubTile } from "../lib/tiles";
import { ToolTile } from "./ToolTile";
import styles from "./TileGrid.module.css";

/** The Hub's two-column grid of tool cards. */
export function TileGrid({ tiles }: { tiles: HubTile[] }) {
  const navigate = useNavigate();
  return (
    <div className={styles.grid}>
      {tiles.map((tile) => (
        <ToolTile
          key={tile.key}
          tile={tile}
          onOpen={() => navigate(tile.path)}
        />
      ))}
    </div>
  );
}
