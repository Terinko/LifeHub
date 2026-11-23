import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RunData, RunGarminCallback } from "@lifehub/shared";
import {
  disconnectGarmin,
  finishGarminConnect,
  getRunData,
  startGarminConnect,
} from "./api";

export const runKeys = { data: ["run", "data"] as const };

/** Every run since the start of last year; it only changes after a run syncs. */
export const useRunData = (enabled = true) =>
  useQuery({
    queryKey: runKeys.data,
    queryFn: getRunData,
    staleTime: 5 * 60_000,
    enabled,
  });

/** Garmin's consent page is on garmin.com, so this leaves LifeHub on success. */
export const useStartGarminConnect = () =>
  useMutation({
    mutationFn: startGarminConnect,
    onSuccess: ({ url }) => window.location.assign(url),
  });

function useReplacesRunData<T>(mutationFn: (arg: T) => Promise<RunData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data) => qc.setQueryData(runKeys.data, data),
  });
}

export const useFinishGarminConnect = () =>
  useReplacesRunData((body: RunGarminCallback) => finishGarminConnect(body));

export const useDisconnectGarmin = () =>
  useReplacesRunData(() => disconnectGarmin());
