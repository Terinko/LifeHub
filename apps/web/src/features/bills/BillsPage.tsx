import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { CalendarTab } from "./components/calendar/CalendarTab";
import { BillSheet } from "./components/bill/BillSheet";
import { GlassHeader } from "./components/chrome/GlassHeader";
import { Notice } from "./components/chrome/Notice";
import { TabBar, type Tab } from "./components/chrome/TabBar";
import { Toast } from "./components/chrome/Toast";
import { EditSheet } from "./components/edit/EditSheet";
import { MonthTab } from "./components/month/MonthTab";
import { OverviewTab } from "./components/overview/OverviewTab";
import { markPaid, markUnpaid } from "./lib/actions";
import { addMonths, monthOf, monthTitle, type Month } from "./lib/dates";
import { entriesIn, entryFor, monthView } from "./lib/month";
import { overview } from "./lib/overview";
import type { Entry } from "./lib/status";
import { useBills } from "./queries";
import type { Bill } from "./types";
import { useBillChanges } from "./useBillChanges";
import { useReceiptBackground } from "./useReceiptBackground";
import { useToday } from "./useToday";
import styles from "./BillsPage.module.css";

const TITLES: Record<Tab, string> = {
  month: "Bills",
  calendar: "Calendar",
  overview: "Overview",
};

/** Which sheet is open: one due date, or the edit form (null bill = new). */
type Open =
  | { kind: "bill"; id: string; key: string }
  | { kind: "edit"; id: string | null }
  | null;

export function BillsPage({ now }: { now?: Date }) {
  const navigate = useNavigate();
  const bills = useBills();
  const { toast, dismiss, change, add, drop } = useBillChanges();
  useReceiptBackground();

  const today = useToday(now);
  const [tab, setTab] = useState<Tab>("month");
  const [month, setMonth] = useState<Month>(() => monthOf(today));
  const [open, setOpen] = useState<Open>(null);
  const list = useMemo(() => bills.data ?? [], [bills.data]);

  const view = useMemo(
    () => monthView(list, month, today),
    [list, month, today],
  );
  const lastMonth = useMemo(
    () =>
      entriesIn(list, addMonths(monthOf(today), -1), today).filter(
        (e) => e.state === "overdue",
      ).length,
    [list, today],
  );
  const stats = useMemo(
    () => (tab === "overview" ? overview(list, today) : null),
    [list, tab, today],
  );

  const byId = (id: string | null) => list.find((b) => b.id === id) ?? null;
  const openBill = open?.kind === "bill" ? byId(open.id) : null;
  const openEntry =
    open?.kind === "bill" && openBill
      ? entryFor(openBill, open.key, today)
      : null;
  const editing = open?.kind === "edit" ? byId(open.id) : null;
  const close = () => setOpen(null);

  const pay = (e: Entry) =>
    change(
      markPaid(e.bill, e.key, today),
      e.bill,
      `${e.bill.name} marked paid`,
    );
  const unpay = (e: Entry) =>
    change(markUnpaid(e.bill, e.key), e.bill, `${e.bill.name} marked not paid`);
  const openEntryOf = (e: Entry) =>
    setOpen({ kind: "bill", id: e.bill.id, key: e.key });
  const handlers = { onOpen: openEntryOf, onPay: pay, onUnpay: unpay };
  const step = (n: number) => setMonth((m) => addMonths(m, n));

  return (
    <div className={styles.page}>
      <GlassHeader
        title={TITLES[tab]}
        subtitle={tab === "overview" ? monthTitle(monthOf(today)) : undefined}
        onBack={() => navigate("/")}
        action={
          tab !== "overview" && (
            <button
              type="button"
              className={styles.add}
              aria-label="Add a bill"
              onClick={() => setOpen({ kind: "edit", id: null })}
            >
              <Plus size={20} strokeWidth={2.6} aria-hidden />
            </button>
          )
        }
      />

      <main className={styles.content}>
        {bills.isPending ? (
          <p className={styles.loading}>Adding it up…</p>
        ) : bills.isError ? (
          <Notice
            tone="error"
            title="Couldn't load your bills"
            body={bills.error.message}
            action={{ label: "Try again", onClick: () => void bills.refetch() }}
          />
        ) : list.length === 0 ? (
          <Notice
            title="No bills yet"
            body="Add rent, subscriptions or anything you pay on a schedule. Bills tells you what's due and what's late."
            action={{
              label: "Add a bill",
              onClick: () => setOpen({ kind: "edit", id: null }),
            }}
          />
        ) : (
          <>
            {tab === "month" && (
              <MonthTab
                month={month}
                view={view}
                lastMonthUnpaid={lastMonth}
                today={today}
                onMonth={step}
                {...handlers}
              />
            )}
            {tab === "calendar" && (
              <CalendarTab
                month={month}
                entries={view.entries}
                today={today}
                onMonth={step}
                {...handlers}
              />
            )}
            {tab === "overview" && stats && (
              <OverviewTab
                data={stats}
                onOpen={(b, key) => setOpen({ kind: "bill", id: b.id, key })}
              />
            )}
          </>
        )}
      </main>

      <TabBar tab={tab} onChange={setTab} />
      <Toast toast={toast} onDismiss={dismiss} />

      {openEntry && (
        <BillSheet
          key={`${openEntry.bill.id}-${openEntry.key}`}
          entry={openEntry}
          today={today}
          onClose={close}
          onEdit={() => setOpen({ kind: "edit", id: openEntry.bill.id })}
          onChange={(next: Bill, message: string) =>
            change(next, openEntry.bill, message)
          }
        />
      )}
      {open?.kind === "edit" && (open.id === null || editing) && (
        <EditSheet
          key={open.id ?? "new"}
          bill={editing}
          today={today}
          onClose={close}
          onSave={(saved) => {
            if (editing) change(saved, editing, `${saved.name} saved`);
            else add(saved);
            close();
          }}
          onDelete={(b) => {
            drop(b);
            close();
          }}
        />
      )}
    </div>
  );
}
