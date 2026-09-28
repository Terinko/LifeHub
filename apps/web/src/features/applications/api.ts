import type {
  Application,
  ApplicationStatus,
  SaveApplicationInput,
  UpdateStatusResult,
} from "@lifehub/shared";
import { api } from "../../shared/api/client";

export const listApplications = () => api.get<Application[]>("/applications");

export const saveApplication = (input: SaveApplicationInput) =>
  api.post<Application>("/applications", input);

export const updateApplicationStatus = (
  sk: string,
  status: ApplicationStatus,
) =>
  api.post<UpdateStatusResult>("/applications", {
    action: "UPDATE_STATUS",
    sk,
    status,
  });

export const deleteApplication = (sk: string) =>
  api.delete<{ message: string }>(`/applications/${encodeURIComponent(sk)}`);
