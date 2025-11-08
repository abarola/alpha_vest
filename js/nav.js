document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.querySelector(".menu-toggle");
  const nav = document.getElementById("primary-nav");
  const dropdownToggles = document.querySelectorAll(".dropdown-toggle");

  // Helper to check if we're on mobile
  const isMobile = () => window.innerWidth <= 768;

  // Helper to close all dropdowns
  const closeAllDropdowns = () => {
    document.querySelectorAll(".has-dropdown.open").forEach((li) => {
      li.classList.remove("open");
      li.querySelector(".dropdown-toggle")?.setAttribute(
        "aria-expanded",
        "false"
      );
    });
  };

  // Helper to close the mobile menu
  const closeMobileMenu = () => {
    if (!nav || !menuBtn) return;
    nav.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.innerHTML = "☰";
    menuBtn.classList.remove("active");
    closeAllDropdowns();
  };

  // Helper to open the mobile menu
  const openMobileMenu = () => {
    if (!nav || !menuBtn) return;
    nav.classList.add("open");
    menuBtn.setAttribute("aria-expanded", "true");
    menuBtn.innerHTML = "✕";
    menuBtn.classList.add("active");
  };

  // Toggle mobile menu
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", () => {
      const isOpen = nav.classList.contains("open");
      if (isOpen) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });
  }

  // Handle dropdown toggles
  dropdownToggles.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const li = e.currentTarget.closest(".has-dropdown");
      const wasOpen = li.classList.contains("open");

      // Close all other dropdowns first
      document.querySelectorAll(".has-dropdown").forEach((otherLi) => {
        if (otherLi !== li) {
          otherLi.classList.remove("open");
          otherLi
            .querySelector(".dropdown-toggle")
            ?.setAttribute("aria-expanded", "false");
        }
      });

      // Toggle current dropdown
      if (wasOpen) {
        li.classList.remove("open");
        e.currentTarget.setAttribute("aria-expanded", "false");
      } else {
        li.classList.add("open");
        e.currentTarget.setAttribute("aria-expanded", "true");
      }
    });
  });

  // Auto-close menu when clicking dropdown links on mobile
  document.querySelectorAll(".dropdown a").forEach((link) => {
    link.addEventListener("click", () => {
      if (isMobile()) {
        // Small delay to let the link action complete
        setTimeout(() => {
          closeMobileMenu();
        }, 150);
      }
    });
  });

  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    const navRoot = e.target.closest(".navbar");
    if (!navRoot && nav?.classList.contains("open")) {
      closeMobileMenu();
    }
  });

  // Close menu on escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav?.classList.contains("open")) {
      closeMobileMenu();
      menuBtn?.focus();
    }
  });

  // Reset menu state when resizing to desktop
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!isMobile() && nav?.classList.contains("open")) {
        closeMobileMenu();
      }
    }, 150);
  });
});
