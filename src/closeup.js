// Panel 2: flat "zoomed in" boxes of 9 particles, drawn like the storyboard,
// with wiggle marks for the solid and motion arrows for the liquid and gas.

const FILL = '#3b82f6';
const HIGHLIGHT = '#93c5fd';
const INK = '#1e2a44';
const COUNT = 9;

function drawParticle(ctx, x, y, r) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, HIGHLIGHT);
  g.addColorStop(1, FILL);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function drawArrow(ctx, x1, y1, x2, y2) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 7;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(angle - 0.5), y2 - head * Math.sin(angle - 0.5));
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(angle + 0.5), y2 - head * Math.sin(angle + 0.5));
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function drawWiggle(ctx, x, y, t) {
  ctx.beginPath();
  for (let i = 0; i <= 12; i++) {
    const px = x + i * 1.5;
    const py = y + Math.sin(i * 1.3 + t * 18) * 2.5;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function makeSolid(w, h, r) {
  const gap = r * 2.05;
  const pts = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      pts.push({ hx: w / 2 + (col - 1) * gap, hy: h / 2 + (row - 1) * gap, phase: Math.random() * 6.28 });
    }
  }
  return (ctx, t) => {
    for (const p of pts) {
      const x = p.hx + Math.sin(t * 20 + p.phase) * 2;
      const y = p.hy + Math.cos(t * 23 + p.phase) * 2;
      drawParticle(ctx, x, y, r);
    }
    const edge = gap * 1.5 + r * 0.6;
    drawWiggle(ctx, w / 2 - edge - 14, h / 2 - edge, t);
    drawWiggle(ctx, w / 2 + edge, h / 2 - edge, t + 1);
    drawWiggle(ctx, w / 2 - edge - 14, h / 2 + edge, t + 2);
    drawWiggle(ctx, w / 2 + edge, h / 2 + edge, t + 3);
  };
}

// Particles drift around a shared center, touching and sliding past each other.
function makeLiquid(w, h, r) {
  const pts = Array.from({ length: COUNT }, () => ({
    x: w / 2 + (Math.random() - 0.5) * r * 4,
    y: h / 2 + (Math.random() - 0.5) * r * 4,
    vx: 0,
    vy: 0,
  }));
  return (ctx, t, dt) => {
    for (const p of pts) {
      p.vx += ((w / 2 - p.x) * 6 + (Math.random() - 0.5) * 900) * dt;
      p.vy += ((h / 2 - p.y) * 6 + (Math.random() - 0.5) * 900) * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    separate(pts, r);
    for (const p of pts) drawParticle(ctx, p.x, p.y, r);

    // Curved arrows circling the group, like in the storyboard.
    const ring = r * 4.2;
    for (const start of [-0.9, 2.2]) {
      const a = start + t * 0.8;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, ring, a, a + 0.9);
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      const ex = w / 2 + Math.cos(a + 0.9) * ring;
      const ey = h / 2 + Math.sin(a + 0.9) * ring;
      const tangent = a + 0.9 + Math.PI / 2;
      drawArrow(ctx, ex - Math.cos(tangent) * 2, ey - Math.sin(tangent) * 2, ex, ey);
    }
  };
}

function makeGas(w, h, r) {
  const speed = 70;
  const pts = Array.from({ length: COUNT }, () => {
    const a = Math.random() * Math.PI * 2;
    return {
      x: r + Math.random() * (w - 2 * r),
      y: r + Math.random() * (h - 2 * r),
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
    };
  });
  return (ctx, t, dt) => {
    for (const p of pts) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < r || p.x > w - r) {
        p.vx *= -1;
        p.x = Math.min(Math.max(p.x, r), w - r);
      }
      if (p.y < r || p.y > h - r) {
        p.vy *= -1;
        p.y = Math.min(Math.max(p.y, r), h - r);
      }
    }
    separate(pts, r, true);
    for (const p of pts) {
      drawParticle(ctx, p.x, p.y, r);
      const len = Math.hypot(p.vx, p.vy);
      const ux = p.vx / len;
      const uy = p.vy / len;
      drawArrow(ctx, p.x + ux * (r + 2), p.y + uy * (r + 2), p.x + ux * (r + 16), p.y + uy * (r + 16));
    }
  };
}

function separate(pts, r, bounce = false) {
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i];
      const b = pts[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      if (dist >= r * 2 || dist === 0) continue;
      const nx = dx / dist;
      const ny = dy / dist;
      const push = (r * 2 - dist) / 2;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;
      if (bounce) {
        const approach = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (approach < 0) {
          a.vx += approach * nx;
          a.vy += approach * ny;
          b.vx -= approach * nx;
          b.vy -= approach * ny;
        }
      }
    }
  }
}

const makers = { solid: makeSolid, liquid: makeLiquid, gas: makeGas };

export function startCloseup(canvas, kind) {
  const ctx = canvas.getContext('2d');
  let draw;
  let w;
  let h;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw = makers[kind](w, h, Math.min(w, h) * 0.075);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  let running = false;
  let last = 0;
  let t = 0;
  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    t += dt;
    ctx.clearRect(0, 0, w, h);
    draw(ctx, t, dt);
    requestAnimationFrame(frame);
  }
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    } else if (!entry.isIntersecting) {
      running = false;
    }
  }).observe(canvas);
}
