import { useEffect, useRef, useState } from "react";

const DURATION_MS = 700;

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Animated count between temperatures when the value changes. */
export function useCountUp(target: number | null): number | null {
  const [shown, setShown] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    if (target == null) return undefined;
    if (prefersReducedMotion() || fromRef.current == null) {
      fromRef.current = target;
      const id = requestAnimationFrame(() => setShown(target));
      return () => cancelAnimationFrame(id);
    }
    const from = fromRef.current;
    const start = performance.now();
    let id = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / DURATION_MS);
      setShown(from + (target - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) id = requestAnimationFrame(step);
      else fromRef.current = target;
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [target]);
  return shown;
}
