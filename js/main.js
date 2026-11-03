// ── Helpers ──────────────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

// ── Credits ───────────────────────────────────────────────────────────────────
function openCredits() {
  // Reset the crawl animation so it plays from scratch every time
  const wrap = document.querySelector(".crawl-wrap");
  wrap.style.animation = "none";
  void wrap.offsetWidth; // reflow
  wrap.style.animation = "";
  showScreen("credits");
}

// Title-screen button and end-screen button both open the crawl
document.getElementById("btnCredits").addEventListener("click", openCredits);
document.getElementById("endingCredits").addEventListener("click", openCredits);

// Back button on credits screen → title
document.getElementById("creditsBack").addEventListener("click", () =>
  showScreen("menu")
);

// ── Sun / Island hover zone ──────────────────────────────────────────────────
const area     = document.getElementById("islandArea");
const sun      = document.getElementById("sun");
const glow     = document.getElementById("glow");
const promptEl = document.getElementById("prompt");

function sunUp(up) {
  sun.style.transform    = up ? "translateY(-10px)" : "translateY(45px)";
  glow.style.opacity     = up ? 1 : 0;
  promptEl.style.opacity = up ? 1 : 0;
}

area.addEventListener("mousemove", (e) => {
  const rect = area.getBoundingClientRect();
  sunUp(e.clientY - rect.top < rect.height * 0.25);
});
area.addEventListener("mouseleave", () => sunUp(false));

sun.addEventListener("click", () => {
  sunUp(true);
  setTimeout(goToLoading, 600);
});

// ── Flow: sun → loading → intro → game ──────────────────────────────────────
function goToLoading() {
  showScreen("loading");
  setTimeout(() => {
    showScreen("intro");
    // Reset loader animation for future visits
    const bar = document.querySelector(".loader");
    bar.style.animation = "none";
    void bar.offsetWidth;
    bar.style.animation = "";
    armIntro();
  }, 2400);
}

// Intro waits for any key or click, then starts the game
function armIntro() {
  const intro = document.getElementById("intro");
  const begin = () => {
    window.removeEventListener("keydown", begin);
    intro.removeEventListener("click", begin);
    startGame();
  };
  // Small delay so a held key from the sun click doesn't skip the intro
  setTimeout(() => {
    window.addEventListener("keydown", begin);
    intro.addEventListener("click", begin);
  }, 400);
}

function startGame() {
  showScreen("game");
  if (window.Game && typeof window.Game.start === "function") {
    window.Game.start();
  }
}

// Called by the game when an ending cutscene finishes
function showEnding(message) {
  document.getElementById("endingMessage").textContent = message;
  showScreen("ending");
}
window.showEnding = showEnding;

// ── Prevent scroll on arrow / space keys ────────────────────────────────────
window.addEventListener("keydown", (e) => {
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
    e.preventDefault();
  }
});
