import { useMutation, useQueryClient } from "@tanstack/react-query";
import { profileKeys, type Profile } from "../../shared/hooks/useProfile";
import { markChangelogSeen } from "./api";

/**
 * Closes "What's New" right away, then tells the server. The cached profile
 * drops its entries so the popup doesn't come back on the next Hub visit.
 */
export function useDismissChangelog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markChangelogSeen,
    onMutate: () =>
      qc.setQueryData<Profile>(
        profileKeys.me,
        (profile) => profile && { ...profile, unseenChangelog: [] },
      ),
    onError: (error) => console.error("Failed to mark changelog seen", error),
  });
}
