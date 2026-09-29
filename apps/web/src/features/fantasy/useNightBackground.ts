import { useEffect } from "react";

const GROUND = "#0a101c";

/**
 * Paints the page behind the app dark (and the iOS status bar via
 * theme-color) while Fantasy is open, so overscroll doesn't flash white.
 */
export function useNightBackground() {
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
