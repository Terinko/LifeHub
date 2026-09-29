import { useEffect, useState } from "react";

/**
 * Today's date, fixed while the page is open and moved forward when you
 * come back to it on a later day.
 */
export function useToday(fixed?: Date): Date {
  const [today, setToday] = useState(() => fixed ?? new Date());
  useEffect(() => {
    if (fixed) return;
    const check = () => {
      const now = new Date();
      setToday((t) => (t.toDateString() === now.toDateString() ? t : now));
    };
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [fixed]);
  return today;
}
