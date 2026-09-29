import { useCallback, useEffect, useRef, useState } from "react";
import type { ToastMessage } from "./components/chrome/Toast";
import { useDeleteBill, useSaveBill } from "./queries";
import type { Bill } from "./types";

const SHOW_FOR = 5000;

/**
 * Saves, adds and deletes bills. Each change shows a note with Undo, and a
 * failed save says why and puts things back.
 */
export function useBillChanges() {
  const save = useSaveBill();
  const remove = useDeleteBill();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(
      () => setToast(null),
      toast.tone === "error" ? 8000 : SHOW_FOR,
    );
    return () => window.clearTimeout(t);
  }, [toast]);

  const show = useCallback(
    (text: string, extra: Partial<ToastMessage> = {}) => {
      setToast({ id: ++seq.current, text, ...extra });
    },
    [],
  );

  const failed = useCallback(
    (what: string) => (e: Error) =>
      show(`Couldn't ${what}. ${e.message}`, { tone: "error" }),
    [show],
  );

  const put = useCallback(
    (bill: Bill) => save.mutate(bill, { onError: failed("save that") }),
    [save, failed],
  );

  /** Saves `next`; Undo puts `prev` back. */
  const change = useCallback(
    (next: Bill, prev: Bill, message: string) => {
      put(next);
      show(message, { undo: () => put(prev) });
    },
    [put, show],
  );

  const add = useCallback(
    (bill: Bill) => {
      put(bill);
      show(`${bill.name} added`, {
        undo: () => remove.mutate(bill, { onError: failed("undo that") }),
      });
    },
    [put, show, remove, failed],
  );

  const drop = useCallback(
    (bill: Bill) => {
      remove.mutate(bill, { onError: failed("delete it") });
      show(`${bill.name} deleted`, { undo: () => put(bill) });
    },
    [remove, put, show, failed],
  );

  return { toast, dismiss: () => setToast(null), change, add, drop };
}
