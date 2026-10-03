// The followed team lives in this browser only, like Weather's places.
const TEAM_KEY = "lifehub.hockey.team";

/** Quinnipiac's ESPN id: the default team. */
export const DEFAULT_TEAM_ID = "2514";

export function loadTeamId(): string {
  try {
    return localStorage.getItem(TEAM_KEY) || DEFAULT_TEAM_ID;
  } catch {
    return DEFAULT_TEAM_ID;
  }
}

export function saveTeamId(id: string): void {
  try {
    localStorage.setItem(TEAM_KEY, id);
  } catch {
    /* storage unavailable (private mode): the pick lasts until reload */
  }
}
