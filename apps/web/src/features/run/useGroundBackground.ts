import { useEffect } from "react";

const GROUND = "#f3f6f9";

/** Paints the page behind the app (and the iOS status bar) gray while Run is open. */
export function useGroundBackground() {
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
