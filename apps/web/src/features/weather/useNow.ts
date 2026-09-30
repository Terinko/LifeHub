import { useEffect, useState } from "react";

/**
 * The current time, ticking every minute and when the app comes back to the
 * foreground, so "Updated N min ago" stays true.
 */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") setNow(Date.now());
    };
    document.addEventListener("visibilitychange", onVisible);
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(id);
    };
  }, []);
  return now;
}
