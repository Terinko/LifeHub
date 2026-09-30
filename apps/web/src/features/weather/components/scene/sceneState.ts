// Particle state for the background canvas. Counts scale with screen area.

export const rand = (a: number, b: number) => a + Math.random() * (b - a);

export type Drop = { x: number; y: number; l: number; v: number };
export type Flake = { x: number; y: number; r: number; v: number; p: number };
export type Star = { x: number; y: number; r: number; p: number };
export type Cloud = { x: number; y: number; s: number; v: number };
export type FogBand = { x: number; y: number; w: number; v: number };
export type ShootingStar = { x: number; y: number; a: number };

export type SceneState = {
  drops: Drop[];
  flakes: Flake[];
  stars: Star[];
  clouds: Cloud[];
  fog: FogBand[];
  shoot: ShootingStar | null;
  bolt: number;
  boltCountdown: number;
};

export function makeState(w: number, h: number): SceneState {
  const area = (w * h) / (390 * 844); // relative to an iPhone-sized screen
  return {
    drops: Array.from({ length: Math.round(320 * area) }, () => ({
      x: rand(0, w),
      y: rand(0, h),
      l: rand(8, 20),
      v: rand(0.6, 1.4),
    })),
    flakes: Array.from({ length: Math.round(160 * area) }, () => ({
      x: rand(0, w),
      y: rand(0, h),
      r: rand(1, 3.2),
      v: rand(0.3, 1.1),
      p: rand(0, 6.28),
    })),
    stars: Array.from({ length: Math.round(90 * area) }, () => ({
      x: rand(0, w),
      y: rand(0, h * 0.45),
      r: rand(0.4, 1.5),
      p: rand(0, 6.28),
    })),
    clouds: Array.from({ length: 7 }, () => ({
      x: rand(-100, w),
      y: rand(10, h * 0.28),
      s: rand(0.7, 1.6),
      v: rand(0.06, 0.22),
    })),
    fog: Array.from({ length: 5 }, (_, i) => ({
      x: rand(-w, 0),
      y: h * (0.15 + i * 0.17),
      w: rand(w * 1.2, w * 2),
      v: rand(0.08, 0.25),
    })),
    shoot: null,
    bolt: 0,
    boltCountdown: rand(120, 300),
  };
}

/** What every draw step needs: where to draw and which frame this is. */
export type Frame = {
  ctx: CanvasRenderingContext2D;
  st: SceneState;
  w: number;
  h: number;
  tick: number;
  /** False for the single still frame drawn for reduced motion. */
  animate: boolean;
};
