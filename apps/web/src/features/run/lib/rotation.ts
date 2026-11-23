import { ROTATION, type Session, type Slot } from "./sessions";

export type RotationEntry = {
  date: string;
  slot: Slot;
  status: "done" | "skipped";
};

const after = (slot: Slot): Slot =>
  ROTATION[(ROTATION.indexOf(slot) + 1) % ROTATION.length] ?? "back";

/**
 * Walks the sessions through the Back + Bi, Chest + Tri, Run rotation. The
 * rotation is a sequence, not a calendar: rest days just push the next
 * session back. When a different session is done than the one due, the due
 * ones before it are marked skipped and the rotation carries on from what
 * was done. A lift whose day can't be told counts as the lift that was due.
 */
export function walkRotation(sessions: Session[]): {
  entries: RotationEntry[];
  next: Slot;
} {
  const entries: RotationEntry[] = [];
  let due: Slot | undefined;
  for (const s of sessions) {
    const target: Slot =
      s.kind === "lift" ? (due === "chest" ? "chest" : "back") : s.kind;
    due ??= target;
    while (due !== target) {
      entries.push({ date: s.date, slot: due, status: "skipped" });
      due = after(due);
    }
    entries.push({ date: s.date, slot: target, status: "done" });
    due = after(target);
  }
  return { entries, next: due ?? "back" };
}

/** Share of the rotation done in order since `from`, 0–1; undefined with no entries. */
export function adherence(
  entries: RotationEntry[],
  from: string,
): number | undefined {
  const recent = entries.filter((e) => e.date >= from);
  if (recent.length === 0) return undefined;
  return recent.filter((e) => e.status === "done").length / recent.length;
}
