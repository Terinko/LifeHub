import type { ToolPermission, ToolPermissions } from "@lifehub/shared";

/** The pills an admin toggles, in display order. */
export const PERMISSION_OPTIONS: {
  key: ToolPermission;
  label: string;
  icon: string;
}[] = [
  { key: "bills", label: "Bills", icon: "💸" },
  { key: "kitchen", label: "Kitchen", icon: "🍳" },
  { key: "poker", label: "Poker", icon: "🃏" },
  { key: "pokerStats", label: "Poker Stats", icon: "📊" },
  { key: "fantasy", label: "Fantasy", icon: "🏈" },
  { key: "weather", label: "Weather", icon: "🌦️" },
  { key: "hockey", label: "Hockey", icon: "🏒" },
];

/** What a new invite starts with: no tools. */
export const noPermissions = (): Record<ToolPermission, boolean> => ({
  bills: false,
  kitchen: false,
  poker: false,
  pokerStats: false,
  fantasy: false,
  weather: false,
  hockey: false,
});

/** `permissions` with one tool switched on or off. */
export const togglePermission = <T extends ToolPermissions>(
  permissions: T | undefined,
  tool: ToolPermission,
): T => ({ ...permissions, [tool]: !permissions?.[tool] }) as T;
