import { useId, useState } from "react";
import { Activity, Check, Users, Zap } from "lucide-react";
import {
  monthOf,
  monthTitle,
  ordinal,
  parseDay,
  parseMonth,
  shortDate,
} from "../../lib/dates";
import {
  billFromForm,
  blankForm,
  formOf,
  type BillForm,
  type Ends,
} from "../../lib/form";
import { parseAmount } from "../../lib/money";
import { endAfter } from "../../lib/payoff";
import type { Bill, Frequency } from "../../types";
import { Sheet } from "../chrome/Sheet";
import card from "../chrome/card.module.css";
import { Field } from "./Field";
import { Segmented } from "./Segmented";
import { SharesEditor } from "./SharesEditor";
import { Toggle } from "./Toggle";
import styles from "./EditSheet.module.css";

type Props = {
  /** The bill to edit, or null to add one. */
  bill: Bill | null;
  today: Date;
  onClose: () => void;
  onSave: (bill: Bill) => void;
  onDelete: (bill: Bill) => void;
};

const REPEATS = [
  { value: "monthly", label: "Monthly" },
  { value: "biweekly", label: "2 weeks" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "once", label: "Once" },
] as const;

const ENDS = [
  { value: "never", label: "Never" },
  { value: "on", label: "On a month" },
  { value: "after", label: "After # payments" },
] as const;

function dueHint(form: BillForm): string {
  if (form.frequency === "monthly") {
    const day = Number(form.dueDay);
    if (!Number.isInteger(day) || day < 1 || day > 31)
      return "A day from 1 to 31.";
    return day >= 29
      ? `Due the ${ordinal(day)}; in shorter months it's due on the last day.`
      : `Due the ${ordinal(day)} of every month.`;
  }
  const d = parseDay(form.anchorDate);
  if (!d) return "";
  const on = shortDate(d);
  switch (form.frequency) {
    case "biweekly":
      return `Then every 2 weeks after ${on}.`;
    case "quarterly":
      return `Then every 3 months on the ${ordinal(d.getDate())}.`;
    case "yearly":
      return `Then every year on ${on}.`;
    default:
      return "Just this once.";
  }
}

export function EditSheet({ bill, today, onClose, onSave, onDelete }: Props) {
  const [form, setForm] = useState<BillForm>(() =>
    bill ? formOf(bill, today) : blankForm(today),
  );
  const [error, setError] = useState<string | null>(null);
  const notesId = useId();
  const set = (fields: Partial<BillForm>) => {
    setForm((f) => ({ ...f, ...fields }));
    setError(null);
  };

  const save = () => {
    const result = billFromForm(form, bill, today);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onSave(result.bill);
  };

  const monthly = form.frequency === "monthly";
  const once = form.frequency === "once";
  const count = Number(form.count);
  const draft = billFromForm({ ...form, ends: "never" }, bill, today);
  const endsIn =
    form.ends === "after" &&
    Number.isInteger(count) &&
    count >= 1 &&
    "bill" in draft
      ? endAfter(draft.bill, count, monthOf(today))
      : null;
  const endMonth = endsIn ? parseMonth(endsIn) : null;

  return (
    <Sheet title={bill ? "Edit bill" : "New bill"} onClose={onClose}>
      <Field
        label="Name"
        value={form.name}
        onValue={(name) => set({ name })}
        placeholder="Rent, Phone, Car insurance…"
        maxLength={100}
        autoFocus={!bill}
      />
      <Field
        label="Who you pay"
        value={form.payee}
        onValue={(payee) => set({ payee })}
        placeholder="Optional"
      />
      <Field
        label={form.isVariable ? "Usual amount" : "Amount"}
        hint={
          form.isVariable
            ? "Optional. Used as a guess until you add the real amount."
            : undefined
        }
        prefix="$"
        mono
        inputMode="decimal"
        value={form.amount}
        onValue={(amount) => set({ amount })}
        placeholder="0.00"
      />
      <Toggle
        title="Changes every time"
        hint="You'll add the amount when it's due"
        icon={<Activity size={18} />}
        checked={form.isVariable}
        onChange={(isVariable) => set({ isVariable })}
      />
      <Segmented<Frequency>
        label="Repeats"
        options={REPEATS}
        value={form.frequency}
        onChange={(frequency) =>
          set({ frequency, ends: frequency === "once" ? "never" : form.ends })
        }
      />
      {monthly ? (
        <Field
          label="Due day"
          hint={dueHint(form)}
          inputMode="numeric"
          mono
          value={form.dueDay}
          onValue={(dueDay) =>
            set({ dueDay: dueDay.replace(/\D/g, "").slice(0, 2) })
          }
        />
      ) : (
        <Field
          label={once ? "Due on" : "Next due"}
          hint={dueHint(form)}
          type="date"
          value={form.anchorDate}
          onValue={(anchorDate) => set({ anchorDate })}
        />
      )}
      {!once && (
        <>
          <Field
            label="First month"
            hint="Months before this don't count."
            type="month"
            value={form.startMonth}
            onValue={(startMonth) => set({ startMonth })}
          />
          <Segmented<Ends>
            label="Ends"
            options={ENDS}
            value={form.ends}
            onChange={(ends) => set({ ends })}
          />
          {form.ends === "on" && (
            <Field
              label="Last month"
              type="month"
              value={form.endMonth}
              onValue={(endMonth) => set({ endMonth })}
            />
          )}
          {form.ends === "after" && (
            <Field
              label="Payments left"
              hint={
                endMonth
                  ? `Counting this month's. The last one is in ${monthTitle(endMonth)}.`
                  : "Counting this month's."
              }
              inputMode="numeric"
              mono
              value={form.count}
              onValue={(c) => set({ count: c.replace(/\D/g, "").slice(0, 3) })}
            />
          )}
        </>
      )}
      <div className={styles.switches}>
        <Toggle
          title="Autopay"
          hint="Marks itself paid on the due date"
          icon={<Zap size={18} />}
          checked={form.autopay}
          onChange={(autopay) => set({ autopay })}
        />
        <div className={styles.rule} />
        <Toggle
          title="Split with others"
          hint="Track who owes you their share"
          icon={<Users size={18} />}
          checked={form.isShared}
          onChange={(isShared) => set({ isShared })}
        />
        {form.isShared && (
          <SharesEditor
            people={form.people}
            amount={parseAmount(form.amount)}
            onChange={(people) => set({ people })}
          />
        )}
      </div>
      <div className={styles.notes}>
        <label htmlFor={notesId} className={card.label}>
          Notes
        </label>
        <textarea
          id={notesId}
          className={styles.textarea}
          value={form.notes}
          maxLength={1000}
          onChange={(e) => set({ notes: e.target.value })}
        />
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button type="button" className={card.primary} onClick={save}>
        <Check size={18} strokeWidth={2.8} aria-hidden />
        {bill ? "Save changes" : "Add bill"}
      </button>
      {bill && (
        <>
          <button
            type="button"
            className={card.danger}
            onClick={() => onDelete(bill)}
          >
            Delete bill
          </button>
          <span className={styles.fine}>You can undo right after.</span>
        </>
      )}
    </Sheet>
  );
}
