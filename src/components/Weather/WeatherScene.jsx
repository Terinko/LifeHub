import { useEffect, useRef } from "react";

// Full-screen canvas that simulates the current conditions behind the glass
// cards: rain, storms (with lightning), snow, sun, stars, fog, drifting
// clouds. Particle counts scale with screen area; honors reduced motion by
// drawing a single still frame.

const rand = (a, b) => a + Math.random() * (b - a);

function makeState(w, h) {
  const area = (w * h) / (390 * 844); // relative to an iPhone-sized screen
  return {
    drops: Array.from({ length: Math.round(320 * area) }, () => ({
      x: rand(0, w), y: rand(0, h), l: rand(8, 20), v: rand(0.6, 1.4),
    })),
    flakes: Array.from({ length: Math.round(160 * area) }, () => ({
      x: rand(0, w), y: rand(0, h), r: rand(1, 3.2), v: rand(0.3, 1.1), p: rand(0, 6.28),
    })),
    stars: Array.from({ length: Math.round(90 * area) }, () => ({
      x: rand(0, w), y: rand(0, h * 0.45), r: rand(0.4, 1.5), p: rand(0, 6.28),
    })),
    clouds: Array.from({ length: 7 }, () => ({
      x: rand(-100, w), y: rand(10, h * 0.28), s: rand(0.7, 1.6), v: rand(0.06, 0.22),
    })),
    fog: Array.from({ length: 5 }, (_, i) => ({
      x: rand(-w, 0), y: h * (0.15 + i * 0.17), w: rand(w * 1.2, w * 2), v: rand(0.08, 0.25),
    })),
    shoot: null,
    bolt: 0,
    boltCountdown: rand(120, 300),
  };
}

function cloudStyle(kind, isDay) {
  if (kind === "clear") return null;
  if (kind === "partly") return isDay ? ["255,255,255", 0.38] : ["150,165,215", 0.16];
  if (kind === "cloudy") return isDay ? ["238,242,247", 0.42] : ["95,108,135", 0.3];
  if (kind === "snow") return ["235,242,250", 0.36];
  if (kind === "fog") return ["225,230,235", 0.2];
  if (kind === "storm") return ["30,34,52", 0.62];
  return isDay ? ["50,64,82", 0.5] : ["28,36,50", 0.55]; // rain
}

function drawCloud(ctx, c, color, alpha) {
  const puffs = [[0, 0, 46], [38, -12, 58], [86, 0, 50], [54, 14, 52], [16, 16, 42]];
  for (const [dx, dy, r0] of puffs) {
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

function drawFrame(ctx, st, w, h, scene, tick, animate) {
  const { kind, isDay, intensity } = scene;
  ctx.clearRect(0, 0, w, h);

  // Sun
  if (isDay && (kind === "clear" || kind === "partly")) {
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

  // Stars, moon, shooting stars
  if (!isDay && (kind === "clear" || kind === "partly")) {
    for (const s of st.stars) {
      ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.7 * Math.abs(Math.sin(tick / 45 + s.p))})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
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
    if (animate) {
      if (!st.shoot && Math.random() < 0.004) {
        st.shoot = { x: rand(40, w * 0.7), y: rand(20, 120), a: 1 };
      }
      if (st.shoot) {
        const s = st.shoot;
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
    }
  }

  // Clouds
  const cs = cloudStyle(kind, isDay);
  if (cs) {
    const count = kind === "partly" ? 3 : kind === "fog" ? 2 : st.clouds.length;
    for (let i = 0; i < count; i++) {
      const c = st.clouds[i];
      if (animate) {
        c.x += c.v;
        if (c.x > w + 60) c.x = -150 * c.s;
      }
      drawCloud(ctx, c, cs[0], cs[1]);
    }
  }

  // Fog bands
  if (kind === "fog") {
    for (const f of st.fog) {
      if (animate) {
        f.x += f.v;
        if (f.x > w) f.x = -f.w;
      }
      const g = ctx.createLinearGradient(0, f.y - 60, 0, f.y + 60);
      g.addColorStop(0, "rgba(235,238,241,0)");
      g.addColorStop(0.5, isDay ? "rgba(235,238,241,0.22)" : "rgba(170,178,190,0.14)");
      g.addColorStop(1, "rgba(235,238,241,0)");
      ctx.fillStyle = g;
      ctx.fillRect(f.x, f.y - 60, f.w, 120);
    }
  }

  // Rain
  if (kind === "rain" || kind === "storm") {
    const heavy = kind === "storm" ? 1.6 : intensity;
    const n = Math.min(st.drops.length, Math.round(st.drops.length * 0.5 * heavy));
    const speed = kind === "storm" ? 1.5 : 0.8 + 0.25 * intensity;
    const slant = kind === "storm" ? 0.34 : 0.14;
    ctx.strokeStyle = kind === "storm" ? "rgba(200,215,255,0.5)" : "rgba(210,228,255,0.42)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const d = st.drops[i];
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

  // Snow
  if (kind === "snow") {
    const n = Math.min(st.flakes.length, Math.round(st.flakes.length * 0.6 * intensity));
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    for (let i = 0; i < n; i++) {
      const f = st.flakes[i];
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

  // Lightning
  if (kind === "storm" && animate) {
    st.boltCountdown--;
    if (st.boltCountdown <= 0) {
      st.bolt = 8;
      st.boltCountdown = rand(160, 380);
    }
    if (st.bolt > 0) {
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
  }
}

export default function WeatherScene({ scene }) {
  const canvasRef = useRef(null);
  const sceneRef = useRef(scene);
  useEffect(() => {
    sceneRef.current = scene;
  }, [scene]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let state = null;
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
      state = makeState(w, h);
      if (reduceMotion) drawFrame(ctx, state, w, h, sceneRef.current, 0, false);
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = () => {
      tick++;
      drawFrame(ctx, state, w, h, sceneRef.current, tick, true);
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
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    drawFrame(
      ctx,
      makeState(window.innerWidth, window.innerHeight),
      window.innerWidth,
      window.innerHeight,
      scene,
      0,
      false,
    );
  }, [scene]);

  return <canvas ref={canvasRef} className="wx-canvas" aria-hidden="true" />;
}
