export type Frequency =
  "monthly" | "biweekly" | "quarterly" | "yearly" | "once";

/** What happened to one due date. Older bills also stored "SETTLED". */
export type PeriodStatus = "UNPAID" | "PAID" | "SETTLED";

/** Someone who pays you back their share of a split bill. */
export type Payer = {
  id: string;
  name: string;
  /** Dollars they owe each time. Blank means an even split. */
  share?: number | null;
  /** Keyed by due date key: true, or the date they paid you back. */
  paidHistory?: Record<string, boolean | string>;
};

/**
 * One bill as stored. Monthly bills key their history by "YYYY-MM"; other
 * schedules key it by the due date, "YYYY-MM-DD".
 */
export type Bill = {
  id: string;
  sk?: string;
  billId?: string;
  name: string;
  amount: number;
  payeeName?: string;
  frequency?: Frequency;
  /** Monthly bills: the day of the month (1 to 31). */
  dueDayOfMonth?: number;
  /** Other schedules: the first due date, "YYYY-MM-DD". */
  anchorDate?: string;
  /** "YYYY-MM": no due dates before this month. */
  startMonth?: string | null;
  /** "YYYY-MM": no due dates after this month. */
  endDate?: string | null;
  autopay?: boolean;
  isVariable?: boolean;
  isShared?: boolean;
  statusHistory?: Record<string, PeriodStatus>;
  amountHistory?: Record<string, number | null>;
  /** When you marked each due date paid, "YYYY-MM-DD". */
  paidDates?: Record<string, string>;
  payers?: Payer[];
  notes?: string;
  updatedAt?: string;
};
