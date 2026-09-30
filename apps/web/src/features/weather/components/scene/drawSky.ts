import { rand, type Frame } from "./sceneState";

/** Pulsing sun glow with slowly turning rays, top right. */
export function drawSun({ ctx, w, h, tick }: Frame) {
  const cx = w * 0.8;
  const cy = 90;
  const pulse = 130 + Math.sin(tick / 50) * 14;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulse);
  g.addColorStop(0, "rgba(255,244,200,0.95)");
  g.addColorStop(0.2, "rgba(255,225,140,0.5)");
  g.addColorStop(1, "rgba(255,225,140,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, 320);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tick / 900);
  for (let k = 0; k < 12; k++) {
    ctx.rotate(Math.PI / 6);
    ctx.fillStyle = "rgba(255,246,210,0.08)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.max(w, h), -16);
    ctx.lineTo(Math.max(w, h), 16);
    ctx.fill();
  }
  ctx.restore();
}

function drawMoon(ctx: CanvasRenderingContext2D, w: number) {
  const mx = w * 0.78;
  const my = 88;
  const mg = ctx.createRadialGradient(mx, my, 0, mx, my, 80);
  mg.addColorStop(0, "rgba(255,250,225,0.45)");
  mg.addColorStop(1, "rgba(255,250,225,0)");
  ctx.fillStyle = mg;
  ctx.fillRect(mx - 80, my - 80, 160, 160);
  ctx.fillStyle = "#fdf6d8";
  ctx.beginPath();
  ctx.arc(mx, my, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(18,28,64,0.92)";
  ctx.beginPath();
  ctx.arc(mx + 8, my - 4, 16, 0, Math.PI * 2);
  ctx.fill();
}

function drawShootingStar({ ctx, st, w }: Frame) {
  if (!st.shoot && Math.random() < 0.004) {
    st.shoot = { x: rand(40, w * 0.7), y: rand(20, 120), a: 1 };
  }
  const s = st.shoot;
  if (!s) return;
  ctx.strokeStyle = `rgba(255,255,255,${s.a})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(s.x - 30, s.y - 14);
  ctx.stroke();
  s.x += 6;
  s.y += 3;
  s.a -= 0.03;
  if (s.a <= 0) st.shoot = null;
}

/** Twinkling stars, a crescent moon and the odd shooting star. */
export function drawNightSky(frame: Frame) {
  const { ctx, st, w, tick, animate } = frame;
  for (const s of st.stars) {
    ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.7 * Math.abs(Math.sin(tick / 45 + s.p))})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  drawMoon(ctx, w);
  if (animate) drawShootingStar(frame);
}
