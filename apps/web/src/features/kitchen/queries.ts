import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type { KitchenItem, SaveKitchenItem } from "@lifehub/shared";
import {
  deleteItem,
  getKitchen,
  logMeal,
  putAway,
  restore,
  saveItem,
  type Restore,
} from "./api";

export const kitchenKeys = { all: ["kitchen"] as const };

export const useKitchen = () =>
  useQuery({ queryKey: kitchenKeys.all, queryFn: getKitchen });

// Changes go to the server one at a time, in order, so an Undo can't land
// before the change it undoes.
const scope = { id: "kitchen" };
type Snapshot = { previous?: KitchenItem[] };

const key = (i: { pk: string; sk: string }) => `${i.pk}:${i.sk}`;

/** Replaces or adds items in the cached list, and drops the removed ones. */
export function patch(
  qc: QueryClient,
  put: KitchenItem[],
  remove: { pk: string; sk: string }[] = [],
) {
  const gone = new Set([...put, ...remove].map(key));
  qc.setQueryData<KitchenItem[]>(kitchenKeys.all, (list = []) => [
    ...list.filter((i) => !gone.has(key(i))),
    ...put,
  ]);
}

function useKitchenMutation<V, R>(
  fn: (vars: V) => Promise<R>,
  optimistic: (qc: QueryClient, vars: V) => void,
  settle?: (qc: QueryClient, result: R) => void,
) {
  const qc = useQueryClient();
  return useMutation<R, Error, V, Snapshot>({
    mutationKey: kitchenKeys.all,
    scope,
    mutationFn: fn,
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: kitchenKeys.all });
      const previous = qc.getQueryData<KitchenItem[]>(kitchenKeys.all);
      optimistic(qc, vars);
      return { previous };
    },
    onSuccess: (result) => settle?.(qc, result),
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(kitchenKeys.all, ctx.previous);
    },
    onSettled: () => {
      // Refetch once the last queued change is done, so rows don't flicker back.
      if (qc.isMutating({ mutationKey: kitchenKeys.all }) <= 1)
        void qc.invalidateQueries({ queryKey: kitchenKeys.all });
    },
  });
}

/**
 * Saves one item. Edits (with an sk) show right away; new items appear when
 * the server answers, since it may add them to an existing row instead.
 */
export const useSaveItem = () =>
  useKitchenMutation(
    saveItem,
    (qc, item: SaveKitchenItem) => {
      if (item.sk) patch(qc, [item as KitchenItem]);
    },
    (qc, saved) => patch(qc, [saved]),
  );

export const useDeleteItem = () =>
  useKitchenMutation(deleteItem, (qc, item) => patch(qc, [], [item]));

export const usePutAway = () =>
  useKitchenMutation(
    putAway,
    (qc, sks: string[]) =>
      patch(
        qc,
        [],
        sks.map((sk) => ({ pk: "GROCERY", sk })),
      ),
    (qc, res) => patch(qc, res.pantryItems),
  );

export const useLogMeal = () =>
  useKitchenMutation(
    logMeal,
    () => {},
    (qc, res) => patch(qc, res.pantryItems),
  );

export const useRestore = () =>
  useKitchenMutation(restore, (qc, r: Restore) => patch(qc, r.put, r.remove));
