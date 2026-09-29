import type { FantasyPlatform } from "@lifehub/shared";
import card from "../chrome/card.module.css";

export function PlatformBadge({ platform }: { platform: FantasyPlatform }) {
  return platform === "SLEEPER" ? (
    <span className={card.sleeper}>SLEEPER</span>
  ) : (
    <span className={card.espn}>ESPN</span>
  );
}
