import type {
  RunData,
  RunGarminCallback,
  RunGarminConnectStart,
} from "@lifehub/shared";
import { api } from "../../shared/api/client";

export const getRunData = () => api.get<RunData>("/run");

export const startGarminConnect = (redirectUri: string) =>
  api.post<RunGarminConnectStart>("/run/garmin/connect", { redirectUri });

export const finishGarminConnect = (body: RunGarminCallback) =>
  api.post<RunData>("/run/garmin/callback", body);

export const disconnectGarmin = () => api.delete<RunData>("/run/garmin");
