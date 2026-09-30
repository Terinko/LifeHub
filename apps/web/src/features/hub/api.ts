import { api } from "../../shared/api/client";

/** Dismisses the "What's New" popup until the next changelog entry. */
export const markChangelogSeen = () =>
  api.post<{ success: boolean }>("/admin/changelog-seen");
