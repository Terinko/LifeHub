import { useEffect } from "react";

const ICE = "#f4f8fb";

/** Paints the page behind the app (and the iOS status bar) ice while Hockey is open. */
export function useIceBackground() {
  useEffect(() => {
    const body = document.body;
    const previous = body.style.backgroundColor;
    body.style.backgroundColor = ICE;
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = ICE;
    document.head.appendChild(meta);
    return () => {
      body.style.backgroundColor = previous;
      meta.remove();
    };
  }, []);
}
