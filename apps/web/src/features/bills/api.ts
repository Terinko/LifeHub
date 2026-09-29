import { api } from "../../shared/api/client";
import type { Bill } from "./types";

type Stored = Bill & { pk?: string };

/** Older bills can carry numbers as strings; read them as numbers. */
export function normalize(raw: Stored): Bill {
  const id = raw.billId ?? raw.sk ?? raw.id;
  const rest: Stored = { ...raw };
  delete rest.pk;
  return {
    ...rest,
    id,
    amount: Number(raw.amount) || 0,
    dueDayOfMonth:
      raw.dueDayOfMonth === undefined
        ? undefined
        : Number(raw.dueDayOfMonth) || 1,
  };
}

export const getBills = async (summary = false) =>
  (await api.get<Stored[]>(summary ? "/bills?summary=1" : "/bills")).map(
    normalize,
  );

export const saveBill = async (bill: Bill) =>
  normalize(await api.post<Stored>("/bills", { ...bill, billId: bill.id }));

export const deleteBill = (id: string) =>
  api.delete<{ id: string }>(`/bills?billId=${encodeURIComponent(id)}`);
