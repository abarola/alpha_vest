document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".main-header");
  const menuBtn = header?.querySelector(".menu-toggle");
  const nav = document.getElementById("primary-nav");
  if (!header || !menuBtn || !nav) return;

  const mobile = window.matchMedia("(max-width: 768px)");
  const toggles = Array.from(nav.querySelectorAll(".dropdown-toggle"));
  const closeDropdowns = () => {
    toggles.forEach((button) => {
      button.setAttribute("aria-expanded", "false");
      button.closest(".has-dropdown").classList.remove("open");
    });
  };
  const closeMenu = () => {
    nav.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.textContent = "☰";
    closeDropdowns();
  };

  menuBtn.addEventListener("click", () => {
    const opening = menuBtn.getAttribute("aria-expanded") !== "true";
    closeMenu();
    if (opening) {
      nav.classList.add("open");
      menuBtn.setAttribute("aria-expanded", "true");
      menuBtn.textContent = "✕";
    }
  });

  toggles.forEach((button) => {
    button.addEventListener("click", () => {
      const opening = button.getAttribute("aria-expanded") !== "true";
      closeDropdowns();
      if (opening) {
        button.setAttribute("aria-expanded", "true");
        button.closest(".has-dropdown").classList.add("open");
      }
    });
    button.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown") return;
      event.preventDefault();
      closeDropdowns();
      button.setAttribute("aria-expanded", "true");
      button.closest(".has-dropdown").classList.add("open");
      button.nextElementSibling.querySelector("a")?.focus();
    });
  });

  nav.addEventListener("click", (event) => {
    if (!event.target.closest("a")) return;
    closeMenu();
    if (mobile.matches) menuBtn.focus();
  });
  document.addEventListener("click", (event) => {
    if (!header.contains(event.target)) closeMenu();
  });
  header.addEventListener("focusout", (event) => {
    if (!header.contains(event.relatedTarget)) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const openDropdown = toggles.find((button) => button.getAttribute("aria-expanded") === "true");
    if (openDropdown) {
      closeDropdowns();
      openDropdown.focus();
    } else if (nav.classList.contains("open")) {
      closeMenu();
      menuBtn.focus();
    }
  });
  mobile.addEventListener("change", closeMenu);

  const siteIndex = new URL(header.querySelector(".brand a").href);
  const currentPath = location.pathname.endsWith("/")
    ? `${location.pathname}index.html`
    : location.pathname;
  const updateCurrent = () => {
    nav.querySelectorAll("a").forEach((link) => {
      const target = new URL(link.href);
      const isIndex = currentPath === siteIndex.pathname;
      const active = target.pathname === currentPath &&
        (!isIndex || target.hash === (location.hash || "#current-portfolio"));
      if (active) link.setAttribute("aria-current", isIndex ? "location" : "page");
      else link.removeAttribute("aria-current");
    });
    toggles.forEach((button) => {
      button.classList.toggle("is-current", Boolean(button.nextElementSibling.querySelector("[aria-current]")));
    });
  };
  updateCurrent();
  window.addEventListener("hashchange", updateCurrent);

  // A viewport-relative inset keeps anchored sections clear of the compact header.
  const updateHeaderHeight = () => {
    document.documentElement.style.setProperty("--header-height", `${header.offsetHeight}px`);
  };
  updateHeaderHeight();
  if (typeof ResizeObserver === "function") new ResizeObserver(updateHeaderHeight).observe(header);
});
