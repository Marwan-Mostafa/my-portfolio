(function () {
  "use strict";

  /* ==========================================================================
     Mobile navigation toggle
     ========================================================================== */

  function initMobileNav() {
    const toggle = document.getElementById("menu-toggle");
    const menu = document.getElementById("nav-menu");

    if (!toggle || !menu) return;

    toggle.addEventListener("click", function () {
      const isOpen = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    });

    // Close the menu after a link is chosen, and on Escape.
    menu.addEventListener("click", function (event) {
      if (event.target.tagName === "A") {
        menu.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && menu.classList.contains("is-open")) {
        menu.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
        toggle.focus();
      }
    });
  }

  /* ==========================================================================
     Contact form
     ========================================================================== */

  // TODO: point this at a real form backend (Formspree, Getform, a custom
  // API route, etc.) before deploying. Until then, submissions cannot
  // actually be delivered anywhere.
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

  /* ==========================================================================
     Init
     ========================================================================== */

  document.addEventListener("DOMContentLoaded", function () {
    initMobileNav();
    initContactForm();
  });
})();