import {
  APPLICATION_STATUSES,
  type Application,
  type ApplicationStatus,
} from "@lifehub/shared";

/** Splits applications into one list per status, in board column order. */
export function groupByStatus(
  applications: Application[],
): Record<ApplicationStatus, Application[]> {
  const columns = Object.fromEntries(
    APPLICATION_STATUSES.map((status) => [status, [] as Application[]]),
  ) as Record<ApplicationStatus, Application[]>;
  for (const app of applications) columns[app.status]?.push(app);
  return columns;
}

/** When the card last changed; older items may not have updatedAt. */
export const lastActivity = (app: Application): string =>
  app.updatedAt || app.createdAt;
