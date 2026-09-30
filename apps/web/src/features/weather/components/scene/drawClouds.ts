import type { SceneKind } from "../../types";
import type { Cloud, Frame } from "./sceneState";

type CloudStyle = [rgb: string, alpha: number];

function cloudStyle(kind: SceneKind, isDay: boolean): CloudStyle | null {
  if (kind === "clear") return null;
  if (kind === "partly")
    return isDay ? ["255,255,255", 0.38] : ["150,165,215", 0.16];
  if (kind === "cloudy")
    return isDay ? ["238,242,247", 0.42] : ["95,108,135", 0.3];
  if (kind === "snow") return ["235,242,250", 0.36];
  if (kind === "fog") return ["225,230,235", 0.2];
  if (kind === "storm") return ["30,34,52", 0.62];
  return isDay ? ["50,64,82", 0.5] : ["28,36,50", 0.55]; // rain
}

const PUFFS = [
  [0, 0, 46],
  [38, -12, 58],
  [86, 0, 50],
  [54, 14, 52],
  [16, 16, 42],
] as const;

function drawCloud(
  ctx: CanvasRenderingContext2D,
  c: Cloud,
  [color, alpha]: CloudStyle,
) {
  for (const [dx, dy, r0] of PUFFS) {
    const px = c.x + dx * c.s;
    const py = c.y + dy * c.s;
    const r = r0 * c.s;
    const g = ctx.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, `rgba(${color},${alpha})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Soft clouds drifting right; fewer of them for partly cloudy and fog. */
export function drawClouds(frame: Frame, kind: SceneKind, isDay: boolean) {
  const { ctx, st, w, animate } = frame;
  const style = cloudStyle(kind, isDay);
  if (!style) return;
  const count = kind === "partly" ? 3 : kind === "fog" ? 2 : st.clouds.length;
  for (const c of st.clouds.slice(0, count)) {
    if (animate) {
      c.x += c.v;
      if (c.x > w + 60) c.x = -150 * c.s;
    }
    drawCloud(ctx, c, style);
  }
}

/** Wide horizontal fog bands sliding across the screen. */
export function drawFog(frame: Frame, isDay: boolean) {
  const { ctx, st, w, animate } = frame;
  for (const f of st.fog) {
    if (animate) {
      f.x += f.v;
      if (f.x > w) f.x = -f.w;
    }
    const g = ctx.createLinearGradient(0, f.y - 60, 0, f.y + 60);
    g.addColorStop(0, "rgba(235,238,241,0)");
    g.addColorStop(
      0.5,
      isDay ? "rgba(235,238,241,0.22)" : "rgba(170,178,190,0.14)",
    );
    g.addColorStop(1, "rgba(235,238,241,0)");
    ctx.fillStyle = g;
    ctx.fillRect(f.x, f.y - 60, f.w, 120);
  }
}
