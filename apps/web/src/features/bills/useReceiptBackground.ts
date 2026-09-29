import { useEffect } from "react";

const GROUND = "#0f1115";

/**
 * Paints the page behind the app near-black (and the iOS status bar via
 * theme-color) while Bills is open, so overscroll doesn't flash white.
 */
export function useReceiptBackground() {
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
