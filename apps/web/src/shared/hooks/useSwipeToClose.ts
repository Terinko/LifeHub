import { useEffect, useEffectEvent, type RefObject } from "react";

const CLOSE_DISTANCE = 110;
const CLOSE_SPEED = 0.6; // px per ms
const SLOP = 6;

const typing = (el: EventTarget | null) =>
  el instanceof HTMLElement && !!el.closest("input, textarea, select");

/**
 * Lets a bottom sheet be pulled down to close. A pull starts on the grabber
 * and title anywhere, or on the content when it's scrolled to the top.
 */
export function useSwipeToClose(
  sheet: RefObject<HTMLElement | null>,
  body: RefObject<HTMLElement | null>,
  handle: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const close = useEffectEvent(onClose);
  useEffect(() => {
    const panel = sheet.current;
    if (!panel) return;
    let startY = 0;
    let startX = 0;
    let lastY = 0;
    let lastT = 0;
    let speed = 0;
    let tracking = false;
    let dragging = false;

    const onHandle = (t: EventTarget | null) =>
      t instanceof Node && !!handle.current?.contains(t);

    const begin = (x: number, y: number, target: EventTarget | null) => {
      if (typing(target)) return;
      if (!onHandle(target) && (body.current?.scrollTop ?? 0) > 0) return;
      tracking = true;
      dragging = false;
      startX = x;
      startY = lastY = y;
      lastT = performance.now();
      speed = 0;
    };

    const move = (x: number, y: number): boolean => {
      if (!tracking) return false;
      const dy = y - startY;
      if (!dragging) {
        if (dy > SLOP && dy > Math.abs(x - startX)) {
          dragging = true;
          panel.style.transition = "none";
        } else if (dy < -SLOP || Math.abs(x - startX) > SLOP) {
          tracking = false;
          return false;
        } else return false;
      }
      const now = performance.now();
      speed = (y - lastY) / Math.max(1, now - lastT);
      lastY = y;
      lastT = now;
      panel.style.transform = `translateY(${Math.max(0, dy - SLOP)}px)`;
      return true;
    };

    const end = () => {
      if (!tracking) return;
      tracking = false;
      if (!dragging) return;
      dragging = false;
      const dy = lastY - startY;
      panel.style.transition = "transform 0.22s ease";
      if (dy > CLOSE_DISTANCE || speed > CLOSE_SPEED) {
        panel.style.transform = "translateY(110%)";
        window.setTimeout(close, 180);
      } else {
        panel.style.transform = "";
      }
    };

    const touchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t && e.touches.length === 1) begin(t.clientX, t.clientY, e.target);
    };
    const touchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t && move(t.clientX, t.clientY) && e.cancelable) e.preventDefault();
    };
    const mouseDown = (e: MouseEvent) => {
      if (e.button !== 0 || !onHandle(e.target)) return;
      begin(e.clientX, e.clientY, e.target);
      const mm = (ev: MouseEvent) => move(ev.clientX, ev.clientY);
      const mu = () => {
        end();
        window.removeEventListener("mousemove", mm);
        window.removeEventListener("mouseup", mu);
      };
      window.addEventListener("mousemove", mm);
      window.addEventListener("mouseup", mu);
    };

    panel.addEventListener("touchstart", touchStart, { passive: true });
    panel.addEventListener("touchmove", touchMove, { passive: false });
    panel.addEventListener("touchend", end);
    panel.addEventListener("touchcancel", end);
    panel.addEventListener("mousedown", mouseDown);
    return () => {
      panel.removeEventListener("touchstart", touchStart);
      panel.removeEventListener("touchmove", touchMove);
      panel.removeEventListener("touchend", end);
      panel.removeEventListener("touchcancel", end);
      panel.removeEventListener("mousedown", mouseDown);
    };
  }, [sheet, body, handle]);
}
