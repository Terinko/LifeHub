import { useState } from "react";
import type { FantasyPlatform, LinkedLeague } from "@lifehub/shared";
import { Sheet } from "../chrome/Sheet";
import { EspnLinkForm } from "./EspnLinkForm";
import { SleeperLinkForm } from "./SleeperLinkForm";
import form from "./form.module.css";

type Props = { linked: LinkedLeague[]; onClose: () => void };

export function LinkLeagueSheet({ linked, onClose }: Props) {
  const [platform, setPlatform] = useState<FantasyPlatform>("SLEEPER");

  return (
    <Sheet title="Link a league" onClose={onClose}>
      <div className={form.segmented} role="group" aria-label="Platform">
        {(["SLEEPER", "ESPN"] as const).map((p) => (
          <button
            key={p}
            type="button"
            className={form.segment}
            aria-pressed={platform === p}
            onClick={() => setPlatform(p)}
          >
            {p === "SLEEPER" ? "Sleeper" : "ESPN"}
          </button>
        ))}
      </div>
      {platform === "SLEEPER" ? (
        <SleeperLinkForm linked={linked} />
      ) : (
        <EspnLinkForm onLinked={onClose} />
      )}
    </Sheet>
  );
}
