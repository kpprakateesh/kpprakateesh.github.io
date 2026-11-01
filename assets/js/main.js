/* ==========================================================================
   AGAM — site behaviour
   Vanilla JS, no dependencies. Progressive enhancement only.
   ========================================================================== */
(function () {
  "use strict";
  var CFG = window.AGAM || {};

  /* ---------- 1. Inject contact details from config.js ---------- */
  function txt(el, value) { if (el && value != null && value !== "") el.textContent = value; }

  function applyConfig() {
    var q = function (sel) { return document.querySelectorAll(sel); };

    q("[data-contact='name']").forEach(function (el) { txt(el, CFG.name); });
    q("[data-contact='tagline']").forEach(function (el) { txt(el, CFG.tagline); });
    q("[data-contact='phone']").forEach(function (el) { txt(el, CFG.phone); });
    q("[data-contact='email']").forEach(function (el) { txt(el, CFG.email); });
    q("[data-contact='city']").forEach(function (el) { txt(el, CFG.city); });

    q("[data-contact='phone-link']").forEach(function (el) {
      if (CFG.phoneHref) el.setAttribute("href", CFG.phoneHref);
    });

    // E-mail is optional: reveal the [data-email-only] blocks only once we have
    // a real address, otherwise leave them hidden rather than showing a blank row.
    q("[data-email-only]").forEach(function (el) {
      if (CFG.email) el.removeAttribute("hidden");
      else el.setAttribute("hidden", "");
    });
    q("[data-contact='email-link']").forEach(function (el) {
      if (CFG.email) {
        el.setAttribute("href", "mailto:" + CFG.email);
      } else {
        el.removeAttribute("href");
        el.setAttribute("aria-disabled", "true");
      }
    });

    q("[data-contact='address']").forEach(function (el) {
      if (CFG.address) {
        el.innerHTML = "";
        [CFG.address.line1, CFG.address.line2].filter(Boolean).forEach(function (line) {
          var span = document.createElement("span");
          span.textContent = line;
          el.appendChild(span);
          el.appendChild(document.createElement("br"));
        });
        if (el.lastChild && el.lastChild.nodeName === "BR") el.removeChild(el.lastChild);
      }
    });

    q("[data-contact='map-link']").forEach(function (el) {
      if (CFG.address && CFG.address.mapQuery) {
        el.setAttribute("href", "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(CFG.address.mapQuery));
      }
    });

    // Embedded map: coordinates when available, otherwise the address query.
    q("[data-contact='map-embed']").forEach(function (el) {
      if (!CFG.address) return;
      var query = CFG.address.mapLat && CFG.address.mapLng
        ? CFG.address.mapLat + "," + CFG.address.mapLng
        : CFG.address.mapQuery;
      if (!query) return;
      var zoom = Number(CFG.address.mapZoom) || 17;
      el.setAttribute(
        "src",
        "https://www.google.com/maps?q=" + encodeURIComponent(query) + "&z=" + zoom + "&output=embed"
      );
    });

    // WhatsApp links (float button + inline)
    if (CFG.whatsapp) {
      var wa = "https://wa.me/" + CFG.whatsapp + "?text=" + encodeURIComponent("Hello " + (CFG.name || "") + ", I would like to discuss a project.");
      q("[data-contact='whatsapp']").forEach(function (el) { el.setAttribute("href", wa); });

      // Keep the mobile action bar in sync when live settings arrive later.
      var bar = document.querySelector(".mobile-actions");
      if (bar) {
        var phoneAction = bar.querySelector("a[href^='tel:']");
        if (phoneAction && CFG.phoneHref) phoneAction.setAttribute("href", CFG.phoneHref);
        var waAction = bar.querySelector("a[target='_blank']");
        if (waAction) waAction.setAttribute("href", wa);
      }
    }

    // Opening hours
    q("[data-hours]").forEach(function (dl) {
      if (!CFG.hours || !CFG.hours.length) return;
      dl.innerHTML = "";
      CFG.hours.forEach(function (row) {
        var dt = document.createElement("dt");
        dt.textContent = row[0];
        var dd = document.createElement("dd");
        dd.textContent = row[1];
        dl.appendChild(dt);
        dl.appendChild(dd);
      });
    });

    // Social icons
    q("[data-social]").forEach(function (a) {
      var key = a.getAttribute("data-social");
      var url = CFG.social && CFG.social[key];
      if (url) { a.setAttribute("href", url); a.removeAttribute("hidden"); }
      else { a.setAttribute("hidden", ""); }
    });

    // Footer year
    q("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  /* ---------- 2. Sticky header + scroll progress ---------- */
  function initHeader() {
    var header = document.querySelector(".site-header");
    var bar = document.createElement("div");
    bar.className = "scroll-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);

    var ticking = false;
    var onScroll = function () {
      if (header) header.classList.toggle("is-stuck", window.scrollY > 8);
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
      ticking = false;
    };
    var request = function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
    };
    onScroll();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
  }

  /* ---------- 2b. Cursor spotlight (hero + service cards) ---------- */
  function initSpotlight() {
    var isTouch = function (e) { return e.pointerType === "touch" || e.pointerType === "pen"; };

    var hero = document.querySelector(".hero");
    if (hero) {
      hero.addEventListener("pointermove", function (e) {
        if (isTouch(e)) return;
        var r = hero.getBoundingClientRect();
        hero.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100).toFixed(2) + "%");
        hero.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100).toFixed(2) + "%");
        hero.classList.add("is-live");
      });
      hero.addEventListener("pointerleave", function () { hero.classList.remove("is-live"); });
    }

    document.querySelectorAll(".service-card").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        if (isTouch(e)) return;
        var r = card.getBoundingClientRect();
        card.style.setProperty("--sx", ((e.clientX - r.left) / r.width * 100).toFixed(2) + "%");
        card.style.setProperty("--sy", ((e.clientY - r.top) / r.height * 100).toFixed(2) + "%");
      });
    });
  }

  /* ---------- 3. Mobile navigation ---------- */
  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.querySelector(".nav");
    if (!toggle || !nav) return;

    var close = function () {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.style.removeProperty("overflow");
    };

    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    });

    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 880) close();
    });
  }

  /* ---------- 4. Reveal on scroll ---------- */
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var delay = Number(el.getAttribute("data-delay") || 0);
          setTimeout(function () { el.classList.add("is-in"); }, delay);
          io.unobserve(el);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 5. Project filters ---------- */
  function initFilters() {
    var buttons = document.querySelectorAll(".filter");
    if (!buttons.length) return;

    var countEl = document.querySelector("[data-result-count]");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var run = 0;
    var current = "all";

    function apply(filter) {
      // Query on every run: the live site can replace the grid after Firebase loads.
      var cards = Array.prototype.slice.call(document.querySelectorAll(".project[data-tags]"));
      var my = ++run;
      var visible = 0;
      current = filter;

      cards.forEach(function (card) {
        var tags = (card.getAttribute("data-tags") || "").split(/\s+/);
        var show = filter === "all" || tags.indexOf(filter) !== -1;
        if (show) visible++;

        if (reduce) {
          card.hidden = !show;
          card.classList.remove("is-out");
          return;
        }

        if (show) {
          card.hidden = false;
          window.requestAnimationFrame(function () { card.classList.remove("is-out"); });
        } else {
          card.classList.add("is-out");
          window.setTimeout(function () {
            if (my !== run) return;
            card.hidden = true;
            card.classList.remove("is-out");
          }, 180);
        }
      });

      if (countEl) {
        countEl.innerHTML = "<b>" + visible + "</b> " + (visible === 1 ? "study" : "studies");
      }
      document.dispatchEvent(new CustomEvent("agam:filter"));
    }

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var filter = btn.getAttribute("data-filter");
        if (btn.getAttribute("aria-pressed") === "true" && filter !== "all") return;
        buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
        apply(filter);
      });
    });

    // The live site may replace the grid once Firebase data arrives.
    document.addEventListener("agam:projects-changed", function () { apply(current); });
    apply(current);
  }

  /* ---------- 5b. Hero workplace / home preview ---------- */
  function initHeroView() {
    var buttons = document.querySelectorAll("[data-hero-view]");
    var images = document.querySelectorAll("[data-hero-img]");
    if (!buttons.length || !images.length) return;

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var view = btn.getAttribute("data-hero-view");
        buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
        images.forEach(function (img) {
          var match = img.getAttribute("data-hero-img") === view;
          img.hidden = !match;
          if (match && !reduce && img.animate) {
            img.animate(
              [{ opacity: 0, transform: "scale(1.035)" }, { opacity: 1, transform: "scale(1)" }],
              { duration: 450, easing: "cubic-bezier(.16,1,.3,1)" }
            );
          }
        });
      });
    });
  }

  /* ---------- 5c. Project lightbox ---------- */
  function initLightbox() {
    var dialog = document.querySelector("[data-lightbox]");
    if (!dialog) return;

    function items() {
      return Array.prototype.slice.call(document.querySelectorAll("[data-lightbox-item]"));
    }

    var img = dialog.querySelector("[data-lightbox-img]");
    var title = dialog.querySelector("[data-lightbox-title]");
    var meta = dialog.querySelector("[data-lightbox-meta]");
    var count = dialog.querySelector("[data-lightbox-count]");
    var closeBtn = dialog.querySelector(".lightbox__close");
    var prevBtn = dialog.querySelector("[data-lightbox-prev]");
    var nextBtn = dialog.querySelector("[data-lightbox-next]");
    var isOpen = false;
    var index = 0;
    var lastFocus = null;

    function visibleItems() {
      return items().filter(function (a) { return !a.hidden; });
    }

    function render(i) {
      var list = visibleItems();
      if (!list.length) return;
      index = (i + list.length) % list.length;
      var item = list[index];
      var thumb = item.querySelector("img");
      img.src = item.getAttribute("href");
      img.alt = thumb ? thumb.alt : "";
      title.textContent = item.getAttribute("data-title") || "";
      meta.textContent = item.getAttribute("data-meta") || "";
      count.textContent = (index + 1) + " / " + list.length;
    }

    function open(item) {
      var list = visibleItems();
      var at = list.indexOf(item);
      if (at === -1) return;
      lastFocus = document.activeElement;
      if (!lastFocus || lastFocus === document.body) lastFocus = item;
      isOpen = true;
      render(at);
      dialog.hidden = false;
      document.body.classList.add("is-locked");
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      dialog.hidden = true;
      document.body.classList.remove("is-locked");
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    // Delegated: covers tiles rendered later from Firestore.
    document.addEventListener("click", function (e) {
      var item = e.target.closest ? e.target.closest("[data-lightbox-item]") : null;
      if (!item) return;
      e.preventDefault();
      open(item);
    });

    dialog.querySelectorAll("[data-lightbox-close]").forEach(function (el) {
      el.addEventListener("click", close);
    });
    if (prevBtn) prevBtn.addEventListener("click", function () { render(index - 1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { render(index + 1); });
    if (img) img.addEventListener("click", function () { render(index + 1); });

    document.addEventListener("keydown", function (e) {
      if (!isOpen) return;
      if (e.key === "Escape") { e.preventDefault(); close(); }
      if (e.key === "ArrowRight") { e.preventDefault(); render(index + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); render(index - 1); }
      if (e.key === "Tab") {
        var focusables = dialog.querySelectorAll("button, [href], [tabindex]:not([tabindex='-1'])");
        if (!focusables.length) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    document.addEventListener("agam:filter", function () { if (isOpen) close(); });
  }

  /* ---------- 5d. Animated FAQ ---------- */
  function initFaq() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    document.querySelectorAll(".faq details").forEach(function (detail) {
      var summary = detail.querySelector("summary");
      var body = detail.querySelector("p");
      if (!summary || !body) return;

      summary.addEventListener("click", function (e) {
        if (detail.hasAttribute("data-busy")) { e.preventDefault(); return; }
        e.preventDefault();
        detail.setAttribute("data-busy", "");

        body.style.boxSizing = "border-box";
        body.style.overflow = "hidden";

        if (detail.open) {
          var from = body.getBoundingClientRect().height;
          var out = body.animate(
            [{ height: from + "px", opacity: 1 }, { height: "0px", opacity: 0 }],
            { duration: 260, easing: "cubic-bezier(.22,.68,.2,1)" }
          );
          out.onfinish = function () {
            detail.open = false;
            body.style.height = "";
            body.style.opacity = "";
            detail.removeAttribute("data-busy");
          };
        } else {
          detail.open = true;
          var to = body.getBoundingClientRect().height;
          var anim = body.animate(
            [{ height: "0px", opacity: 0 }, { height: to + "px", opacity: 1 }],
            { duration: 300, easing: "cubic-bezier(.22,.68,.2,1)" }
          );
          anim.onfinish = function () {
            body.style.height = "";
            body.style.opacity = "";
            detail.removeAttribute("data-busy");
          };
        }
      });
    });
  }

  /* ---------- 5e. Services TOC scrollspy ---------- */
  function initTocSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll(".toc a[href^='#']"));
    if (!links.length || !("IntersectionObserver" in window)) return;

    var map = new Map();
    links.forEach(function (link) {
      var target = document.querySelector(link.getAttribute("href"));
      if (target) map.set(target, link);
    });
    if (!map.size) return;

    var active = null;
    function setActive(link) {
      if (!link || link === active) return;
      if (active) active.classList.remove("is-active");
      active = link;
      active.classList.add("is-active");
    }

    var io = new IntersectionObserver(function (entries) {
      var best = null;
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          if (!best || entry.intersectionRatio > best.intersectionRatio) best = entry;
        }
      });
      if (best) setActive(map.get(best.target));
    }, { rootMargin: "-18% 0px -62% 0px", threshold: [0, 0.2, 0.6] });

    map.forEach(function (link, target) { io.observe(target); });

    links.forEach(function (link) {
      link.addEventListener("click", function () { setActive(link); });
    });
  }

  /* ---------- 5f. Back to top ---------- */
  function initToTop() {
    if (document.querySelector(".to-top")) return;
    var btn = document.createElement("a");
    btn.className = "to-top";
    btn.href = "#";
    btn.setAttribute("aria-label", "Back to top");
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
    document.body.appendChild(btn);

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    var onScroll = function () {
      btn.classList.toggle("is-visible", window.scrollY > 700);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- 5g. Mobile action bar ---------- */
  function initMobileBar() {
    if (document.querySelector(".mobile-actions")) return;
    var phoneHref = CFG.phoneHref || "tel:";
    var wa = CFG.whatsapp ? "https://wa.me/" + CFG.whatsapp + "?text=" + encodeURIComponent("Hello " + (CFG.name || "") + ", I would like to discuss a project.") : "";

    var bar = document.createElement("div");
    bar.className = "mobile-actions";
    bar.setAttribute("aria-label", "Quick contact");
    bar.innerHTML =
      '<a href="' + phoneHref + '" aria-label="Call Agam">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/></svg>' +
        '<span>Call</span></a>' +
      (wa ? '<a href="' + wa + '" target="_blank" rel="noopener" aria-label="WhatsApp Agam">' +
        '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.2-1.8-.9-2.1-1s-.5-.1-.7.2-.8 1-1 1.2-.4.2-.7 0a8.4 8.4 0 0 1-2.5-1.5 9.3 9.3 0 0 1-1.7-2.1c-.2-.3 0-.5.1-.6l.5-.6.3-.5v-.5l-1-2.3c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3 2 3.2 5 4.5c1.8.8 2.5.8 3.4.7.5 0 1.6-.6 1.8-1.3s.3-1.2.2-1.3-.2-.2-.5-.3M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.4A10 10 0 1 0 12 2m0 1.8a8.2 8.2 0 1 1-4.2 15.3l-.3-.2-2.8.8.8-2.8-.2-.3A8.2 8.2 0 0 1 12 3.8"/></svg>' +
        '<span>WhatsApp</span></a>' : "") +
      '<a class="is-accent" href="contact.html" aria-label="Book a consultation">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v14H4z"/><path d="m4 6 8 6 8-6"/></svg>' +
        '<span>Enquire</span></a>';
    document.body.appendChild(bar);
    document.body.classList.add("has-mobile-actions");
  }

  /* ---------- 5h. Subtle parallax ---------- */
  function initParallax() {
    var els = Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));
    if (!els.length) return;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var ticking = false;

    function update() {
      ticking = false;
      if (reduce || window.innerWidth < 700) {
        els.forEach(function (el) {
          var img = el.querySelector("img");
          if (img) img.style.transform = "";
        });
        return;
      }
      var vh = window.innerHeight;
      els.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -80 || r.top > vh + 80) return;
        var speed = parseFloat(el.getAttribute("data-parallax")) || 0.04;
        var progress = (r.top + r.height / 2 - vh / 2) / vh;
        var shift = (progress * speed * 260).toFixed(1);
        var img = el.querySelector("img");
        if (img) img.style.transform = "translate3d(0," + shift + "px,0) scale(1.06)";
      });
    }

    function request() {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }

    update();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
  }

  /* ---------- 6. Enquiry form ---------- */
  function initForm() {
    var form = document.querySelector("[data-enquiry-form]");
    if (!form) return;

    var status = form.querySelector("[data-form-status]");
    var submit = form.querySelector("[type='submit']");
    var original = submit ? submit.innerHTML : "";

    function say(msg, kind) {
      if (!status) return;
      status.textContent = msg;
      status.className = "form-status is-visible " + (kind === "error" ? "is-error" : "is-ok");
    }

    function data() {
      var out = {};
      new FormData(form).forEach(function (v, k) { out[k] = v; });
      return out;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // honeypot
      if (form.querySelector("[name='company_website']") && form.querySelector("[name='company_website']").value) return;

      if (!form.checkValidity()) {
        form.reportValidity();
        say("Please fill in the required fields so we can reach you.", "error");
        return;
      }

      var d = data();
      var summary =
        "Name: " + (d.name || "") + "\n" +
        "Phone: " + (d.phone || "") + "\n" +
        "Email: " + (d.email || "") + "\n" +
        "Service: " + (d.service || "Not specified") + "\n" +
        "Location: " + (d.location || "Not specified") + "\n" +
        "Budget: " + (d.budget || "Not specified") + "\n\n" +
        (d.message || "");

      // No endpoint configured -> hand the enquiry to WhatsApp (always available),
      // or to e-mail first if an address has been configured.
      if (!CFG.formEndpoint) {
        var message = "Hello " + (CFG.name || "") + ", I'd like to discuss a project.\n\n" + summary;
        var wa = "https://wa.me/" + CFG.whatsapp + "?text=" + encodeURIComponent(message);
        var win = window.open(wa, "_blank", "noopener");
        if (win) {
          say("Opening WhatsApp with your enquiry ready to send. If it does not open, call us on " + (CFG.phone || "the number on the contact page") + ".", "ok");
        } else {
          say("Please call or WhatsApp us on " + (CFG.phone || "the number on the contact page") + " — your details are ready to paste.", "ok");
        }
        return;
      }

      if (submit) { submit.disabled = true; submit.innerHTML = "Sending…"; }

      fetch(CFG.formEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(Object.assign({ _subject: "Website enquiry — " + (d.name || "") }, d))
      })
        .then(function (r) {
          if (!r.ok) throw new Error("Bad response " + r.status);
          form.reset();
          say("Thank you — your enquiry has reached us. We usually reply within one working day.", "ok");
        })
        .catch(function () {
          say("Sorry, the message could not be sent. Please call or WhatsApp us instead — the details are on the contact page.", "error");
        })
        .finally(function () {
          if (submit) { submit.disabled = false; submit.innerHTML = original; }
        });
    });
  }

  /* ---------- 7. Footer / misc ---------- */
  function initMisc() {
    // current year in any [data-year]
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });

    // Discreet staff-gateway link. The vault is a separate private host; this
    // is the only public pointer to it, and it is intentionally not in the nav.
    if (CFG.staffPortal) {
      document.querySelectorAll(".footer-bottom").forEach(function (bottom) {
        if (bottom.querySelector("[data-staff-portal]")) return;
        var holder = bottom.lastElementChild || bottom;
        var link = document.createElement("a");
        link.href = CFG.staffPortal;
        link.textContent = "Staff sign-in";
        link.setAttribute("data-staff-portal", "");
        link.setAttribute("rel", "noopener");
        holder.appendChild(document.createTextNode(" · "));
        holder.appendChild(link);
      });
    }

    // mark active nav item based on file name
    var file = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav a[href]:not(.btn)").forEach(function (a) {
      var href = a.getAttribute("href");
      if (href === file || (file === "" && href === "index.html")) a.setAttribute("aria-current", "page");
    });
  }

  function boot() {
    window.AGAM_READY = true;
    // Used by site-data.js once live Firebase content arrives.
    window.AGAM_applyConfig = applyConfig;
    window.AGAM_refreshReveal = initReveal;
    applyConfig();
    initHeader();
    initNav();
    initReveal();
    initFilters();
    initHeroView();
    initLightbox();
    initFaq();
    initTocSpy();
    initToTop();
    initMobileBar();
    initParallax();
    initForm();
    initSpotlight();
    initMisc();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
