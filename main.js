(function () {
  "use strict";

  /* ==========================================================================
     Theme toggle (light / dark)
     ========================================================================== */

  function initThemeToggle() {
    const toggle = document.getElementById("theme-toggle");
    const root = document.documentElement;

    if (!toggle) return;

    function currentTheme() {
      return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    }

    function applyTheme(theme) {
      root.setAttribute("data-theme", theme);
      toggle.setAttribute("aria-pressed", String(theme === "dark"));
      toggle.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
      try {
        localStorage.setItem("theme", theme);
      } catch (e) {
        /* localStorage unavailable — theme still applies for this session */
      }
    }

    // Sync button state with whatever the anti-flash inline script already set.
    applyTheme(currentTheme());

    toggle.addEventListener("click", function () {
      applyTheme(currentTheme() === "dark" ? "light" : "dark");
    });
  }

  /* ==========================================================================
     Header scroll elevation
     ========================================================================== */

  function initHeaderScrollElevation() {
    const header = document.getElementById("site-header");
    if (!header) return;

    const SCROLL_THRESHOLD = 8;
    let ticking = false;

    function update() {
      header.classList.toggle("is-scrolled", window.scrollY > SCROLL_THRESHOLD);
      ticking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );

    update();
  }

  /* ==========================================================================
     Mobile navigation toggle
     ========================================================================== */

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

  /* ==========================================================================
     Scrollspy — highlights the nav link for the section currently in view
     ========================================================================== */

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

  /* ==========================================================================
     Scroll reveal — fades/rises elements into view, staggered per group
     ========================================================================== */

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

    // Stagger items that share the same parent grid (skills, projects, certificates).
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
      submitLabel.textContent = t("contact.sending");
      status.textContent = "";
      status.classList.remove("is-error", "is-success");
    }

    function setSuccessState() {
      submitBtn.classList.remove("is-error");
      submitBtn.classList.add("is-success");
      submitLabel.textContent = t("contact.sent");
      status.textContent = t("contact.successMsg");
      status.classList.remove("is-error");
      status.classList.add("is-success");
      form.reset();
    }

    function setErrorState(message) {
      submitBtn.classList.remove("is-success");
      submitBtn.classList.add("is-error");
      submitBtn.disabled = false;
      submitLabel.textContent = t("contact.send");
      status.textContent = message || t("contact.errorMsg");
      status.classList.remove("is-success");
      status.classList.add("is-error");
    }

    function resetToIdle() {
      submitBtn.classList.remove("is-success", "is-error");
      submitBtn.disabled = false;
      submitLabel.textContent = t("contact.send");
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
        setErrorState(t("contact.fillAll"));
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
     i18n (English / Arabic)
     ========================================================================== */

  const I18N = {
    en: {
      "a11y.skip": "Skip to main content",
      "nav.home": "Home", "nav.about": "About", "nav.skills": "Skills",
      "nav.projects": "Projects", "nav.activity": "Activity",
      "nav.certificates": "Certificates", "nav.contact": "Contact",
      "palette.open": "Quick search", "palette.placeholder": "Type a command or search…",
      "palette.empty": "No matching commands.",
      "palette.cmd.goHome": "Go to Home", "palette.cmd.goAbout": "Go to About",
      "palette.cmd.goSkills": "Go to Skills", "palette.cmd.goProjects": "Go to Projects",
      "palette.cmd.goActivity": "Go to Activity", "palette.cmd.goCertificates": "Go to Certificates",
      "palette.cmd.goContact": "Go to Contact",
      "palette.cmd.themeDark": "Switch to dark theme", "palette.cmd.themeLight": "Switch to light theme",
      "palette.cmd.langAr": "التبديل إلى العربية", "palette.cmd.langEn": "Switch to English",
      "palette.cmd.copyEmail": "Copy email address", "palette.cmd.copyEmailDone": "Email copied ✓",
      "palette.cmd.openGithub": "Open GitHub profile", "palette.cmd.openLinkedin": "Open LinkedIn profile",
      "palette.cmd.downloadCV": "Download CV (PDF)",
      "palette.cmd.recruiterOn": "Enable Recruiter mode", "palette.cmd.recruiterOff": "Disable Recruiter mode",
      "palette.cmd.saveContact": "Save contact (vCard)",
      "palette.group.nav": "Navigate", "palette.group.action": "Actions",
      "recruiter.toggleOn": "🎯 Recruiter mode", "recruiter.toggleOff": "🎯 Recruiter mode: On",
      "recruiter.summaryNote": " · 7+ shipped projects · Available for hire",
      "recruiter.downloadCV": "Download CV (PDF)", "recruiter.emailMe": "Email me",
      "recruiter.certNote": "+4 additional certificates available — ask and I'll share them.",
      "hero.role": "Frontend Developer",
      "hero.lede": "Frontend Developer specializing in HTML5, CSS3, Tailwind CSS, and JavaScript (ES6+). Graduate of the <a href=\"https://www.alxafrica.com/\" id=\"alx\" target=\"_blank\" rel=\"noopener noreferrer\">ALX Africa</a> Software Engineering program, experienced in building responsive, accessible web applications and converting Figma designs into scalable, pixel-perfect interfaces. Proficient in reusable component architecture, DOM manipulation, REST API integration, state management, performance optimization, and semantic HTML, with a strong focus on clean, maintainable, and efficient code.",
      "hero.cta": "View my work",
      "about.heading": "About me",
      "about.text": "I specialize in building responsive web applications that combine clean implementation with intuitive user experiences. My approach emphasizes semantic code, reusable components, performance optimization, and accessibility to create interfaces that are both reliable and easy to maintain.",
      "about.cta": "See my projects",
      "skills.heading": "Skills",
      "skills.html.title": "HTML5", "skills.html.desc": "Structure and semantic markup for web pages.",
      "skills.css.title": "CSS3", "skills.css.desc": "Styling, layout design, and responsive UI.",
      "skills.js.title": "JavaScript", "skills.js.desc": "Interactive and dynamic web experiences.",
      "skills.tailwind.title": "Tailwind CSS", "skills.tailwind.desc": "Rapidly building modern, responsive interfaces with utility classes.",
      "skills.git.title": "Git &amp; GitHub", "skills.git.desc": "Version control and collaboration tools.",
      "projects.heading": "Projects", "projects.liveDemo": "Live demo", "projects.github": "GitHub",
      "projects.figma": "Figma Design", "projects.featured": "Featured",
      "projects.furniro.desc": "Furniro is a responsive furniture e-commerce website built with HTML5, Tailwind CSS, and Vanilla JavaScript, featuring reusable components, modular architecture, and efficient state management.",
      "projects.brainwave.desc": "A visually striking, fully responsive landing page presenting an AI-driven platform with a modern, tech-centric identity and a premium, product-grade feel.",
      "projects.todo.desc": "A simple, interactive to-do list app built with vanilla JavaScript — part of my journey applying core JavaScript by building real-world projects.",
      "projects.professional.desc": "A hero landing page for a digital solutions startup helping brands turn ideas into full digital experiences and launch strong, Arabic-first brands in the market.",
      "projects.profileCard.desc": "A simple, responsive profile card built with HTML5 and Tailwind CSS — clean typography, a modern layout, and hover effects, reusable across portfolios and team sections.",
      "projects.testimonials.desc": "A responsive testimonials grid built with HTML5 and CSS, highlighting client feedback in a modern grid layout with clean typography and structured components.",
      "activity.heading": "Latest on GitHub",
      "activity.subtitle": "Live data pulled directly from my GitHub profile — updates automatically, no manual edits needed.",
      "activity.viewProfile": "View full GitHub profile",
      "activity.updated": "Updated ", "activity.error": "Couldn't load live GitHub data right now — you can still view the profile directly.",
      "certificates.heading": "Certificates", "certificates.view": "View certificate",
      "certificates.htmlcss.desc": "Advanced knowledge of semantic HTML and modern CSS techniques.",
      "certificates.js.desc": "Advanced knowledge of JavaScript.",
      "certificates.python.desc": "Advanced knowledge of Python.",
      "certificates.jsv2.desc": "A beginner-friendly course covering JavaScript, culminating in building a Wordle clone.",
      "certificates.webdev.desc": "A beginner-friendly course covering HTML, CSS, and JavaScript, culminating in building a Wordle clone.",
      "certificates.css.desc": "Introduction to CSS fundamentals and responsive design.",
      "certificates.alx.desc": "Comprehensive software engineering program specializing in backend development.",
      "contact.heading": "Contact me", "contact.name": "Name", "contact.namePlaceholder": "Enter your name",
      "contact.email": "Email", "contact.emailPlaceholder": "Enter your email",
      "contact.message": "Message", "contact.messagePlaceholder": "Write your message",
      "contact.send": "Send message", "contact.sending": "Sending…", "contact.sent": "Sent",
      "contact.successMsg": "Thanks — your message is on its way. I'll reply soon.",
      "contact.errorMsg": "Something went wrong. Please try again or email me directly.",
      "contact.fillAll": "Please fill in every field before sending.",
      "contact.reachMe": "You can also reach me on:",
      "vcard.label": "Save my contact instantly:", "vcard.button": "Download vCard (.vcf)",
      "footer.rights": "© 2025 Marwan Mostafa. All rights reserved.",
      "terminal.help": "Available commands: help, whoami, skills, projects, certificates, contact, activity, theme [light|dark], lang [en|ar], resume, github, linkedin, clear",
      "terminal.whoami": "Marwan Mostafa — Frontend Developer building fast, accessible, polished interfaces.",
      "terminal.skills": "HTML5 · CSS3 · JavaScript (ES6+) · Tailwind CSS · Git & GitHub",
      "terminal.projects": "Scrolling to Projects…", "terminal.certificates": "Scrolling to Certificates…",
      "terminal.contact": "Scrolling to Contact…", "terminal.activity": "Scrolling to GitHub activity…",
      "terminal.themeSet": "Theme set to ", "terminal.langSet": "Language set to ",
      "terminal.cleared": "", "terminal.resume": "Opening print dialog — choose 'Save as PDF'…",
      "terminal.github": "Opening GitHub profile…", "terminal.linkedin": "Opening LinkedIn profile…",
      "terminal.notFound": "command not found: ", "terminal.sudo": "Nice try. Permission denied — but I like the initiative. 😄",
      "terminal.usage.theme": "usage: theme [light|dark]", "terminal.usage.lang": "usage: lang [en|ar]"
    },
    ar: {
      "a11y.skip": "تخطَّ إلى المحتوى الرئيسي",
      "nav.home": "الرئيسية", "nav.about": "نبذة عني", "nav.skills": "المهارات",
      "nav.projects": "المشاريع", "nav.activity": "النشاط",
      "nav.certificates": "الشهادات", "nav.contact": "تواصل معي",
      "palette.open": "بحث سريع", "palette.placeholder": "اكتب أمرًا أو ابحث…",
      "palette.empty": "لا توجد أوامر مطابقة.",
      "palette.cmd.goHome": "الذهاب إلى الرئيسية", "palette.cmd.goAbout": "الذهاب إلى نبذة عني",
      "palette.cmd.goSkills": "الذهاب إلى المهارات", "palette.cmd.goProjects": "الذهاب إلى المشاريع",
      "palette.cmd.goActivity": "الذهاب إلى النشاط", "palette.cmd.goCertificates": "الذهاب إلى الشهادات",
      "palette.cmd.goContact": "الذهاب إلى التواصل",
      "palette.cmd.themeDark": "التبديل إلى الوضع الداكن", "palette.cmd.themeLight": "التبديل إلى الوضع الفاتح",
      "palette.cmd.langAr": "التبديل إلى العربية", "palette.cmd.langEn": "Switch to English",
      "palette.cmd.copyEmail": "نسخ البريد الإلكتروني", "palette.cmd.copyEmailDone": "تم نسخ البريد ✓",
      "palette.cmd.openGithub": "فتح صفحة GitHub", "palette.cmd.openLinkedin": "فتح صفحة LinkedIn",
      "palette.cmd.downloadCV": "تحميل السيرة الذاتية (PDF)",
      "palette.cmd.recruiterOn": "تفعيل وضع المسؤول عن التوظيف", "palette.cmd.recruiterOff": "إيقاف وضع المسؤول عن التوظيف",
      "palette.cmd.saveContact": "حفظ جهة الاتصال (vCard)",
      "palette.group.nav": "التنقل", "palette.group.action": "إجراءات",
      "recruiter.toggleOn": "🎯 وضع التوظيف", "recruiter.toggleOff": "🎯 وضع التوظيف: مفعّل",
      "recruiter.summaryNote": " · أكثر من 7 مشاريع منجزة · متاح للعمل",
      "recruiter.downloadCV": "تحميل السيرة الذاتية (PDF)", "recruiter.emailMe": "راسلني بالإيميل",
      "recruiter.certNote": "+4 شهادات إضافية متاحة — تواصل معي وسأشاركها معك.",
      "hero.role": "مطوّر واجهات أمامية (Frontend Developer)",
      "hero.lede": "مطوّر واجهات أمامية متخصص في HTML5 وCSS3 وTailwind CSS وJavaScript (ES6+). خريج برنامج هندسة البرمجيات في <a href=\"https://www.alxafrica.com/\" id=\"alx\" target=\"_blank\" rel=\"noopener noreferrer\">ALX Africa</a>، ولدي خبرة في بناء تطبيقات ويب متجاوبة وسهلة الوصول، وتحويل تصاميم Figma إلى واجهات قابلة للتوسّع ودقيقة التفاصيل. متمكّن من بنية المكوّنات القابلة لإعادة الاستخدام، والتعامل مع DOM، وربط REST API، وإدارة الحالة، وتحسين الأداء، وHTML الدلالي، مع تركيز قوي على كتابة كود نظيف وسهل الصيانة وفعّال.",
      "hero.cta": "شاهد أعمالي",
      "about.heading": "نبذة عني",
      "about.text": "أتخصص في بناء تطبيقات ويب متجاوبة تجمع بين التنفيذ النظيف وتجربة مستخدم بديهية. يركّز أسلوبي على الكود الدلالي، والمكوّنات القابلة لإعادة الاستخدام، وتحسين الأداء، وإمكانية الوصول لإنشاء واجهات موثوقة وسهلة الصيانة.",
      "about.cta": "شاهد مشاريعي",
      "skills.heading": "المهارات",
      "skills.html.title": "HTML5", "skills.html.desc": "بنية وعلامات دلالية لصفحات الويب.",
      "skills.css.title": "CSS3", "skills.css.desc": "التنسيق، وتصميم التخطيطات، والواجهات المتجاوبة.",
      "skills.js.title": "JavaScript", "skills.js.desc": "تجارب ويب تفاعلية وديناميكية.",
      "skills.tailwind.title": "Tailwind CSS", "skills.tailwind.desc": "بناء واجهات حديثة ومتجاوبة بسرعة باستخدام utility classes.",
      "skills.git.title": "Git وGitHub", "skills.git.desc": "أدوات التحكم بالإصدارات والعمل الجماعي.",
      "projects.heading": "المشاريع", "projects.liveDemo": "معاينة حية", "projects.github": "GitHub",
      "projects.figma": "تصميم Figma", "projects.featured": "مميّز",
      "projects.furniro.desc": "Furniro موقع تجارة إلكترونية للأثاث، متجاوب بالكامل، مبني بـ HTML5 وTailwind CSS وJavaScript، بمكوّنات قابلة لإعادة الاستخدام وبنية معيارية وإدارة حالة فعّالة.",
      "projects.brainwave.desc": "صفحة هبوط متجاوبة بالكامل وملفتة بصريًا لمنصة تعتمد على الذكاء الاصطناعي، بهوية تقنية عصرية وإحساس منتج احترافي.",
      "projects.todo.desc": "تطبيق قائمة مهام بسيط وتفاعلي مبني بـ JavaScript خام — جزء من رحلتي في تطبيق أساسيات JavaScript عبر مشاريع حقيقية.",
      "projects.professional.desc": "صفحة هبوط لشركة ناشئة في الحلول الرقمية، تساعد العلامات التجارية على تحويل أفكارها إلى تجارب رقمية كاملة وإطلاق علامات تجارية عربية قوية.",
      "projects.profileCard.desc": "بطاقة تعريف بسيطة ومتجاوبة مبنية بـ HTML5 وTailwind CSS — خطوط نظيفة، تصميم عصري، وتأثيرات hover، قابلة لإعادة الاستخدام في البورتفوليوهات وصفحات الفرق.",
      "projects.testimonials.desc": "شبكة آراء عملاء متجاوبة مبنية بـ HTML5 وCSS، تعرض التقييمات في تخطيط شبكي عصري بخطوط نظيفة ومكوّنات منظمة.",
      "activity.heading": "آخر النشاطات على GitHub",
      "activity.subtitle": "بيانات حية من صفحتي على GitHub — تتحدّث تلقائيًا من غير أي تعديل يدوي.",
      "activity.viewProfile": "عرض صفحة GitHub كاملة",
      "activity.updated": "آخر تحديث ", "activity.error": "تعذّر تحميل بيانات GitHub الحية الآن — يمكنك زيارة الصفحة مباشرةً.",
      "certificates.heading": "الشهادات", "certificates.view": "عرض الشهادة",
      "certificates.htmlcss.desc": "معرفة متقدمة بـ HTML الدلالي وتقنيات CSS الحديثة.",
      "certificates.js.desc": "معرفة متقدمة بـ JavaScript.",
      "certificates.python.desc": "معرفة متقدمة بـ Python.",
      "certificates.jsv2.desc": "دورة تناسب المبتدئين في JavaScript، تنتهي ببناء نسخة من لعبة Wordle.",
      "certificates.webdev.desc": "دورة تناسب المبتدئين في HTML وCSS وJavaScript، تنتهي ببناء نسخة من لعبة Wordle.",
      "certificates.css.desc": "مقدمة في أساسيات CSS والتصميم المتجاوب.",
      "certificates.alx.desc": "برنامج شامل في هندسة البرمجيات متخصص في تطوير الخلفية (Backend).",
      "contact.heading": "تواصل معي", "contact.name": "الاسم", "contact.namePlaceholder": "اكتب اسمك",
      "contact.email": "البريد الإلكتروني", "contact.emailPlaceholder": "اكتب بريدك الإلكتروني",
      "contact.message": "الرسالة", "contact.messagePlaceholder": "اكتب رسالتك",
      "contact.send": "إرسال الرسالة", "contact.sending": "جارٍ الإرسال…", "contact.sent": "تم الإرسال",
      "contact.successMsg": "شكرًا — رسالتك في طريقها إليّ. هردّ عليك قريبًا.",
      "contact.errorMsg": "حدث خطأ ما. حاول مرة أخرى أو راسلني مباشرة بالإيميل.",
      "contact.fillAll": "من فضلك املأ كل الحقول قبل الإرسال.",
      "contact.reachMe": "تقدر كمان تتواصل معايا عبر:",
      "vcard.label": "احفظ بياناتي فورًا:", "vcard.button": "تحميل vCard (.vcf)",
      "footer.rights": "© 2025 مروان مصطفى. جميع الحقوق محفوظة.",
      "terminal.help": "الأوامر المتاحة: help, whoami, skills, projects, certificates, contact, activity, theme [light|dark], lang [en|ar], resume, github, linkedin, clear",
      "terminal.whoami": "مروان مصطفى — مطوّر واجهات أمامية يبني واجهات سريعة وسهلة الوصول واحترافية.",
      "terminal.skills": "HTML5 · CSS3 · JavaScript (ES6+) · Tailwind CSS · Git وGitHub",
      "terminal.projects": "جارٍ الانتقال إلى المشاريع…", "terminal.certificates": "جارٍ الانتقال إلى الشهادات…",
      "terminal.contact": "جارٍ الانتقال إلى التواصل…", "terminal.activity": "جارٍ الانتقال إلى نشاط GitHub…",
      "terminal.themeSet": "تم ضبط الثيم على ", "terminal.langSet": "تم ضبط اللغة على ",
      "terminal.cleared": "", "terminal.resume": "جارٍ فتح نافذة الطباعة — اختر 'حفظ كـ PDF'…",
      "terminal.github": "جارٍ فتح صفحة GitHub…", "terminal.linkedin": "جارٍ فتح صفحة LinkedIn…",
      "terminal.notFound": "أمر غير معروف: ", "terminal.sudo": "محاولة لطيفة، بس الصلاحية مرفوضة 😄",
      "terminal.usage.theme": "الاستخدام: theme [light|dark]", "terminal.usage.lang": "الاستخدام: lang [en|ar]"
    }
  };

  function currentLang() {
    return document.documentElement.getAttribute("lang") === "ar" ? "ar" : "en";
  }

  function t(key) {
    const lang = currentLang();
    return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  }

  function applyLanguage(lang) {
    const root = document.documentElement;
    root.setAttribute("lang", lang);
    root.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      const key = el.getAttribute("data-i18n");
      const value = (I18N[lang] && I18N[lang][key]) || I18N.en[key];
      if (value !== undefined) el.innerHTML = value;
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      const key = el.getAttribute("data-i18n-placeholder");
      const value = (I18N[lang] && I18N[lang][key]) || I18N.en[key];
      if (value !== undefined) el.setAttribute("placeholder", value);
    });

    const langLabel = document.getElementById("lang-toggle-label");
    const langToggle = document.getElementById("lang-toggle");
    if (langLabel && langToggle) {
      langLabel.textContent = lang === "ar" ? "EN" : "عربي";
      langToggle.setAttribute("aria-label", lang === "ar" ? "Switch to English" : "التبديل إلى العربية");
    }

    try {
      localStorage.setItem("lang", lang);
    } catch (e) {
      /* localStorage unavailable — language still applies for this session */
    }

    renderActivityFeed();
  }

  function initLanguageToggle() {
    const toggle = document.getElementById("lang-toggle");
    if (!toggle) return;
    toggle.addEventListener("click", function () {
      applyLanguage(currentLang() === "ar" ? "en" : "ar");
    });
  }

  /* ==========================================================================
     Interactive hero terminal
     ========================================================================== */

  function initHeroTerminal() {
    const body = document.getElementById("terminal-body");
    const input = document.getElementById("terminal-input");
    if (!body || !input) return;

    const history = [];
    let historyIndex = -1;

    function printLine(text, variant) {
      const p = document.createElement("p");
      p.className = "hero-terminal-line" + (variant ? " hero-terminal-line--" + variant : "");
      p.textContent = text;
      body.appendChild(p);
      body.scrollTop = body.scrollHeight;
    }

    function scrollToSection(id) {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function runCommand(raw) {
      const trimmed = raw.trim();
      if (!trimmed) return;

      printLine("> " + trimmed, "command");
      history.push(trimmed);
      historyIndex = history.length;

      const parts = trimmed.split(/\s+/);
      const name = parts[0].toLowerCase();
      const arg = (parts[1] || "").toLowerCase();

      switch (name) {
        case "help":
          printLine(t("terminal.help"));
          break;
        case "whoami":
          printLine(t("terminal.whoami"));
          break;
        case "skills":
          printLine(t("terminal.skills"));
          scrollToSection("skills");
          break;
        case "projects":
          printLine(t("terminal.projects"));
          scrollToSection("projects");
          break;
        case "activity":
          printLine(t("terminal.activity"));
          scrollToSection("activity");
          break;
        case "certificates":
          printLine(t("terminal.certificates"));
          scrollToSection("certificates");
          break;
        case "contact":
          printLine(t("terminal.contact"));
          scrollToSection("contact");
          break;
        case "theme":
          if (arg === "light" || arg === "dark") {
            document.documentElement.setAttribute("data-theme", arg);
            try { localStorage.setItem("theme", arg); } catch (e) {}
            const themeToggle = document.getElementById("theme-toggle");
            if (themeToggle) {
              themeToggle.setAttribute("aria-pressed", String(arg === "dark"));
              themeToggle.setAttribute("aria-label", arg === "dark" ? "Switch to light theme" : "Switch to dark theme");
            }
            printLine(t("terminal.themeSet") + arg);
          } else {
            printLine(t("terminal.usage.theme"), "error");
          }
          break;
        case "lang":
          if (arg === "en" || arg === "ar") {
            applyLanguage(arg);
            printLine(t("terminal.langSet") + arg);
          } else {
            printLine(t("terminal.usage.lang"), "error");
          }
          break;
        case "resume":
        case "cv":
          printLine(t("terminal.resume"));
          setTimeout(function () { window.print(); }, 300);
          break;
        case "github":
          printLine(t("terminal.github"));
          window.open("https://github.com/Marwan-Mostafa", "_blank", "noopener,noreferrer");
          break;
        case "linkedin":
          printLine(t("terminal.linkedin"));
          window.open("https://linkedin.com/in/marwanmostafa1/", "_blank", "noopener,noreferrer");
          break;
        case "clear":
          body.innerHTML = "";
          break;
        case "sudo":
          printLine(t("terminal.sudo"));
          break;
        default:
          printLine(t("terminal.notFound") + name, "error");
      }
    }

    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        runCommand(input.value);
        input.value = "";
      } else if (event.key === "ArrowUp") {
        if (history.length) {
          historyIndex = Math.max(0, historyIndex - 1);
          input.value = history[historyIndex] || "";
          event.preventDefault();
        }
      } else if (event.key === "ArrowDown") {
        if (history.length) {
          historyIndex = Math.min(history.length, historyIndex + 1);
          input.value = history[historyIndex] || "";
          event.preventDefault();
        }
      }
    });
  }

  /* ==========================================================================
     Command palette (Cmd/Ctrl + K)
     ========================================================================== */

  function initCommandPalette() {
    const palette = document.getElementById("command-palette");
    const backdrop = document.getElementById("command-palette-backdrop");
    const input = document.getElementById("command-input");
    const list = document.getElementById("command-list");
    const openBtn = document.getElementById("open-palette-btn");

    if (!palette || !input || !list) return;

    let activeIndex = 0;

    function getCommands() {
      const theme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      const lang = currentLang();
      const recruiterOn = document.body.classList.contains("recruiter-mode");

      return [
        { group: t("palette.group.nav"), label: t("palette.cmd.goHome"), action: function () { scrollTo("hero"); } },
        { group: t("palette.group.nav"), label: t("palette.cmd.goAbout"), action: function () { scrollTo("about"); } },
        { group: t("palette.group.nav"), label: t("palette.cmd.goSkills"), action: function () { scrollTo("skills"); } },
        { group: t("palette.group.nav"), label: t("palette.cmd.goProjects"), action: function () { scrollTo("projects"); } },
        { group: t("palette.group.nav"), label: t("palette.cmd.goActivity"), action: function () { scrollTo("activity"); } },
        { group: t("palette.group.nav"), label: t("palette.cmd.goCertificates"), action: function () { scrollTo("certificates"); } },
        { group: t("palette.group.nav"), label: t("palette.cmd.goContact"), action: function () { scrollTo("contact"); } },
        {
          group: t("palette.group.action"),
          label: theme === "dark" ? t("palette.cmd.themeLight") : t("palette.cmd.themeDark"),
          action: function () {
            const toggle = document.getElementById("theme-toggle");
            if (toggle) toggle.click();
          }
        },
        {
          group: t("palette.group.action"),
          label: lang === "ar" ? t("palette.cmd.langEn") : t("palette.cmd.langAr"),
          action: function () { applyLanguage(lang === "ar" ? "en" : "ar"); }
        },
        {
          group: t("palette.group.action"),
          label: recruiterOn ? t("palette.cmd.recruiterOff") : t("palette.cmd.recruiterOn"),
          action: function () {
            const toggle = document.getElementById("recruiter-toggle");
            if (toggle) toggle.click();
          }
        },
        {
          group: t("palette.group.action"),
          label: t("palette.cmd.copyEmail"),
          action: function () {
            copyToClipboard("marwan.mf.tech@gmail.com");
          }
        },
        {
          group: t("palette.group.action"),
          label: t("palette.cmd.openGithub"),
          action: function () { window.open("https://github.com/Marwan-Mostafa", "_blank", "noopener,noreferrer"); }
        },
        {
          group: t("palette.group.action"),
          label: t("palette.cmd.openLinkedin"),
          action: function () { window.open("https://linkedin.com/in/marwanmostafa1/", "_blank", "noopener,noreferrer"); }
        },
        {
          group: t("palette.group.action"),
          label: t("palette.cmd.downloadCV"),
          action: function () { window.print(); }
        },
        {
          group: t("palette.group.action"),
          label: t("palette.cmd.saveContact"),
          action: function () {
            const vcardBtn = document.getElementById("vcard-btn");
            if (vcardBtn) vcardBtn.click();
          }
        }
      ];
    }

    function scrollTo(id) {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function copyToClipboard(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(function () {});
      }
    }

    function render(query) {
      const q = (query || "").trim().toLowerCase();
      const commands = getCommands().filter(function (c) {
        return !q || c.label.toLowerCase().indexOf(q) !== -1;
      });

      list.innerHTML = "";
      activeIndex = 0;

      if (!commands.length) {
        const empty = document.createElement("li");
        empty.className = "command-palette-empty";
        empty.textContent = t("palette.empty");
        list.appendChild(empty);
        return;
      }

      commands.forEach(function (cmd, index) {
        const li = document.createElement("li");
        li.className = "command-palette-item";
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", String(index === activeIndex));
        li.innerHTML = "<span>" + cmd.label + "</span><span class=\"command-palette-item-group\">" + cmd.group + "</span>";
        li.addEventListener("click", function () {
          cmd.action();
          close();
        });
        list.appendChild(li);
      });
    }

    function highlight(delta) {
      const items = Array.prototype.slice.call(list.querySelectorAll(".command-palette-item"));
      if (!items.length) return;
      activeIndex = (activeIndex + delta + items.length) % items.length;
      items.forEach(function (item, index) {
        item.setAttribute("aria-selected", String(index === activeIndex));
      });
      items[activeIndex].scrollIntoView({ block: "nearest" });
    }

    function open() {
      palette.hidden = false;
      input.value = "";
      render("");
      document.body.classList.add("palette-open");
      setTimeout(function () { input.focus(); }, 10);
    }

    function close() {
      palette.hidden = true;
      document.body.classList.remove("palette-open");
    }

    if (openBtn) openBtn.addEventListener("click", open);
    if (backdrop) backdrop.addEventListener("click", close);

    document.addEventListener("keydown", function (event) {
      const isMeta = event.metaKey || event.ctrlKey;
      if (isMeta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (palette.hidden) open(); else close();
        return;
      }
      if (palette.hidden) return;

      if (event.key === "Escape") {
        close();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        highlight(1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        highlight(-1);
      } else if (event.key === "Tab") {
        // The search input is the only focusable element in this dialog —
        // keep focus trapped inside it rather than letting Tab escape to
        // the page behind the modal.
        event.preventDefault();
        input.focus();
      } else if (event.key === "Enter") {
        event.preventDefault();
        const items = Array.prototype.slice.call(list.querySelectorAll(".command-palette-item"));
        if (items[activeIndex]) items[activeIndex].click();
      }
    });

    input.addEventListener("input", function () {
      render(input.value);
    });
  }

  /* ==========================================================================
     Live GitHub activity feed
     ========================================================================== */

  const GITHUB_USERNAME = "Marwan-Mostafa";
  let cachedRepos = null;
  let activityFetchFailed = false;

  function timeAgo(dateString) {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days < 1) return currentLang() === "ar" ? "اليوم" : "today";
    if (days === 1) return currentLang() === "ar" ? "أمس" : "yesterday";
    if (days < 30) return days + (currentLang() === "ar" ? " يوم" : "d");
    const months = Math.floor(days / 30);
    return months + (currentLang() === "ar" ? " شهر" : "mo");
  }

  function renderActivityFeed() {
    const grid = document.getElementById("activity-grid");
    if (!grid) return;

    if (activityFetchFailed) {
      grid.innerHTML = "<p class=\"activity-error\">" + t("activity.error") + "</p>";
      return;
    }

    if (!cachedRepos) return; // still loading — skeletons remain in place

    grid.innerHTML = "";
    cachedRepos.forEach(function (repo) {
      const card = document.createElement("div");
      card.className = "activity-card";

      const name = document.createElement("a");
      name.className = "activity-card-name";
      name.href = repo.html_url;
      name.target = "_blank";
      name.rel = "noopener noreferrer";
      name.textContent = repo.name;

      const desc = document.createElement("p");
      desc.className = "activity-card-desc";
      desc.textContent = repo.description || (currentLang() === "ar" ? "بدون وصف" : "No description provided.");

      const meta = document.createElement("div");
      meta.className = "activity-card-meta";
      const langSpan = document.createElement("span");
      langSpan.className = "activity-card-lang";
      langSpan.textContent = repo.language || "—";
      const updatedSpan = document.createElement("span");
      updatedSpan.textContent = t("activity.updated") + timeAgo(repo.updated_at);
      const starsSpan = document.createElement("span");
      starsSpan.textContent = "★ " + (repo.stargazers_count || 0);

      meta.appendChild(langSpan);
      meta.appendChild(updatedSpan);
      meta.appendChild(starsSpan);

      card.appendChild(name);
      card.appendChild(desc);
      card.appendChild(meta);
      grid.appendChild(card);
    });
  }

  function initActivityFeed() {
    const grid = document.getElementById("activity-grid");
    if (!grid) return;

    fetch("https://api.github.com/users/" + GITHUB_USERNAME + "/repos?sort=updated&per_page=6")
      .then(function (response) {
        if (!response.ok) throw new Error("GitHub API responded with " + response.status);
        return response.json();
      })
      .then(function (repos) {
        cachedRepos = repos.filter(function (r) { return !r.fork; }).slice(0, 6);
        renderActivityFeed();
      })
      .catch(function () {
        activityFetchFailed = true;
        renderActivityFeed();
      });
  }

  /* ==========================================================================
     Recruiter mode
     ========================================================================== */

  function initRecruiterMode() {
    const toggle = document.getElementById("recruiter-toggle");
    if (!toggle) return;

    function apply(isOn) {
      document.body.classList.toggle("recruiter-mode", isOn);
      toggle.setAttribute("aria-pressed", String(isOn));
      try {
        localStorage.setItem("recruiterMode", isOn ? "1" : "0");
      } catch (e) {}
    }

    let stored = false;
    try {
      stored = localStorage.getItem("recruiterMode") === "1";
    } catch (e) {}
    apply(stored);

    toggle.addEventListener("click", function () {
      apply(!document.body.classList.contains("recruiter-mode"));
    });

    const downloadCvBtn = document.getElementById("download-cv-btn");
    if (downloadCvBtn) {
      downloadCvBtn.addEventListener("click", function () {
        window.print();
      });
    }
  }

  /* ==========================================================================
     Save contact (vCard + QR)
     ========================================================================== */

  const CONTACT = {
    name: "Marwan Mostafa",
    title: "Frontend Developer",
    email: "marwan.mf.tech@gmail.com",
    url: "https://github.com/Marwan-Mostafa"
  };

  function buildVCard() {
    return [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:" + CONTACT.name + ";;;",
      "FN:" + CONTACT.name,
      "TITLE:" + CONTACT.title,
      "EMAIL;TYPE=INTERNET:" + CONTACT.email,
      "URL:" + CONTACT.url,
      "END:VCARD"
    ].join("\n");
  }

  function initSaveContact() {
    const vcardBtn = document.getElementById("vcard-btn");
    const qrImg = document.getElementById("contact-qr");

    if (qrImg) {
      const qrData = encodeURIComponent("mailto:" + CONTACT.email);
      qrImg.src = "https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&data=" + qrData;
    }

    if (!vcardBtn) return;

    vcardBtn.addEventListener("click", function () {
      const blob = new Blob([buildVCard()], { type: "text/vcard" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "marwan-mostafa.vcf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
  }

  /* ==========================================================================
     Init
     ========================================================================== */

  document.addEventListener("DOMContentLoaded", function () {
    initThemeToggle();
    initLanguageToggle();
    initHeaderScrollElevation();
    initMobileNav();
    initContactForm();
    initScrollSpy();
    initScrollReveal();
    initHeroTerminal();
    initCommandPalette();
    initActivityFeed();
    initRecruiterMode();
    initSaveContact();

    // Sync UI copy (labels, placeholders) with whatever language the
    // anti-flash inline script already applied to <html lang>.
    applyLanguage(currentLang());
  });
})();