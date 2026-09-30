import type { WeatherAlert } from "../types";

/** The parts of an NWS `/alerts/active` GeoJSON response we read. */
export type NwsAlertsResponse = {
  features?: {
    properties: {
      id: string;
      event: string;
      headline: string;
      severity?: string;
      ends?: string | null;
      expires?: string;
      description: string;
      instruction?: string | null;
      senderName: string;
    };
  }[];
};

const SEVERITY_RANK: Record<string, number> = {
  Extreme: 0,
  Severe: 1,
  Moderate: 2,
  Minor: 3,
  Unknown: 4,
};

const rank = (severity: string | undefined) =>
  (severity == null ? undefined : SEVERITY_RANK[severity]) ?? 5;

/** Active alerts, most severe first. */
export function shapeAlerts(json: NwsAlertsResponse): WeatherAlert[] {
  return (json.features || [])
    .map(({ properties: p }) => ({
      id: p.id,
      event: p.event,
      headline: p.headline,
      severity: p.severity,
      ends: p.ends || p.expires,
      description: p.description,
      instruction: p.instruction,
      sender: p.senderName,
    }))
    .sort((a, b) => rank(a.severity) - rank(b.severity));
}

/** Extreme and severe alerts get the red card; the rest stay amber. */
export const isSevere = (alert: WeatherAlert) =>
  ["extreme", "severe"].includes((alert.severity || "unknown").toLowerCase());

/** "Until Tue 6:00 PM · " or nothing when the alert has no end time. */
export function alertUntil(alert: WeatherAlert): string {
  if (!alert.ends) return "";
  const when = new Date(alert.ends).toLocaleString([], {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
  return `Until ${when} · `;
}
