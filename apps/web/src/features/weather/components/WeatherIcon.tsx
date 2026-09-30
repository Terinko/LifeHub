import { createElement } from "react";
import {
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Cloudy,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";

function iconFor(code: number | null, isDay: boolean): LucideIcon {
  const c = code ?? -1;
  if (c === 1) return isDay ? Sun : Moon;
  if (c === 2) return isDay ? CloudSun : CloudMoon;
  if (c === 3) return Cloudy;
  if (c === 45 || c === 48) return CloudFog;
  if (c >= 51 && c <= 57) return CloudDrizzle;
  if ((c >= 61 && c <= 67) || (c >= 80 && c <= 82)) return CloudRain;
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return CloudSnow;
  if (c >= 95) return CloudLightning;
  return isDay ? Sun : Moon;
}

type Props = {
  code: number | null;
  isDay?: boolean;
  size?: number;
  className?: string;
};

/** Lucide icon for a WMO weather code, day or night. */
export function WeatherIcon({
  code,
  isDay = true,
  size = 22,
  className,
}: Props) {
  // createElement rather than <Icon />: the icon is one of the static
  // lucide components above, picked per code, not a component made here.
  return createElement(iconFor(code, isDay), {
    size,
    strokeWidth: 1.6,
    className,
    "aria-hidden": "true",
  });
}
