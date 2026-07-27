(function () {
  "use strict";

  function initMobileNav() {
    const toggle = document.getElementById("menu-toggle");
    const menu = document.getElementById("nav-menu");
    const scrim = document.getElementById("nav-scrim");

    if (!toggle || !menu) return;

    function openMenu() {
      menu.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close menu");
      document.body.classList.add("nav-open");
      if (scrim) scrim.hidden = false;
    }

    function closeMenu() {
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
      document.body.classList.remove("nav-open");
      if (scrim) scrim.hidden = true;
    }

    toggle.addEventListener("click", function () {
      if (menu.classList.contains("is-open")) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Close the menu after a link is chosen, on scrim tap, and on Escape.
    menu.addEventListener("click", function (event) {
      if (event.target.tagName === "A") closeMenu();
    });

    if (scrim) {
      scrim.addEventListener("click", closeMenu);
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && menu.classList.contains("is-open")) {
        closeMenu();
        toggle.focus();
      }
    });
  }


  function initScrollSpy() {
    const navLinks = Array.prototype.slice.call(document.querySelectorAll("[data-nav-link]"));
    const sections = navLinks
      .map(function (link) {
        const id = link.getAttribute("href").replace("#", "");
        return document.getElementById(id);
      })
      .filter(Boolean);

    if (!navLinks.length || !sections.length || !("IntersectionObserver" in window)) return;

    const linksById = {};
    navLinks.forEach(function (link) {
      linksById[link.getAttribute("href").replace("#", "")] = link;
    });

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          const link = linksById[entry.target.id];
          if (!link) return;
          if (entry.isIntersecting) {
            navLinks.forEach(function (l) {
              l.classList.remove("is-active");
            });
            link.classList.add("is-active");
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }


  function initScrollReveal() {
    const targets = Array.prototype.slice.call(document.querySelectorAll("[data-animate]"));
    if (!targets.length) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      targets.forEach(function (el) {
        el.classList.add("in-view");
      });
      return;
    }

    const STAGGER_STEP_MS = 70;
    const MAX_STAGGER_MS = 280;

    const groups = new Map();
    targets.forEach(function (el) {
      const parent = el.parentElement;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push(el);
    });
    groups.forEach(function (siblings) {
      siblings.forEach(function (el, index) {
        const delay = Math.min(index * STAGGER_STEP_MS, MAX_STAGGER_MS);
        el.style.setProperty("--reveal-delay", delay + "ms");
      });
    });

    const observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    targets.forEach(function (el) {
      observer.observe(el);
    });
  }

  const FORM_ENDPOINT = "https://formspree.io/f/REPLACE_WITH_YOUR_FORM_ID";

  const SUCCESS_MESSAGE_DURATION_MS = 3000;

  function initContactForm() {
    const form = document.getElementById("contact-form");
    const submitBtn = document.getElementById("submit-btn");
    const submitLabel = submitBtn ? submitBtn.querySelector(".btn-submit-label") : null;
    const status = document.getElementById("form-status");

    if (!form || !submitBtn || !submitLabel || !status) return;

    let resetTimerId = null;

    function setLoadingState() {
      submitBtn.disabled = true;
      submitBtn.classList.remove("is-success", "is-error");
      submitLabel.textContent = "Sending…";
      status.textContent = "";
      status.classList.remove("is-error", "is-success");
    }

    function setSuccessState() {
      submitBtn.classList.remove("is-error");
      submitBtn.classList.add("is-success");
      submitLabel.textContent = "Sent";
      status.textContent = "Thanks — your message is on its way. I'll reply soon.";
      status.classList.remove("is-error");
      status.classList.add("is-success");
      form.reset();
    }

    function setErrorState(message) {
      submitBtn.classList.remove("is-success");
      submitBtn.classList.add("is-error");
      submitBtn.disabled = false;
      submitLabel.textContent = "Send message";
      status.textContent = message || "Something went wrong. Please try again or email me directly.";
      status.classList.remove("is-success");
      status.classList.add("is-error");
    }

    function resetToIdle() {
      submitBtn.classList.remove("is-success", "is-error");
      submitBtn.disabled = false;
      submitLabel.textContent = "Send message";
    }

    async function submitForm(formData) {
      const response = await fetch(FORM_ENDPOINT, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" }
      });

      if (!response.ok) {
        throw new Error("Form endpoint responded with status " + response.status);
      }
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (resetTimerId) {
        clearTimeout(resetTimerId);
        resetTimerId = null;
      }

      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const message = form.message.value.trim();

      if (!name || !email || !message) {
        setErrorState("Please fill in every field before sending.");
        return;
      }

      setLoadingState();

      submitForm(new FormData(form))
        .then(function () {
          setSuccessState();
          resetTimerId = setTimeout(resetToIdle, SUCCESS_MESSAGE_DURATION_MS);
        })
        .catch(function () {
          setErrorState();
        });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initMobileNav();
    initContactForm();
    initScrollSpy();
    initScrollReveal();
  });
})();