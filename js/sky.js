// ── Pixel sky: faint nebula + detailed animated pixel stars ─────────────────
// Drives every <canvas class="sky"> (title screen + credits). Each is drawn at
// low resolution (1 canvas px = PX css px) and scaled up with
// `image-rendering: pixelated`, so every star lands on one chunky pixel grid.
// Mood: minimalist dark mode. The sky is mostly black; the stars do the work.
(function () {
  const PX = 3;            // size of one "art pixel" in CSS px
  const FPS = 12;          // stepped, retro animation rate
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Near-black base with a whisper of island colour in the clouds
  const SPACE = [4, 6, 10];
  const BLUE = [[7, 12, 20], [10, 19, 31], [14, 28, 44]];   // river tones, very dim
  const GREEN = [[7, 13, 12], [10, 21, 18], [15, 32, 24]];  // forest tones, very dim

  // Star tints: white, cool blue, mint, sun gold, and a rare rose (like the ref)
  const TINTS = {
    white: { core: "#ffffff", arm: "#e9f2ff", ring: "#8fb4d9" },
    blue:  { core: "#ffffff", arm: "#a9d6ff", ring: "#5b8fc4" },
    mint:  { core: "#ffffff", arm: "#bff2d2", ring: "#5fae8a" },
    gold:  { core: "#fffbe6", arm: "#ffe08a", ring: "#c9923a" },
    rose:  { core: "#ffe9f3", arm: "#f2a7c8", ring: "#9c5a86" },
  };
  const TINT_BAG = ["white", "white", "white", "blue", "blue", "mint", "gold", "rose"];

  // ── Seeded RNG + value noise ───────────────────────────────────────────────
  function makeRng(seed) {
    return function () {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }
  function makeNoise(rand, size) {
    const g = new Float32Array(size * size);
    for (let i = 0; i < g.length; i++) g[i] = rand();
    const smooth = (t) => t * t * (3 - 2 * t);
    const at = (a, b) => g[(((b % size) + size) % size) * size + (((a % size) + size) % size)];
    return function (x, y) {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = smooth(x - xi), yf = smooth(y - yi);
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
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);

  function buildNebula(W, H, seed) {
    const rand = makeRng(seed);
    const density = makeNoise(rand, 64);
    const tint = makeNoise(rand, 64);
    const off = document.createElement("canvas");
    off.width = W; off.height = H;
    const octx = off.getContext("2d");
    const img = octx.createImageData(W, H);
    const scale = 1 / 90;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dither = BAYER[(y & 3) * 4 + (x & 3)];
        const d = fbm(density, x * scale, y * scale);
        const t = fbm(tint, x * scale * 0.6 + 40, y * scale * 0.6 + 40);
        const level = (d - 0.47) * 5 + dither * 0.8;
        let c = SPACE;
        if (level > 0) {
          const ramp = t + dither * 0.15 > 0.5 ? GREEN : BLUE;
          c = ramp[Math.min(ramp.length - 1, Math.floor(level * 1.3))];
        }
        const i = (y * W + x) * 4;
        img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
    return off;
  }

  // ── Star field ────────────────────────────────────────────────────────────
  function buildStars(W, H, seed) {
    const rand = makeRng(seed);
    const stars = [];
    const area = W * H;
    const add = (type, count, extra) => {
      for (let i = 0; i < count; i++) {
        stars.push(Object.assign({
          type,
          x: Math.floor(rand() * W),
          y: Math.floor(rand() * H),
          tint: TINTS[TINT_BAG[Math.floor(rand() * TINT_BAG.length)]],
          phase: rand() * 100,
          speed: 0.7 + rand() * 1.2,
        }, extra ? extra(rand) : {}));
      }
    };
    add("dust", Math.round(area / 260));                       // faint 1px specks
    add("dot", Math.round(area / 900));                        // brighter flickering dots
    add("chip", Math.round(area / 9000));                      // 2×2 coloured pixels
    add("cross", Math.round(area / 3500));                     // small plus stars
    add("glint", Math.round(area / 4500), (r) => ({            // sparkle in, sparkle out
      period: 3 + r() * 5,
    }));
    add("flare", Math.max(4, Math.round(area / 26000)), (r) => ({ // big ringed stars
      ray: 7 + Math.floor(r() * 5),
    }));
    // Big stars shouldn't crowd each other: drop overlapping flares
    const flares = stars.filter((s) => s.type === "flare");
    flares.forEach((a, i) => {
      for (let j = 0; j < i; j++) {
        const b = flares[j];
        if (!b.dead && Math.abs(a.x - b.x) + Math.abs(a.y - b.y) < 40) a.dead = true;
      }
    });
    return stars.filter((s) => !s.dead);
  }

  // Midpoint circle → crisp 1px pixel ring
  function ringPoints(r) {
    const pts = [];
    let x = r, y = 0, err = 1 - r;
    while (x >= y) {
      pts.push([x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]);
      y++;
      if (err < 0) err += 2 * y + 1;
      else { x--; err += 2 * (y - x) + 1; }
    }
    return pts;
  }
  const RINGS = { 3: ringPoints(3), 4: ringPoints(4), 5: ringPoints(5) };

  // ── One sky per canvas ─────────────────────────────────────────────────────
  function Sky(canvas, seed) {
    const ctx = canvas.getContext("2d");
    const host = canvas.parentElement;
    let W = 0, H = 0, nebula = null, stars = [];
    let shooting = null, nextShootAt = 2 + Math.random() * 3;

    function px(x, y, color, alpha) {
      if (alpha <= 0) return;
      ctx.globalAlpha = alpha > 1 ? 1 : alpha;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
    // 4 arms of length `len`, alpha fading out along each arm
    function arms(x, y, len, color, a0, a1) {
      for (let a = 1; a <= len; a++) {
        const al = a0 + (a1 - a0) * ((a - 1) / Math.max(1, len - 1));
        px(x - a, y, color, al); px(x + a, y, color, al);
        px(x, y - a, color, al); px(x, y + a, color, al);
      }
    }
    function diag(x, y, len, color, al) {
      for (let a = 1; a <= len; a++) {
        px(x - a, y - a, color, al); px(x + a, y - a, color, al);
        px(x - a, y + a, color, al); px(x + a, y + a, color, al);
      }
    }
    const step = (v, n) => Math.round(v * (n - 1)) / (n - 1);
    const wave = (s, t, k) => 0.5 + 0.5 * Math.sin(t * s.speed * (k || 1) + s.phase);

    function drawStar(s, t) {
      const { x, y, tint } = s;
      switch (s.type) {
        case "dust":
          px(x, y, tint.arm, 0.12 + step(wave(s, t, 0.5), 3) * 0.18);
          break;

        case "dot":
          px(x, y, tint.core, 0.35 + step(wave(s, t), 4) * 0.65);
          break;

        case "chip": { // tiny 2×2 coloured pixel, like the green specks in the ref
          const al = 0.35 + step(wave(s, t, 0.7), 3) * 0.4;
          px(x, y, tint.arm, al); px(x + 1, y, tint.ring, al);
          px(x, y + 1, tint.ring, al); px(x + 1, y + 1, tint.arm, al * 0.7);
          break;
        }

        case "cross": {
          const l = step(wave(s, t), 3);
          px(x, y, tint.core, 1);
          arms(x, y, l > 0.6 ? 2 : 1, tint.arm, 0.75, 0.3);
          if (l > 0.9) diag(x, y, 1, tint.ring, 0.35);
          break;
        }

        case "glint": {
          // Rest as a dim dot, then a quick 7-frame sparkle burst
          const cycle = ((t + s.phase) % s.period) * FPS; // frames into cycle
          const f = Math.floor(cycle);
          const BURST = [1, 2, 3, 4, 3, 2, 1];
          if (f >= BURST.length) { px(x, y, tint.arm, 0.4); break; }
          const len = BURST[f];
          px(x, y, tint.core, 1);
          arms(x, y, len, tint.arm, 0.95, 0.25);
          if (len >= 3) diag(x, y, 1, tint.arm, 0.55);
          if (len === 4) { diag(x, y, 2, tint.ring, 0.25); }
          break;
        }

        case "flare": {
          // Large star: bright core, long fading rays, pulsing pixel halo ring
          const l = step(wave(s, t, 0.5), 4);           // 0, 1/3, 2/3, 1
          const ray = s.ray - 2 + Math.round(l * 2);
          // soft glow plate behind the core
          for (let dy = -2; dy <= 2; dy++)
            for (let dx = -2; dx <= 2; dx++)
              if (Math.abs(dx) + Math.abs(dy) <= 3) px(x + dx, y + dy, tint.ring, 0.18);
          // halo ring
          const ring = RINGS[l > 0.5 ? 5 : 4];
          ring.forEach(([dx, dy]) => px(x + dx, y + dy, tint.ring, 0.3 + l * 0.35));
          // long rays (thin, fading) with a tick where they cross the ring
          arms(x, y, ray, tint.arm, 0.95, 0.08);
          px(x - 6, y, tint.core, 0.5); px(x + 6, y, tint.core, 0.5);
          px(x, y - 6, tint.core, 0.5); px(x, y + 6, tint.core, 0.5);
          // short diagonal sparkle
          diag(x, y, 2, tint.arm, 0.25 + l * 0.2);
          // core: 3×3 plus with a white heart
          px(x - 1, y - 1, tint.arm, 0.6); px(x + 1, y - 1, tint.arm, 0.6);
          px(x - 1, y + 1, tint.arm, 0.6); px(x + 1, y + 1, tint.arm, 0.6);
          arms(x, y, 1, tint.core, 1, 1);
          px(x, y, "#ffffff", 1);
          break;
        }
      }
    }

    function updateShooting(t) {
      if (reduceMotion) return;
      if (!shooting && t > nextShootAt) {
        const fromLeft = Math.random() < 0.5;
        shooting = {
          x: fromLeft ? Math.random() * W * 0.6 : W * 0.4 + Math.random() * W * 0.6,
          y: Math.random() * H * 0.5,
          dx: fromLeft ? 1 : -1,
          dy: 1,             // 45° streak, like the ref
          life: 0,
          len: 10 + Math.floor(Math.random() * 8),
        };
      }
      if (!shooting) return;
      const s = shooting;
      for (let i = 0; i < s.len; i++) {
        const fade = 1 - i / s.len;
        px(Math.round(s.x - s.dx * i), Math.round(s.y - s.dy * i),
           i < 2 ? "#ffffff" : "#bfe3ff", fade * (s.life < 3 ? s.life / 3 : 1));
      }
      s.x += s.dx * 5; s.y += s.dy * 5; s.life++;
      if (s.life > 18 || s.x < -30 || s.x > W + 30 || s.y > H + 30) {
        shooting = null;
        nextShootAt = t + 5 + Math.random() * 7;
      }
    }

    function render(t) {
      if (!nebula) return;
      ctx.globalAlpha = 1;
      ctx.drawImage(nebula, 0, 0);
      const tt = reduceMotion ? 0 : t;
      for (let i = 0; i < stars.length; i++) drawStar(stars[i], tt);
      updateShooting(t);
      ctx.globalAlpha = 1;
    }

    function resize() {
      const r = host.getBoundingClientRect();
      if (!r.width || !r.height) return; // screen hidden; size later
      const nW = Math.ceil(r.width / PX), nH = Math.ceil(r.height / PX);
      if (nW === W && nH === H && nebula) return;
      W = nW; H = nH;
      canvas.width = W; canvas.height = H;
      nebula = buildNebula(W, H, seed);
      stars = buildStars(W, H, seed + 1);
      render(performance.now() / 1000);
    }

    let timer;
    new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(resize, 60);
    }).observe(host);
    resize();

    return { visible: () => !host.classList.contains("hidden"), render };
  }

  const skies = Array.from(document.querySelectorAll("canvas.sky")).map((c, i) => Sky(c, 20261103 + i * 101));

  let last = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (reduceMotion) return;
    if (now - last < 1000 / FPS) return;
    last = now;
    skies.forEach((s) => s.visible() && s.render(now / 1000));
  }
  requestAnimationFrame(loop);
})();
