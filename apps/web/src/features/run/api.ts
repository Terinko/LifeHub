import type { GarminCheck, RunData } from "@lifehub/shared";
import { api } from "../../shared/api/client";

/** `refresh` copies new activities from Garmin first instead of waiting up to 15 minutes. */
export const getRunData = (refresh = false) =>
  api.get<RunData>(refresh ? "/run?refresh=1" : "/run");

export const connectGarmin = () => api.post<RunData>("/run/garmin");

export const disconnectGarmin = () => api.delete<RunData>("/run/garmin");

/** The owner's data check: what Garmin sends for each kind of data. */
export const checkGarmin = () => api.get<GarminCheck>("/run/garmin/check");
