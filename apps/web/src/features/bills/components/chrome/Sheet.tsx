import { useEffect, useEffectEvent, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useSwipeToClose } from "./useSwipeToClose";
import styles from "./Sheet.module.css";

type Props = {
  title: string;
  /** A line under the title, like the payee and schedule. */
  subtitle?: string;
  /** Controls next to the close button, like Edit. */
  actions?: ReactNode;
  onClose: () => void;
  children: ReactNode;
};

/**
 * A bottom sheet over a dimmed page. It closes with the X, Escape, a tap
 * on the backdrop, or a pull down on the grabber.
 */
export function Sheet({ title, subtitle, actions, onClose, children }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLDivElement>(null);
  useSwipeToClose(panel, body, handle, onClose);
  const close = useEffectEvent(onClose);

  // Runs once per sheet, so typing doesn't move focus back to the panel.
  useEffect(() => {
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, []);

  return (
    <div className={styles.layer}>
      <div className={styles.backdrop} onClick={onClose} aria-hidden />
      <div
        ref={panel}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div ref={handle} className={styles.handle}>
          <span className={styles.grabber} aria-hidden />
          <div className={styles.head}>
            <div className={styles.titles}>
              <h2 className={styles.title}>{title}</h2>
              {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
            </div>
            {actions}
            <button
              type="button"
              className={styles.close}
              onClick={onClose}
              aria-label="Close"
            >
              <X size={18} strokeWidth={2.4} aria-hidden />
            </button>
          </div>
        </div>
        <div ref={body} className={styles.body}>
          {children}
        </div>
      </div>
    </div>
  );
}
