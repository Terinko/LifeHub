import { useEffect } from "react";

const GROUND = "#f3f0e8";

/**
 * Paints the page behind the app cream (and the iOS status bar via
 * theme-color) while Kitchen is open, so overscroll matches the page.
 */
export function useEnamelBackground() {
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
