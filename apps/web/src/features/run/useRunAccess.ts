import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile, type Profile } from "../../shared/hooks/useProfile";

export const canUseRun = (profile: Profile | undefined) =>
  profile?.role === "ADMIN" || !!profile?.permissions?.run;

/** Sends people without the run permission who open /run back to the hub. */
export function useRunAccess() {
  const navigate = useNavigate();
  const profile = useProfile();
  const denied = profile.isSuccess && !canUseRun(profile.data);
  useEffect(() => {
    if (denied) navigate("/");
  }, [denied, navigate]);
}
