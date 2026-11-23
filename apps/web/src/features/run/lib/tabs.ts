export type Tab = "week" | "running" | "lifting" | "insights";

/** The four views of the Training page, in order. */
export const TABS: { key: Tab; label: string }[] = [
  { key: "week", label: "Week" },
  { key: "running", label: "Running" },
  { key: "lifting", label: "Lifting" },
  { key: "insights", label: "Insights" },
];
