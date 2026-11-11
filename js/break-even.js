(() => {
  const section = document.getElementById("break-even");
  if (!section) return;

  const slider = section.querySelector("#break-even-loss");
  const interactive = section.querySelector(".break-even-interactive");
  const lossValue = section.querySelector("[data-loss-value]");
  const gainValue = section.querySelector("[data-gain-value]");
  const plot = section.querySelector(".break-even-plot");
  const grid = plot.querySelector("[data-grid]");
  const area = plot.querySelector("[data-area]");
  const curve = plot.querySelector("[data-curve]");
  const selection = plot.querySelector("[data-selection]");
  const guides = plot.querySelector("[data-guides]");
  const dot = plot.querySelector("[data-dot]");
  const format = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });
  const gainNeeded = (loss) => 100 * loss / (100 - loss);
  let chartKey = "";

  function addToGrid(tag, attributes, text) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    if (text !== undefined) node.textContent = text;
    grid.append(node);
  }

  function draw() {
    const loss = slider.valueAsNumber;
    const width = plot.clientWidth;
    const height = plot.clientHeight;
    if (!width || !height) return;

    // Focus on typical losses by default, with more room for extreme cases.
    const xMax = loss <= 80 ? 80 : 100;
    const yMax = loss <= 80 ? 400 : loss <= 90 ? 1000 : loss <= 95 ? 2000 : 10000;
    const left = yMax === 10000 ? 50 : 40;
    const right = width - 15;
    const top = 12;
    const bottom = height - 24;
    const x = (value) => left + (right - left) * value / xMax;
    const y = (value) => bottom - (bottom - top) * value / yMax;
    const key = [width, height, xMax, yMax].join("/");

    if (key !== chartKey) {
      chartKey = key;
      plot.setAttribute("viewBox", `0 0 ${width} ${height}`);
      grid.replaceChildren();
      for (let i = 0; i <= 4; i++) {
        const tick = i * yMax / 4;
        addToGrid("line", { x1: left, y1: y(tick), x2: right, y2: y(tick) });
        addToGrid("text", { x: left - 8, y: y(tick) + 4, "text-anchor": "end" }, format.format(tick));
      }
      addToGrid("line", { x1: left, y1: top, x2: left, y2: bottom });
      for (let tick = 0; tick <= xMax; tick += 20) {
        const position = x(tick);
        addToGrid("line", { x1: position, y1: bottom, x2: position, y2: bottom + 4 });
        addToGrid("text", { x: position, y: bottom + 18, "text-anchor": "middle" }, tick);
      }

      // Stop where the curve meets the top axis, before its vertical asymptote.
      const end = 100 * yMax / (100 + yMax);
      const points = Array.from({ length: 241 }, (_, i) => {
        const value = end * i / 240;
        return `${x(value).toFixed(2)} ${y(gainNeeded(value)).toFixed(2)}`;
      });
      const path = "M" + points.join(" L");
      curve.setAttribute("d", path);
      area.setAttribute("d", `${path} L${x(end)} ${bottom} Z`);
    }

    selection.style.display = loss === 100 ? "none" : "";
    if (loss === 100) return;

    const pointX = x(loss);
    const pointY = y(gainNeeded(loss));
    guides.setAttribute("d", `M${left} ${pointY} H${pointX} V${bottom}`);
    dot.setAttribute("cx", pointX);
    dot.setAttribute("cy", pointY);
  }

  function update() {
    const loss = slider.valueAsNumber;
    lossValue.textContent = `${loss}%`;
    slider.setAttribute("aria-valuetext", `${loss}% loss`);
    gainValue.textContent = loss === 100
      ? "No finite gain"
      : `${loss ? "+" : ""}${format.format(gainNeeded(loss))}%`;
    draw();
  }

  slider.addEventListener("input", update);
  interactive.hidden = false;
  update();
  if (typeof ResizeObserver === "function") new ResizeObserver(draw).observe(plot);
  else window.addEventListener("resize", draw);
})();
