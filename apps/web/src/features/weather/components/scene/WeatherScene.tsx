import { useEffect, useRef } from "react";
import type { Scene } from "../../types";
import { drawFrame } from "./drawFrame";
import { makeState, type SceneState } from "./sceneState";
import styles from "./WeatherScene.module.css";

// Full-screen canvas that simulates the current conditions behind the glass
// cards: rain, storms (with lightning), snow, sun, stars, fog, drifting
// clouds. Honors reduced motion by drawing a single still frame.

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function drawStill(ctx: CanvasRenderingContext2D, scene: Scene) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const st = makeState(w, h);
  drawFrame({ ctx, st, w, h, tick: 0, animate: false }, scene);
}

export function WeatherScene({ scene }: { scene: Scene }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef(scene);
  useEffect(() => {
    sceneRef.current = scene;
  }, [scene]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduceMotion = prefersReducedMotion();
    let w = 0;
    let h = 0;
    let st: SceneState | null = null;
    let tick = 0;
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const fresh = makeState(w, h);
      st = fresh;
      if (reduceMotion)
        drawFrame(
          { ctx, st: fresh, w, h, tick: 0, animate: false },
          sceneRef.current,
        );
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = () => {
      tick++;
      if (st)
        drawFrame({ ctx, st, w, h, tick, animate: true }, sceneRef.current);
      raf = requestAnimationFrame(loop);
    };
    if (!reduceMotion) raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Reduced-motion users still need the still frame redrawn when the scene changes.
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && prefersReducedMotion()) drawStill(ctx, scene);
  }, [scene]);

  return (
    <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
  );
}
