import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile, type Profile } from "../../shared/hooks/useProfile";

export const canUseThrift = (profile: Profile | undefined) =>
  profile?.role === "ADMIN" || !!profile?.permissions?.thrift;

/** Sends people without the thrift permission who open /thrift back to the hub. */
export function useThriftAccess() {
  const navigate = useNavigate();
  const profile = useProfile();
  const denied = profile.isSuccess && !canUseThrift(profile.data);
  useEffect(() => {
    if (denied) navigate("/");
  }, [denied, navigate]);
}
