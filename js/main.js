// ── Helpers ──────────────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

// ── Hamburger / Drawer ───────────────────────────────────────────────────────
const hamburger = document.getElementById("hamburger");
const drawer     = document.getElementById("drawer");
const backdrop   = document.getElementById("drawerBackdrop");
const menuClose  = document.getElementById("menuClose");

function openMenu() {
  drawer.classList.add("open");
  backdrop.classList.add("active");
  hamburger.setAttribute("aria-expanded", "true");
  drawer.setAttribute("aria-hidden", "false");
  menuClose.focus();
}

function closeMenu() {
  drawer.classList.remove("open");
  backdrop.classList.remove("active");
  hamburger.setAttribute("aria-expanded", "false");
  drawer.setAttribute("aria-hidden", "true");
  hamburger.focus();
}

hamburger.addEventListener("click", () =>
  drawer.classList.contains("open") ? closeMenu() : openMenu()
);
menuClose.addEventListener("click", closeMenu);
backdrop.addEventListener("click", closeMenu);

// Close on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && drawer.classList.contains("open")) closeMenu();
});

// Focus trap inside the drawer
drawer.addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  const focusable = Array.from(
    drawer.querySelectorAll("a[href], button:not([disabled])")
  );
  if (!focusable.length) return;
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault(); last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault(); first.focus();
  }
});

// ── Credits ───────────────────────────────────────────────────────────────────
function openCredits() {
  closeMenu();
  // Reset the crawl animation so it plays from scratch every time
  const wrap = document.querySelector(".crawl-wrap");
  wrap.style.animation = "none";
  void wrap.offsetWidth; // reflow
  wrap.style.animation = "";
  showScreen("credits");
}

// From hud-button
document.getElementById("btnCredits").addEventListener("click", openCredits);

// From nav drawer item (data-nav="credits")
document.querySelector('[data-nav="credits"]').addEventListener("click", (e) => {
  e.preventDefault();
  openCredits();
});

// Back button on credits screen
document.getElementById("creditsBack").addEventListener("click", () =>
  showScreen("menu")
);

// ── Sun / Island hover zone ──────────────────────────────────────────────────
const area     = document.getElementById("islandArea");
const sun      = document.getElementById("sun");
const glow     = document.getElementById("glow");
const promptEl = document.getElementById("prompt");

function showPromptText() {
  promptEl.style.opacity = 1;
  glow.style.opacity = 1;
  sun.style.transform = "translateY(-10px)";
  setTimeout(goToLoading, 600);
}

area.addEventListener("mousemove", (e) => {
  const rect      = area.getBoundingClientRect();
  const mouseY    = e.clientY - rect.top;
  const threshold = rect.height * 0.25;
  if (mouseY < threshold) {
    sun.style.transform    = "translateY(-10px)";
    glow.style.opacity     = 1;
    promptEl.style.opacity = 1;
  } else {
    sun.style.transform    = "translateY(45px)";
    glow.style.opacity     = 0;
    promptEl.style.opacity = 0;
  }
});
area.addEventListener("mouseleave", () => {
  sun.style.transform    = "translateY(45px)";
  glow.style.opacity     = 0;
  promptEl.style.opacity = 0;
});

// ── Start / Loading → Minigame ───────────────────────────────────────────────
function goToLoading() {
  showScreen("loading");
  setTimeout(() => {
    showScreen("minigame");
    // Reset loader animation for future visits
    const bar = document.querySelector(".loader");
    bar.style.animation = "none";
    void bar.offsetWidth;
    bar.style.animation = "";
  }, 2400);
}
sun.addEventListener("click", showPromptText);
document.getElementById("btnStart").addEventListener("click", goToLoading);

// ── Prevent scroll on arrow / space keys ────────────────────────────────────
window.addEventListener("keydown", (e) => {
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
    e.preventDefault();
  }
});