import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile, type Profile } from "../../shared/hooks/useProfile";

export const canUseHockey = (profile: Profile | undefined) =>
  profile?.role === "ADMIN" || !!profile?.permissions?.hockey;

/** Sends people without the hockey permission who open /hockey back to the hub. */
export function useHockeyAccess() {
  const navigate = useNavigate();
  const profile = useProfile();
  const denied = profile.isSuccess && !canUseHockey(profile.data);
  useEffect(() => {
    if (denied) navigate("/");
  }, [denied, navigate]);
}
