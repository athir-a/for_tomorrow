// ── Title-screen sky: pixel nebula + animated pixel stars ───────────────────
// Everything is drawn on a low-resolution canvas (1 canvas px = PX css px)
// and scaled up with `image-rendering: pixelated`, so every star and cloud
// edge lands on the same chunky pixel grid.
(function () {
  const canvas = document.getElementById("sky");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const menu = document.getElementById("menu");

  const PX = 4;            // size of one "art pixel" in CSS px
  const FPS = 12;          // stepped, retro animation rate
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Earth palette: deep space → ocean → teal → forest
  const SPACE = [5, 9, 20];
  const NEBULA = [
    [10, 24, 48],   // deep ocean
    [16, 46, 82],   // ocean blue
    [20, 78, 92],   // teal
    [28, 96, 72],   // sea green
    [52, 128, 74],  // forest (rare highlights)
  ];
  const STAR_COLORS = ["#ffffff", "#d8f3ff", "#c9ffd9", "#9fe3ff", "#fff1b8"];

  // ── Seeded RNG + value noise ───────────────────────────────────────────────
  let seed = 20261103;
  function rand() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  function makeNoise(size) {
    const g = new Float32Array(size * size);
    for (let i = 0; i < g.length; i++) g[i] = rand();
    const smooth = (t) => t * t * (3 - 2 * t);
    return function (x, y) {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = smooth(x - xi), yf = smooth(y - yi);
      const at = (a, b) => g[((b % size + size) % size) * size + ((a % size + size) % size)];
      const top = at(xi, yi) * (1 - xf) + at(xi + 1, yi) * xf;
      const bot = at(xi, yi + 1) * (1 - xf) + at(xi + 1, yi + 1) * xf;
      return top * (1 - yf) + bot * yf;
    };
  }
  function fbm(noise, x, y) {
    let v = 0, amp = 0.5, f = 1;
    for (let o = 0; o < 5; o++) {
      v += amp * noise(x * f, y * f);
      f *= 2; amp *= 0.5;
    }
    return v;
  }

  // 4×4 Bayer matrix for ordered dithering (classic pixel-art shading)
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);

  let W = 0, H = 0;
  let nebula = null;   // offscreen canvas with the static nebula
  let stars = [];
  let shooting = null;
  let nextShootAt = 0;

  // ── Build the nebula once per resize ───────────────────────────────────────
  function buildNebula() {
    seed = 20261103;
    const density = makeNoise(64);
    const tint = makeNoise(64);
    const off = document.createElement("canvas");
    off.width = W; off.height = H;
    const octx = off.getContext("2d");
    const img = octx.createImageData(W, H);
    const scale = 1 / 70; // cloud size in art pixels

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const d = fbm(density, x * scale, y * scale);
        const t = fbm(tint, x * scale * 0.6 + 40, y * scale * 0.6 + 40);
        // Shape the clouds: only the denser parts glow
        let level = (d - 0.42) * 5 + BAYER[(y & 3) * 4 + (x & 3)] * 0.9;
        let c = SPACE;
        if (level > 0) {
          // tint picks blue-ish vs green-ish bands
          const band = Math.min(NEBULA.length - 1, Math.floor(level + (t > 0.55 ? 1.5 : 0)));
          c = NEBULA[Math.max(0, band)];
        }
        const i = (y * W + x) * 4;
        img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
    nebula = off;
  }

  // ── Stars ─────────────────────────────────────────────────────────────────
  function buildStars() {
    seed = 777;
    stars = [];
    const area = W * H;
    const add = (type, count) => {
      for (let i = 0; i < count; i++) {
        stars.push({
          type,
          x: Math.floor(rand() * W),
          y: Math.floor(rand() * H),
          color: STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)],
          phase: rand() * Math.PI * 2,
          speed: 0.6 + rand() * 1.8,
        });
      }
    };
    add("dot", Math.round(area / 700));
    add("cross", Math.round(area / 2500));
    add("sparkle", Math.round(area / 5000));
    add("big", Math.max(3, Math.round(area / 16000)));
  }

  function px(x, y, color, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
  }

  // Quantise twinkle into a few hard steps instead of a smooth fade
  function stepLevel(s, t, steps) {
    const v = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
    return Math.round(v * (steps - 1)) / (steps - 1);
  }

  function drawStar(s, t) {
    const { x, y, color } = s;
    switch (s.type) {
      case "dot": {
        const l = stepLevel(s, t, 3);
        px(x, y, color, 0.35 + l * 0.65);
        break;
      }
      case "cross": {
        const l = stepLevel(s, t, 3);
        px(x, y, color, 1);
        if (l > 0.4) {
          px(x - 1, y, color, 0.6); px(x + 1, y, color, 0.6);
          px(x, y - 1, color, 0.6); px(x, y + 1, color, 0.6);
        }
        break;
      }
      case "sparkle": {
        const arm = 1 + Math.round(stepLevel(s, t, 3) * 2); // 1..3
        px(x, y, "#ffffff", 1);
        for (let a = 1; a <= arm; a++) {
          const al = a === arm ? 0.35 : 0.75;
          px(x - a, y, color, al); px(x + a, y, color, al);
          px(x, y - a, color, al); px(x, y + a, color, al);
        }
        break;
      }
      case "big": {
        const l = stepLevel(s, t * 0.6, 4);
        const arm = 4 + Math.round(l * 3); // 4..7
        // bright core
        px(x, y, "#ffffff", 1);
        px(x - 1, y, "#ffffff", 0.9); px(x + 1, y, "#ffffff", 0.9);
        px(x, y - 1, "#ffffff", 0.9); px(x, y + 1, "#ffffff", 0.9);
        // long thin rays
        for (let a = 2; a <= arm; a++) {
          const al = 0.7 * (1 - (a - 2) / (arm - 1));
          px(x - a, y, color, al); px(x + a, y, color, al);
          px(x, y - a, color, al); px(x, y + a, color, al);
        }
        // pixel halo ring, pulses in and out
        if (l > 0.3) {
          const ring = [[-2, -2], [2, -2], [-2, 2], [2, 2], [-3, -1], [3, -1], [-3, 1], [3, 1], [-1, -3], [1, -3], [-1, 3], [1, 3]];
          ring.forEach(([dx, dy]) => px(x + dx, y + dy, "#7fd4e6", 0.35 + l * 0.3));
        }
        break;
      }
    }
  }

  function updateShooting(t) {
    if (reduceMotion) return;
    if (!shooting && t > nextShootAt) {
      const fromLeft = Math.random() < 0.5;
      shooting = {
        x: fromLeft ? Math.random() * W * 0.5 : W * 0.5 + Math.random() * W * 0.5,
        y: Math.random() * H * 0.4,
        dx: fromLeft ? 1 : -1,
        dy: 0.5,
        life: 0,
        len: 8 + Math.floor(Math.random() * 6),
      };
    }
    if (shooting) {
      const s = shooting;
      for (let i = 0; i < s.len; i++) {
        const tx = Math.round(s.x - s.dx * i * 1.5);
        const ty = Math.round(s.y - s.dy * i * 1.5);
        px(tx, ty, i === 0 ? "#ffffff" : "#bff5ff", 1 - i / s.len);
      }
      s.x += s.dx * 4; s.y += s.dy * 4; s.life++;
      if (s.life > 22 || s.x < -20 || s.x > W + 20 || s.y > H) {
        shooting = null;
        nextShootAt = t + 4 + Math.random() * 6;
      }
    }
  }

  // ── Loop ──────────────────────────────────────────────────────────────────
  function resize() {
    const r = menu.getBoundingClientRect();
    const w = r.width || window.innerWidth;
    const h = r.height || window.innerHeight;
    const nW = Math.ceil(w / PX), nH = Math.ceil(h / PX);
    if (nW === W && nH === H && nebula) return;
    W = nW; H = nH;
    canvas.width = W;
    canvas.height = H;
    buildNebula();
    buildStars();
    render(performance.now() / 1000);
  }

  function render(t) {
    ctx.globalAlpha = 1;
    ctx.drawImage(nebula, 0, 0);
    stars.forEach((s) => drawStar(s, reduceMotion ? 0 : t));
    updateShooting(t);
    ctx.globalAlpha = 1;
  }

  let last = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (reduceMotion) return;
    if (menu.classList.contains("hidden")) return; // don't burn CPU off-screen
    if (now - last < 1000 / FPS) return;
    last = now;
    render(now / 1000);
  }

  // Resize whenever the title screen's box changes (window resize, screen shown)
  let resizeTimer;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  }).observe(menu);

  resize();
  nextShootAt = 2;
  requestAnimationFrame(loop);
})();
