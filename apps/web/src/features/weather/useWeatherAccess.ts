import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile, type Profile } from "../../shared/hooks/useProfile";

export const canUseWeather = (profile: Profile | undefined) =>
  profile?.role === "ADMIN" || !!profile?.permissions?.weather;

/**
 * The hub tile is gated by the `weather` permission, so send people who
 * open /weather directly without it back to the hub. A failed profile load
 * (network hiccup) doesn't lock anyone out of public weather data.
 */
export function useWeatherAccess() {
  const navigate = useNavigate();
  const profile = useProfile();
  const denied = profile.isSuccess && !canUseWeather(profile.data);
  useEffect(() => {
    if (denied) navigate("/");
  }, [denied, navigate]);
}
