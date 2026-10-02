// Drawer (hamburger) behavior
const hamburger = document.getElementById("hamburger");
const drawer = document.getElementById("drawer");
hamburger.addEventListener("click", () => drawer.classList.toggle("open"));
document.getElementById("menu-back-btn").addEventListener("click", function () {
  document.getElementById("hamburger-menu").classList.remove("open");
});

// Sun hover zone at top of island
const area = document.getElementById("islandArea");
const sun = document.getElementById("sun");
const glow = document.getElementById("glow");
const promptEl = document.getElementById("prompt");

function showPromptText() {
  promptEl.style.opacity = 1;
  glow.style.opacity = 1;
  sun.style.transform = "translateY(-10px)";
  setTimeout(goToLoading, 600);
}

area.addEventListener("mousemove", (e) => {
  const rect = area.getBoundingClientRect();
  const mouseY = e.clientY - rect.top;
  const threshold = rect.height * 0.25; // top quarter activates
  if (mouseY < threshold) {
    sun.style.transform = "translateY(-10px)";
    glow.style.opacity = 1;
    promptEl.style.opacity = 1;
  } else {
    sun.style.transform = "translateY(45px)";
    glow.style.opacity = 0;
    promptEl.style.opacity = 0;
  }
});
area.addEventListener("mouseleave", () => {
  sun.style.transform = "translateY(45px)";
  glow.style.opacity = 0;
  promptEl.style.opacity = 0;
});

// Clicking the sun or "Start" -> loading -> minigame
function goToLoading() {
  document.getElementById("menu").classList.add("hidden");
  document.getElementById("loading").classList.remove("hidden");
  // after animation ends, proceed to game
  setTimeout(() => {
    document.getElementById("loading").classList.add("hidden");
    document.getElementById("minigame").classList.remove("hidden");
    // reset loader animation for future visits
    const bar = document.querySelector(".loader");
    bar.style.animation = "none";
    void bar.offsetWidth; // reflow
    bar.style.animation = "";
  }, 2400);
}
sun.addEventListener("click", showPromptText);
document.getElementById("btnStart").addEventListener("click", goToLoading);

// Prevent scroll on space/arrow keys while focused on body
window.addEventListener("keydown", (e) => {
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
    e.preventDefault();
  }
});