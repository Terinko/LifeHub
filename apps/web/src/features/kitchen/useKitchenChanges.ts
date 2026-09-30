import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type {
  GroceryItem,
  KitchenItem,
  MealItem,
  PantryItem,
  SaveKitchenItem,
} from "@lifehub/shared";
import type { ToastMessage } from "./components/chrome/Toast";
import {
  kitchenKeys,
  useDeleteItem,
  useLogMeal,
  usePutAway,
  useRestore,
  useSaveItem,
} from "./queries";

const SHOW_FOR = 5000;
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

/**
 * Every change Kitchen makes. Each one shows a note, most with Undo, and a
 * failed save says why and puts the screen back.
 */
export function useKitchenChanges() {
  const qc = useQueryClient();
  const save = useSaveItem();
  const del = useDeleteItem();
  const away = usePutAway();
  const log = useLogMeal();
  const back = useRestore();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!toast) return;
    const ms = toast.tone === "error" ? 8000 : SHOW_FOR;
    const t = window.setTimeout(() => setToast(null), ms);
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

  const current = useCallback(
    () => qc.getQueryData<KitchenItem[]>(kitchenKeys.all) ?? [],
    [qc],
  );
  const pantryNow = useCallback(
    () => current().filter((i): i is PantryItem => i.pk === "INVENTORY"),
    [current],
  );

  const undo = useCallback(
    (put: KitchenItem[], remove: KitchenItem[] = []) =>
      back.mutate(
        { put, remove: remove.map(({ pk, sk }) => ({ pk, sk })) },
        { onError: failed("undo that") },
      ),
    [back, failed],
  );

  /** Adds a new item; Undo takes it back off, or restores the row it was added to. */
  const add = useCallback(
    (item: SaveKitchenItem, message: string) => {
      const before = current();
      save.mutate(item, {
        onSuccess: (saved) => {
          const prev = before.find(
            (i) => i.pk === saved.pk && i.sk === saved.sk,
          );
          show(message, {
            undo: () => (prev ? undo([prev]) : undo([], [saved])),
          });
        },
        onError: failed("add that"),
      });
    },
    [current, save, show, undo, failed],
  );

  /** Saves an edit; with a message, shows it with Undo. */
  const update = useCallback(
    (next: KitchenItem, prev: KitchenItem, message?: string) => {
      save.mutate(next, { onError: failed("save that") });
      if (message) show(message, { undo: () => undo([prev]) });
    },
    [save, show, undo, failed],
  );

  const toggleCart = useCallback(
    (g: GroceryItem) => {
      const next: GroceryItem = { ...g };
      if (g.inCart) delete next.inCart;
      else next.inCart = true;
      save.mutate(next, { onError: failed("check that off") });
    },
    [save, failed],
  );

  const remove = useCallback(
    (item: KitchenItem) => {
      del.mutate(item, { onError: failed("delete it") });
      show(`${item.name} deleted`, { undo: () => undo([item]) });
    },
    [del, show, undo, failed],
  );

  /** Moves checked-off items into the pantry; Undo puts both back as they were. */
  const putAway = useCallback(
    (items: GroceryItem[]) => {
      const before = pantryNow();
      away.mutate(
        items.map((g) => g.sk),
        {
          onSuccess: ({ pantryItems }) => {
            const existed = pantryItems.flatMap(
              (p) => before.find((b) => b.sk === p.sk) ?? [],
            );
            const added = pantryItems.filter(
              (p) => !before.some((b) => b.sk === p.sk),
            );
            show(`Put ${plural(items.length, "item")} away`, {
              undo: () => undo([...items, ...existed], added),
            });
          },
          onError: failed("put those away"),
        },
      );
    },
    [pantryNow, away, show, undo, failed],
  );

  /** Takes a meal out of the pantry; Undo puts the amounts back. */
  const logMeal = useCallback(
    (name: string, items: MealItem[], onDone?: () => void) => {
      const before = pantryNow();
      log.mutate(items, {
        onSuccess: ({ pantryItems, skipped }) => {
          onDone?.();
          const prev = pantryItems.flatMap(
            (p) => before.find((b) => b.sk === p.sk) ?? [],
          );
          const note = skipped.length
            ? ` (skipped ${skipped.map((s) => s.name).join(", ")})`
            : "";
          show(`Logged ${name}${note}`, {
            undo: prev.length ? () => undo(prev) : undefined,
          });
        },
        onError: failed("log that"),
      });
    },
    [pantryNow, log, show, undo, failed],
  );

  return {
    toast,
    dismiss: () => setToast(null),
    add,
    update,
    toggleCart,
    remove,
    putAway,
    logMeal,
    busyPuttingAway: away.isPending,
  };
}

export type KitchenChanges = ReturnType<typeof useKitchenChanges>;
