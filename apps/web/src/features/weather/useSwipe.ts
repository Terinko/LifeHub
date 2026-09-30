import { useRef, type TouchEvent } from "react";
import { swipeStep } from "./lib/places";

/**
 * Touch handlers for swiping between saved places. Calls `onStep(1)` for a
 * swipe left (next place) and `onStep(-1)` for a swipe right.
 */
export function useSwipe(enabled: boolean, onStep: (by: number) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    if (t) start.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: TouchEvent) => {
    const t = e.changedTouches[0];
    if (!start.current || !enabled || !t) return;
    const dx = t.clientX - start.current.x;
    const dy = t.clientY - start.current.y;
    start.current = null;
    const by = swipeStep(dx, dy);
    if (by !== 0) onStep(by);
  };

  return { onTouchStart, onTouchEnd };
}
