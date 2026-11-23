import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RunData } from "@lifehub/shared";
import { connectGarmin, disconnectGarmin, getRunData } from "./api";

export const runKeys = { data: ["run", "data"] as const };

/** Every run since the start of last year; the server copies new ones from Garmin. */
export const useRunData = () =>
  useQuery({
    queryKey: runKeys.data,
    queryFn: () => getRunData(),
    staleTime: 5 * 60_000,
  });

function useReplacesRunData(mutationFn: () => Promise<RunData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data) => qc.setQueryData(runKeys.data, data),
  });
}

/** Refresh: ask Garmin for new runs now. */
export const useRefreshRuns = () => useReplacesRunData(() => getRunData(true));

export const useConnectGarmin = () => useReplacesRunData(connectGarmin);

export const useDisconnectGarmin = () => useReplacesRunData(disconnectGarmin);
