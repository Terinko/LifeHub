import { rand, type Frame } from "./sceneState";

/** Slanted rain streaks; storms fall faster, heavier and more sideways. */
export function drawRain(frame: Frame, storm: boolean, intensity: number) {
  const { ctx, st, w, h, animate } = frame;
  const heavy = storm ? 1.6 : intensity;
  const n = Math.min(
    st.drops.length,
    Math.round(st.drops.length * 0.5 * heavy),
  );
  const speed = storm ? 1.5 : 0.8 + 0.25 * intensity;
  const slant = storm ? 0.34 : 0.14;
  ctx.strokeStyle = storm ? "rgba(200,215,255,0.5)" : "rgba(210,228,255,0.42)";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  for (const d of st.drops.slice(0, n)) {
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x + d.l * slant, d.y + d.l);
    if (animate) {
      d.y += d.v * 13 * speed;
      d.x += d.v * 13 * speed * slant;
      if (d.y > h) {
        d.y = -20;
        d.x = rand(-80, w);
      }
    }
  }
  ctx.stroke();
}

/** Flakes swaying as they fall. */
export function drawSnow(frame: Frame, intensity: number) {
  const { ctx, st, w, h, tick, animate } = frame;
  const n = Math.min(
    st.flakes.length,
    Math.round(st.flakes.length * 0.6 * intensity),
  );
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  for (const f of st.flakes.slice(0, n)) {
    if (animate) {
      f.y += f.v;
      f.x += Math.sin(tick / 45 + f.p) * 0.5;
      if (f.y > h) {
        f.y = -6;
        f.x = rand(0, w);
      }
    }
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A jagged bolt and screen flash every few seconds. */
export function drawLightning({ ctx, st, w, h }: Frame) {
  st.boltCountdown--;
  if (st.boltCountdown <= 0) {
    st.bolt = 8;
    st.boltCountdown = rand(160, 380);
  }
  if (st.bolt <= 0) return;
  let x = rand(w * 0.2, w * 0.8);
  let y = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let k = 0; k < 8; k++) {
    x += rand(-22, 22);
    y += rand(30, 56);
    ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = `rgba(255,255,255,${st.bolt % 2 ? 0.35 : 0.1})`;
  ctx.fillRect(0, 0, w, h);
  st.bolt--;
}
