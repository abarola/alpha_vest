document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.querySelector(".menu-toggle");
  const nav = document.getElementById("primary-nav");
  const dropdownToggles = document.querySelectorAll(".dropdown-toggle");

  if (menuBtn && nav) {
    menuBtn.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", String(open));
    });
  }

  dropdownToggles.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const li = e.currentTarget.closest(".has-dropdown");
      const isOpen = li.classList.toggle("open");
      e.currentTarget.setAttribute("aria-expanded", String(isOpen));
    });
  });

  document.addEventListener("click", (e) => {
    const navRoot = e.target.closest(".navbar");
    if (!navRoot) {
      nav?.classList.remove("open");
      menuBtn?.setAttribute("aria-expanded", "false");
      document.querySelectorAll(".has-dropdown.open").forEach((li) => {
        li.classList.remove("open");
        li.querySelector(".dropdown-toggle")?.setAttribute(
          "aria-expanded",
          "false"
        );
      });
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      nav?.classList.remove("open");
      menuBtn?.setAttribute("aria-expanded", "false");
      document.querySelectorAll(".has-dropdown.open").forEach((li) => {
        li.classList.remove("open");
        li.querySelector(".dropdown-toggle")?.setAttribute(
          "aria-expanded",
          "false"
        );
      });
    }
  });
});
