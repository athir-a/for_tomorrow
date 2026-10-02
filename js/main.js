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

// Trap focus inside the drawer while it's open
drawer.addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  const focusable = Array.from(
    drawer.querySelectorAll('a[href], button:not([disabled])')
  ).filter((el) => !el.closest('[aria-hidden="true"]'));
  if (!focusable.length) return;
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault(); last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault(); first.focus();
  }
});

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
  const threshold = rect.height * 0.25; // top quarter activates
  if (mouseY < threshold) {
    sun.style.transform = "translateY(-10px)";
    glow.style.opacity  = 1;
    promptEl.style.opacity = 1;
  } else {
    sun.style.transform = "translateY(45px)";
    glow.style.opacity  = 0;
    promptEl.style.opacity = 0;
  }
});
area.addEventListener("mouseleave", () => {
  sun.style.transform = "translateY(45px)";
  glow.style.opacity  = 0;
  promptEl.style.opacity = 0;
});

// ── Clicking the sun or "Start" → loading → minigame ────────────────────────
function goToLoading() {
  document.getElementById("menu").classList.add("hidden");
  document.getElementById("loading").classList.remove("hidden");
  setTimeout(() => {
    document.getElementById("loading").classList.add("hidden");
    document.getElementById("minigame").classList.remove("hidden");
    // Reset loader animation for future visits
    const bar = document.querySelector(".loader");
    bar.style.animation = "none";
    void bar.offsetWidth; // reflow
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