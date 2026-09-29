import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteBill, getBills, saveBill } from "./api";
import type { Bill } from "./types";

export const billKeys = { all: ["bills"] as const };

export const useBills = () =>
  useQuery({ queryKey: billKeys.all, queryFn: () => getBills() });

/** The Hub's peek: the same list, without counting as opening Bills. */
export const useBillsSummary = (enabled: boolean) =>
  useQuery({ queryKey: billKeys.all, queryFn: () => getBills(true), enabled });

type Snapshot = { previous?: Bill[] };

// Saves and deletes go to the server one at a time, in the order they were
// made, so a quick Undo can't land before the change it undoes.
const scope = { id: "bills" };

/** Refetch once the last queued change is done, so the list doesn't flicker back. */
const refreshWhenIdle = (qc: ReturnType<typeof useQueryClient>) => {
  if (qc.isMutating({ mutationKey: billKeys.all }) <= 1)
    void qc.invalidateQueries({ queryKey: billKeys.all });
};

/** Saves right away on screen; puts the list back if the server says no. */
export function useSaveBill() {
  const qc = useQueryClient();
  return useMutation<Bill, Error, Bill, Snapshot>({
    mutationKey: billKeys.all,
    scope,
    mutationFn: saveBill,
    onMutate: async (bill) => {
      await qc.cancelQueries({ queryKey: billKeys.all });
      const previous = qc.getQueryData<Bill[]>(billKeys.all);
      qc.setQueryData<Bill[]>(billKeys.all, (list = []) =>
        list.some((b) => b.id === bill.id)
          ? list.map((b) => (b.id === bill.id ? bill : b))
          : [...list, bill],
      );
      return { previous };
    },
    onError: (_e, _bill, ctx) => {
      if (ctx?.previous) qc.setQueryData(billKeys.all, ctx.previous);
    },
    onSettled: () => refreshWhenIdle(qc),
  });
}

export function useDeleteBill() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, Bill, Snapshot>({
    mutationKey: billKeys.all,
    scope,
    mutationFn: (bill) => deleteBill(bill.id),
    onMutate: async (bill) => {
      await qc.cancelQueries({ queryKey: billKeys.all });
      const previous = qc.getQueryData<Bill[]>(billKeys.all);
      qc.setQueryData<Bill[]>(billKeys.all, (list = []) =>
        list.filter((b) => b.id !== bill.id),
      );
      return { previous };
    },
    onError: (_e, _bill, ctx) => {
      if (ctx?.previous) qc.setQueryData(billKeys.all, ctx.previous);
    },
    onSettled: () => refreshWhenIdle(qc),
  });
}
