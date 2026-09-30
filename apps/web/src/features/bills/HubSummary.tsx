import { useMemo } from "react";
import { monthOf, monthShort } from "./lib/dates";
import { formatShort } from "./lib/money";
import { monthView } from "./lib/month";
import { useBillsSummary } from "./queries";
import styles from "./HubSummary.module.css";

type Props = {
  /** Shown while loading, on error, or with no bills. */
  fallback: string;
  /** The Hub card's subtitle style, for the line under the badge. */
  subtitleClassName?: string;
};

/** The Bills tile on the Hub: what's late and what's left this month. */
export function BillsHubSummary({ fallback, subtitleClassName }: Props) {
  const bills = useBillsSummary(true);
  const view = useMemo(() => {
    if (!bills.data?.length) return null;
    const today = new Date();
    return { today, ...monthView(bills.data, monthOf(today), today) };
  }, [bills.data]);

  if (!view) return <div className={subtitleClassName}>{fallback}</div>;
  const late = view.overdue.length;
  const month = monthShort(view.today.getMonth());
  return (
    <>
      {late > 0 && <span className={styles.late}>{late} overdue</span>}
      <div className={subtitleClassName}>
        {view.left > 0
          ? `${formatShort(Math.round(view.left))} left in ${month}`
          : `All paid for ${month}`}
      </div>
    </>
  );
}
