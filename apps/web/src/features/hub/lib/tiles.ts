import type { MyProfile, ToolPermission } from "@lifehub/shared";

export type TileKey =
  Exclude<ToolPermission, "pokerStats"> | "applications" | "admin";

/** One card on the Hub. */
export type HubTile = {
  key: TileKey;
  label: string;
  subtitle: string;
  path: string;
};

/** Tools anyone can be granted, in Hub order. */
const TOOL_TILES: (HubTile & { key: ToolPermission })[] = [
  {
    key: "bills",
    label: "Bills",
    subtitle: "Split & settle up",
    path: "/bills",
  },
  {
    key: "kitchen",
    label: "Kitchen",
    subtitle: "Quick meals & grocery list",
    path: "/kitchen",
  },
  {
    key: "poker",
    label: "Poker",
    subtitle: "Game night ledger",
    path: "/poker",
  },
  {
    key: "fantasy",
    label: "Fantasy",
    subtitle: "Weekly watch-along",
    path: "/fantasy",
  },
  {
    key: "weather",
    label: "Weather",
    subtitle: "Ad-free forecast",
    path: "/weather",
  },
];

/** Only admins see these, after the tools. */
const ADMIN_TILES: HubTile[] = [
  {
    key: "applications",
    label: "Applications",
    subtitle: "Job search tracker",
    path: "/applications",
  },
  { key: "admin", label: "Admin", subtitle: "Manage access", path: "/admin" },
];

/**
 * The cards this user sees: every tool for an admin (plus the admin-only
 * cards), otherwise the tools they've been granted.
 */
export function hubTiles(profile: MyProfile | undefined): HubTile[] {
  if (profile?.role === "ADMIN") return [...TOOL_TILES, ...ADMIN_TILES];
  const permissions = profile?.permissions ?? {};
  return TOOL_TILES.filter((tile) => !!permissions[tile.key]);
}
