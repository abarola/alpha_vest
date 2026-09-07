/* A decorative identity gesture, independent of the portfolio data. */
(() => {
  const graphic = document.querySelector(".signature-graphic");
  if (!graphic || typeof Element.prototype.animate !== "function") return;

  const layer = graphic.querySelector(".signature-particles");
  if (!layer) return;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const particles = [];
  let animations = [];
  let played = false;

  // Deterministic geometry keeps the final identity stable across visits.
  for (let i = 0; i < 180; i++) {
    const u = (i % 60) / 59;
    const lane = Math.floor(i / 60) - 1;
    const x = 25 + u * 470;
    const y = 183 - 145 * Math.exp(-Math.pow((u - .5) / .225, 2)) + lane * 8;
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", x.toFixed(2));
    circle.setAttribute("cy", y.toFixed(2));
    circle.setAttribute("r", i % 17 === 0 ? "2.7" : "1.65");
    circle.setAttribute("fill", "currentColor");
    const opacity = .3 + (i % 7) * .1;
    circle.setAttribute("opacity", opacity.toFixed(1));
    layer.appendChild(circle);
    particles.push({ circle, x, y, opacity });
  }
  graphic.classList.add("is-ready");

  function settle() {
    animations.forEach((animation) => animation.cancel());
    animations = [];
  }

  function play() {
    if (played || document.hidden || reducedMotion.matches) return;
    played = true;
    animations = particles.map(({ circle, x, y, opacity }, i) => {
      const fromX = 25 + ((i * 73) % 181) / 181 * 470;
      const fromY = 20 + ((i * 47) % 179) / 179 * 175;
      return circle.animate([
        { transform: `translate(${fromX - x}px, ${fromY - y}px)`, opacity: .08 },
        { transform: "translate(0px, 0px)", opacity },
      ], {
        duration: 2200,
        delay: (i % 12) * 16,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "backwards",
      });
    });
  }

  reducedMotion.addEventListener("change", () => {
    // A preference change never restarts the entrance effect.
    played = true;
    settle();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) settle();
  });
  window.addEventListener("pagehide", settle);
  if (typeof IntersectionObserver === "function") {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) play();
      else settle();
    });
    observer.observe(graphic);
  } else {
    play();
  }
})();
