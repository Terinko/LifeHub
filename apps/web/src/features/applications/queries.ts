import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type { Application, ApplicationStatus } from "@lifehub/shared";
import {
  deleteApplication,
  listApplications,
  saveApplication,
  updateApplicationStatus,
} from "./api";

export const applicationKeys = {
  all: ["applications"] as const,
};

export function useApplications(enabled = true) {
  return useQuery({
    queryKey: applicationKeys.all,
    queryFn: listApplications,
    enabled,
  });
}

function setApplications(
  qc: QueryClient,
  update: (apps: Application[]) => Application[],
) {
  qc.setQueryData<Application[]>(applicationKeys.all, (apps = []) =>
    update(apps),
  );
}

export function useSaveApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveApplication,
    onSuccess: (saved) =>
      setApplications(qc, (apps) => [
        ...apps.filter((a) => a.sk !== saved.sk),
        saved,
      ]),
  });
}

/**
 * Moving a card is the board's main interaction, so it updates the screen
 * immediately and rolls back if the server rejects it.
 */
export function useUpdateApplicationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sk, status }: { sk: string; status: ApplicationStatus }) =>
      updateApplicationStatus(sk, status),
    onMutate: async ({ sk, status }) => {
      await qc.cancelQueries({ queryKey: applicationKeys.all });
      const previous = qc.getQueryData<Application[]>(applicationKeys.all);
      const updatedAt = new Date().toISOString();
      setApplications(qc, (apps) =>
        apps.map((a) => (a.sk === sk ? { ...a, status, updatedAt } : a)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) =>
      qc.setQueryData(applicationKeys.all, context?.previous),
  });
}

export function useDeleteApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteApplication,
    onMutate: async (sk) => {
      await qc.cancelQueries({ queryKey: applicationKeys.all });
      const previous = qc.getQueryData<Application[]>(applicationKeys.all);
      setApplications(qc, (apps) => apps.filter((a) => a.sk !== sk));
      return { previous };
    },
    onError: (_err, _sk, context) =>
      qc.setQueryData(applicationKeys.all, context?.previous),
  });
}
