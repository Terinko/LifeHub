import { useEffect } from "react";

const GROUND = "#120d2a";

/**
 * Paints the page behind the app indigo (and the iOS status bar via
 * theme-color) while Poker is open, so overscroll doesn't flash white.
 */
export function useVegasBackground() {
  useEffect(() => {
    const body = document.body;
    const previous = body.style.backgroundColor;
    body.style.backgroundColor = GROUND;

    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = GROUND;
    document.head.appendChild(meta);

    return () => {
      body.style.backgroundColor = previous;
      meta.remove();
    };
  }, []);
}
