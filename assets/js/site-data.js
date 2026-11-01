/* ==========================================================================
   AGAM — live website data
   --------------------------------------------------------------------------
   Reads the admin's saved settings and published projects from Firestore and
   feeds them into the same markup the static site already uses. If Firebase
   is not configured, unreachable, or has no published projects, every page
   keeps its built-in content — nothing breaks.

   Load order on each page:
     config.js  →  firebase-config.js  →  site-data.js  →  main.js
   ========================================================================== */
(function () {
  "use strict";

  var CFG = window.AGAM || {};
  var FB = window.AGAM_FIREBASE || {};
  var VERSION = "10.12.2";

  var CATEGORY_LABEL = {
    office: "Workplace",
    residential: "Residential",
    furniture: "Furniture",
    renovation: "Renovation"
  };
  var CATEGORY_TAG = {
    office: "office",
    residential: "residential",
    furniture: "furniture",
    renovation: "renovation"
  };
  var PLACEHOLDER = {
    office: "assets/img/project-7.svg",
    residential: "assets/img/project-1.svg",
    furniture: "assets/img/project-5.svg",
    renovation: "assets/img/project-6.svg"
  };

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function digits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function telHref(phone) {
    var raw = String(phone || "").trim();
    var clean = raw.replace(/[^\d+]/g, "");
    if (!clean) return "";
    if (clean.charAt(0) !== "+") clean = "+" + clean.replace(/\+/g, "");
    return "tel:" + clean;
  }

  function normalizeHours(hours) {
    if (!Array.isArray(hours)) return null;
    var rows = hours
      .filter(function (row) { return Array.isArray(row) && (row[0] || row[1]); })
      .map(function (row) { return [String(row[0] || ""), String(row[1] || "")]; });
    return rows.length ? rows : null;
  }

  function toDate(value) {
    if (!value) return null;
    if (typeof value.toDate === "function") return value.toDate();
    if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
    if (typeof value === "string" || typeof value === "number") {
      var d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  /* ---------- Settings → window.AGAM ---------- */

  function applySettings(data) {
    if (!data) return;

    if (data.phone) CFG.phone = String(data.phone);
    if (CFG.phone) CFG.phoneHref = telHref(CFG.phone) || CFG.phoneHref;
    if (data.whatsapp) CFG.whatsapp = digits(data.whatsapp);
    if (data.email) CFG.email = String(data.email);

    if (data.address) {
      CFG.address = CFG.address || {};
      ["line1", "line2", "mapQuery", "mapLat", "mapLng", "mapZoom"].forEach(function (key) {
        if (data.address[key] != null && data.address[key] !== "") {
          CFG.address[key] = data.address[key];
        }
      });
    }

    var hours = normalizeHours(data.hours);
    if (hours) CFG.hours = hours;

    if (data.social) {
      CFG.social = CFG.social || {};
      ["instagram", "facebook", "linkedin", "youtube"].forEach(function (key) {
        if (data.social[key] != null) CFG.social[key] = data.social[key];
      });
    }

    window.AGAM = CFG;
    if (typeof window.AGAM_applyConfig === "function") window.AGAM_applyConfig();
  }

  /* ---------- Projects → grids ---------- */

  function projectImage(project) {
    var url = project.imageUrl || "";
    if (url) return url;
    return PLACEHOLDER[project.category] || PLACEHOLDER.office;
  }

  function projectMeta(project) {
    if (project.imageUrl && project.location) return project.location;
    var label = CATEGORY_LABEL[project.category] || "Project";
    if (!project.imageUrl) return label + " · concept";
    return project.location || label;
  }

  function projectAlt(project) {
    if (!project.imageUrl) {
      return "Concept study: " + (project.title || "interior project");
    }
    return (project.title || "Agam project") + (project.location ? ", " + project.location : "");
  }

  function cardHTML(project, index, opts) {
    var tag = CATEGORY_TAG[project.category] || "office";
    var title = project.title || "Untitled project";
    var href = opts.lightbox
      ? projectImage(project)
      : "projects.html" + (project.category === "office" ? "#workplace" : "");

    var attrs = [
      'class="project reveal"',
      index ? 'data-delay="' + Math.min(index * 60, 360) + '"' : "",
      'href="' + esc(href) + '"',
      'data-tags="' + esc(tag) + '"',
      'data-title="' + esc(title) + '"',
      'data-meta="' + esc(projectMeta(project)) + '"'
    ];
    if (opts.lightbox) attrs.push("data-lightbox-item");

    return "<a " + attrs.filter(Boolean).join(" ") + ">" +
      '<img src="' + esc(projectImage(project)) + '" alt="' + esc(projectAlt(project)) +
      '" width="800" height="1000" loading="lazy">' +
      '<span class="project__meta"><small>' + esc(projectMeta(project)) + "</small>" +
      "<strong>" + esc(title) + "</strong></span>" +
      "</a>";
  }

  function sorted(list) {
    return list.slice().sort(function (a, b) {
      var ao = Number(a.order);
      var bo = Number(b.order);
      ao = isNaN(ao) ? 999 : ao;
      bo = isNaN(bo) ? 999 : bo;
      if (ao !== bo) return ao - bo;
      var ad = toDate(a.updatedAt) || toDate(a.createdAt) || 0;
      var bd = toDate(b.updatedAt) || toDate(b.createdAt) || 0;
      return bd - ad;
    });
  }

  function renderGrid(selector, projects, opts) {
    var grid = document.querySelector(selector);
    if (!grid) return false;

    var list = sorted(projects);
    if (opts.featuredOnly) {
      var featured = list.filter(function (p) { return p.featured; });
      list = (featured.length ? featured : list).slice(0, opts.limit || 3);
    }

    if (!list.length) return false;

    grid.innerHTML = list.map(function (p, i) { return cardHTML(p, i, opts); }).join("");
    grid.setAttribute("data-live", "true");

    if (typeof window.AGAM_refreshReveal === "function") window.AGAM_refreshReveal();
    return true;
  }

  function renderProjects(projects) {
    var published = (projects || []).filter(function (p) {
      return p && p.published !== false;
    });
    if (!published.length) return;

    var changed = false;
    changed = renderGrid("[data-project-grid]", published, { lightbox: true }) || changed;
    changed = renderGrid("[data-featured-grid]", published, {
      lightbox: false,
      featuredOnly: true,
      limit: 3
    }) || changed;

    if (changed) {
      document.dispatchEvent(new CustomEvent("agam:projects-changed"));
    }
  }

  /* ---------- Firebase ---------- */

  function configured() {
    return !!FB.enabled && !!FB.apiKey && !!FB.projectId;
  }

  async function start() {
    if (!configured()) return;

    var appMod, fsMod;
    try {
      appMod = await import("https://www.gstatic.com/firebasejs/" + VERSION + "/firebase-app.js");
      fsMod = await import("https://www.gstatic.com/firebasejs/" + VERSION + "/firebase-firestore.js");
    } catch (err) {
      console.warn("Agam: Firebase could not load; showing built-in content.", err);
      return;
    }

    var app;
    try {
      app = appMod.getApps && appMod.getApps().length
        ? appMod.getApps()[0]
        : appMod.initializeApp({
            apiKey: FB.apiKey,
            authDomain: FB.authDomain,
            projectId: FB.projectId,
            storageBucket: FB.storageBucket,
            messagingSenderId: FB.messagingSenderId,
            appId: FB.appId
          });
    } catch (err) {
      console.warn("Agam: Firebase config rejected; showing built-in content.", err);
      return;
    }

    var db = fsMod.getFirestore(app);

    fsMod.onSnapshot(
      fsMod.doc(db, "settings", "site"),
      function (snap) {
        if (snap.exists()) applySettings(snap.data());
      },
      function (err) { console.warn("Agam: website settings unavailable.", err); }
    );

    var publishedQuery = fsMod.query(
      fsMod.collection(db, "projects"),
      fsMod.where("published", "==", true)
    );

    fsMod.onSnapshot(
      publishedQuery,
      function (snap) {
        renderProjects(snap.docs.map(function (d) {
          return Object.assign({ id: d.id }, d.data());
        }));
      },
      function (err) { console.warn("Agam: published projects unavailable.", err); }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
