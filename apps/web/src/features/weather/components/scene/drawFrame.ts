import type { Scene } from "../../types";
import { drawClouds, drawFog } from "./drawClouds";
import { drawLightning, drawRain, drawSnow } from "./drawPrecip";
import { drawNightSky, drawSun } from "./drawSky";
import type { Frame } from "./sceneState";

/** Draws one frame of the scene, back to front. */
export function drawFrame(frame: Frame, scene: Scene) {
  const { kind, isDay, intensity } = scene;
  const openSky = kind === "clear" || kind === "partly";
  frame.ctx.clearRect(0, 0, frame.w, frame.h);

  if (isDay && openSky) drawSun(frame);
  if (!isDay && openSky) drawNightSky(frame);
  drawClouds(frame, kind, isDay);
  if (kind === "fog") drawFog(frame, isDay);
  if (kind === "rain" || kind === "storm")
    drawRain(frame, kind === "storm", intensity);
  if (kind === "snow") drawSnow(frame, intensity);
  if (kind === "storm" && frame.animate) drawLightning(frame);
}
