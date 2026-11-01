/* ==========================================================================
   AGAM STUDIO — admin application
   --------------------------------------------------------------------------
   Vanilla ES module. Firebase SDK is only loaded when firebase-config.js is
   filled in; on localhost the app runs against a localStorage demo backend so
   the whole workflow can be tested before going live.
   ========================================================================== */

const CFG = window.AGAM_FIREBASE || {};
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

const STAGES = [
  ["enquiry", "Enquiry"],
  ["survey", "Survey"],
  ["design", "Design"],
  ["approval", "Approval"],
  ["execution", "Execution"],
  ["handover", "Handover"],
  ["closed", "Closed"]
];
const STAGE_LABEL = Object.fromEntries(STAGES);
const STAGE_POINTS = {
  enquiry: 5,
  survey: 15,
  design: 30,
  approval: 45,
  execution: 65,
  handover: 90,
  closed: 100
};
const CATEGORY_LABEL = {
  office: "Workplace",
  residential: "Residential",
  furniture: "Furniture",
  renovation: "Renovation"
};
const VIEW_META = {
  overview: ["Overview", "Everything happening across the studio."],
  projects: ["Projects", "Move each job through the cycle and keep the record current."],
  files: ["Files", "Private drawings, quotes and site records for the office team."],
  site: ["Website", "Contact details, location and social links shown to the public."],
  team: ["Team", "Approve office accounts and control what each person can change."]
};

const state = {
  backend: null,
  mode: "firebase",
  user: null,
  profile: null,
  settings: null,
  projects: [],
  files: [],
  users: [],
  updates: {},
  selectedId: null,
  view: "overview",
  started: false,
  siteFilled: false,
  siteDirty: false,
  projectSearch: "",
  stageFilter: "all",
  fileSearch: "",
  fileProject: "all",
  uploadQueue: [],
  updatesUnsub: null,
  installPrompt: null
};

let subs = [];
let lastFocus = null;

/* ==========================================================================
   Small helpers
   ========================================================================== */
function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  return null;
}

function fmtDate(value) {
  const d = toDate(value);
  if (!d) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function relTime(value) {
  const d = toDate(value);
  if (!d) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + " min ago";
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours + (hours === 1 ? " hour ago" : " hours ago");
  const days = Math.round(hours / 24);
  if (days < 30) return days + (days === 1 ? " day ago" : " days ago");
  return fmtDate(d);
}

function bytes(n) {
  if (!n && n !== 0) return "—";
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + " KB";
  return (n / (1024 * 1024)).toFixed(1) + " MB";
}

function initials(name, email) {
  const source = (name || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  return ((parts[0] || "?")[0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function imgSrc(url) {
  if (!url) return "../assets/img/project-7.svg";
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  if (url.startsWith("assets/")) return "../" + url;
  return url;
}

function isImage(file) {
  return /^image\//.test((file && file.contentType) || "");
}

function roleLabel(role) {
  return role === "admin" ? "Admin" : role === "editor" ? "Office staff" : "Viewer";
}

function canEdit() {
  return !!state.profile && state.profile.status === "approved" &&
    ["admin", "editor"].includes(state.profile.role);
}
function isAdmin() {
  return !!state.profile && state.profile.status === "approved" && state.profile.role === "admin";
}

function stagePill(stage) {
  const s = stage || "enquiry";
  return `<span class="pill stage-${esc(s)}">${esc(STAGE_LABEL[s] || s)}</span>`;
}

function statusPill(status) {
  if (status === "approved") return '<span class="pill pill--ok">Approved</span>';
  if (status === "pending") return '<span class="pill pill--warn">Pending</span>';
  return '<span class="pill pill--danger">Paused</span>';
}

function toast(message, kind) {
  const wrap = $("#toasts");
  if (!wrap) return;
  const el = document.createElement("div");
  el.className = "toast" + (kind === "error" ? " toast--error" : "");
  el.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    (kind === "error"
      ? '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>'
      : '<path d="m5 13 4 4L19 7"/>') +
    "</svg><span></span>";
  $("span", el).textContent = message;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
    el.style.transition = "opacity .25s ease, transform .25s ease";
    setTimeout(() => el.remove(), 260);
  }, 4200);
}

async function act(fn, okMessage) {
  try {
    await fn();
    if (okMessage) toast(okMessage);
  } catch (err) {
    console.error(err);
    toast((err && err.message) || "Something went wrong. Please try again.", "error");
  }
}

/* ==========================================================================
   Gates / views
   ========================================================================== */
function showOnly(id) {
  ["boot", "gate-signin", "gate-setup", "gate-pending", "gate-blocked", "app"].forEach((key) => {
    const el = document.getElementById(key);
    if (el) el.hidden = key !== id;
  });
  document.body.classList.toggle("gate-mode", id !== "app");
}

function gate(name) {
  showOnly(
    name === "signin" ? "gate-signin"
      : name === "setup" ? "gate-setup"
      : name === "pending" ? "gate-pending"
      : name === "blocked" ? "gate-blocked"
      : "app"
  );
}

function setView(name) {
  if (!VIEW_META[name]) name = "overview";
  state.view = name;
  $$(".view").forEach((v) => { v.hidden = v.dataset.view !== name; });
  $$(".navitem").forEach((b) => b.classList.toggle("is-active", b.dataset.view === name));
  const meta = VIEW_META[name];
  $("#view-title").textContent = meta[0];
  $("#view-sub").textContent = meta[1];
  document.body.classList.remove("nav-open");
  $("#menu-toggle").setAttribute("aria-expanded", "false");
  renderView();
}

function renderView() {
  if (!state.profile) return;
  renderBadges();
  if (state.view === "overview") renderOverview();
  if (state.view === "projects") { renderProjectList(); renderProjectDetail(); }
  if (state.view === "files") renderFiles();
  if (state.view === "site") renderSiteForm();
  if (state.view === "team") renderTeam();
}

function renderAll() {
  renderRailUser();
  renderBadges();
  renderView();
  populateProjectSelects();
}

function renderRailUser() {
  const p = state.profile || {};
  const name = p.name || (state.user && state.user.name) || "Team member";
  $("#rail-name").textContent = name;
  $("#rail-role").textContent = roleLabel(p.role);
  const avatar = $("#rail-avatar");
  if (p.photo || (state.user && state.user.photo)) {
    avatar.src = p.photo || state.user.photo;
    avatar.style.display = "";
  } else {
    avatar.removeAttribute("src");
    avatar.style.display = "none";
  }
}

function renderBadges() {
  const pending = state.users.filter((u) => u.status === "pending").length;
  const projects = state.projects.filter((p) => p.stage !== "closed").length;
  const files = state.files.length;

  const np = $("#nav-projects");
  np.textContent = projects;
  np.hidden = !projects;

  const nf = $("#nav-files");
  nf.textContent = files;
  nf.hidden = !files;

  const nq = $("#nav-pending");
  nq.textContent = pending;
  nq.hidden = !pending;
}

/* ==========================================================================
   Overview
   ========================================================================== */
function renderOverview() {
  const approved = state.users.filter((u) => u.status === "approved").length;
  const live = state.projects.filter((p) => p.published).length;
  const active = state.projects.filter((p) => !["handover", "closed"].includes(p.stage)).length;
  const pending = state.users.filter((u) => u.status === "pending").length;

  $("#overview-stats").innerHTML = [
    { label: "Projects", value: state.projects.length, note: "in the workspace" },
    { label: "Live on site", value: live, note: "published to the website", accent: true },
    { label: "In progress", value: active, note: "enquiry to execution" },
    { label: "Pending access", value: pending, note: pending ? "waiting for approval" : "no requests waiting" }
  ].map((s) => `
    <div class="stat${s.accent ? " stat--accent" : ""}">
      <span>${esc(s.label)}</span>
      <strong>${s.value}</strong>
      <small>${esc(s.note)}</small>
    </div>`).join("");

  const total = state.projects.length || 1;
  $("#overview-pipeline").innerHTML = STAGES.map(([key, label]) => {
    const count = state.projects.filter((p) => (p.stage || "enquiry") === key).length;
    const width = Math.round((count / total) * 100);
    return `<div class="pipe">
      <span class="pipe__label">${esc(label)}</span>
      <span class="pipe__bar"><i style="width:${width}%"></i></span>
      <span class="pipe__n">${count}</span>
    </div>`;
  }).join("");

  const recent = state.projects
    .slice()
    .sort((a, b) => (toDate(b.updatedAt) || 0) - (toDate(a.updatedAt) || 0))
    .slice(0, 5);

  $("#overview-feed").innerHTML = recent.length
    ? recent.map((p) => `<li>
        <span class="feed__dot">${esc(initials(p.title))}</span>
        <div class="feed__body">
          <p><strong>${esc(p.title)}</strong> moved to ${esc(STAGE_LABEL[p.stage] || p.stage || "Enquiry")}.</p>
          <span>${esc(p.client || "No client set")} · ${esc(relTime(p.updatedAt) || "not yet updated")}</span>
        </div>
      </li>`).join("")
    : '<li class="feed__empty">No project activity yet. Add your first project to start the record.</li>';

  const approvals = $("#overview-approvals");
  if (pending) {
    approvals.innerHTML = `
      <div class="panel__head">
        <div><h2>Waiting for you</h2><p>${pending} office ${pending === 1 ? "account needs" : "accounts need"} approval.</p></div>
      </div>
      ${state.users.filter((u) => u.status === "pending").slice(0, 4).map((u) => `
        <div class="approval">
          <span class="avatar">${esc(initials(u.name, u.email))}</span>
          <div><b>${esc(u.name || u.email)}</b><span>${esc(u.email)}</span></div>
          <div class="approval__actions">
            ${isAdmin()
              ? `<button class="btn btn--xs" type="button" data-approve="${esc(u.id)}">Approve</button>`
              : '<span class="pill">Admin only</span>'}
          </div>
        </div>`).join("")}
      <button class="btn btn--sm btn--ghost" type="button" data-goto="team" style="margin-top:.6rem">Open team →</button>`;
  } else {
    approvals.innerHTML = `
      <div class="panel__head"><div><h2>Team access</h2><p>No requests waiting.</p></div></div>
      <div class="empty-inline">${approved} approved ${approved === 1 ? "account" : "accounts"}. New sign-ins appear here for approval.</div>
      <button class="btn btn--sm btn--ghost" type="button" data-goto="team" style="margin-top:.6rem">Manage team →</button>`;
  }
}

/* ==========================================================================
   Projects — list
   ========================================================================== */
function projectMatches(p) {
  if (state.stageFilter !== "all" && (p.stage || "enquiry") !== state.stageFilter) return false;
  const q = state.projectSearch.trim().toLowerCase();
  if (!q) return true;
  return [p.title, p.client, p.location, p.description, p.category]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase().includes(q));
}

function sortedProjects() {
  return state.projects.slice().sort((a, b) => {
    const ao = Number(a.order || 999);
    const bo = Number(b.order || 999);
    if (ao !== bo) return ao - bo;
    return (toDate(b.updatedAt) || 0) - (toDate(a.updatedAt) || 0);
  });
}

function renderProjectList() {
  const list = $("#project-list");
  if (!list) return;
  const items = sortedProjects().filter(projectMatches);

  if (!state.projects.length) {
    list.innerHTML = `<div class="empty" style="min-height:220px">
      <h3>No projects yet</h3><p>Add the first fit-out or home to start the cycle.</p>
    </div>`;
    return;
  }
  if (!items.length) {
    list.innerHTML = '<div class="empty-inline">No projects match this search.</div>';
    return;
  }

  list.innerHTML = items.map((p) => `
    <button type="button" class="pcard${p.id === state.selectedId ? " is-active" : ""}" data-project="${esc(p.id)}">
      <img src="${esc(imgSrc(p.imageUrl))}" alt="" loading="lazy">
      <span class="pcard__body">
        <strong>${esc(p.title || "Untitled project")}</strong>
        <span>${esc(CATEGORY_LABEL[p.category] || p.category || "Project")} · ${esc(p.client || p.location || "No client")}</span>
        <span class="pcard__meta">
          ${stagePill(p.stage)}
          <span class="progress"><i style="width:${Math.max(0, Math.min(100, Number(p.progress) || 0))}%"></i></span>
        </span>
      </span>
    </button>`).join("");
}

/* ==========================================================================
   Projects — detail
   ========================================================================== */
function selectedProject() {
  return state.projects.find((p) => p.id === state.selectedId) || null;
}

function renderProjectDetail() {
  const box = $("#project-detail");
  if (!box) return;
  const p = selectedProject();

  if (!p) {
    box.innerHTML = `<div class="empty">
      <span class="empty__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/></svg></span>
      <h3>Select a project</h3><p>Choose a project to see its cycle, notes and files.</p>
    </div>`;
    return;
  }

  const updates = state.updates[p.id] || [];
  const linked = state.files.filter((f) => f.projectId === p.id);
  const stageIndex = STAGES.findIndex(([k]) => k === (p.stage || "enquiry"));

  box.innerHTML = `<div class="detail">
    <div class="detail__head">
      <div>
        <h2>${esc(p.title || "Untitled project")}</h2>
        <p>${esc(CATEGORY_LABEL[p.category] || p.category || "Project")} · ${esc(p.client || "No client")} · ${esc(p.location || "No location")}</p>
      </div>
      <div class="detail__actions">
        ${canEdit() ? `<button class="btn btn--sm btn--ghost" type="button" data-edit-project="${esc(p.id)}">Edit</button>` : ""}
        ${isAdmin() ? `<button class="btn btn--sm btn--ghost" type="button" data-delete-project="${esc(p.id)}" style="color:var(--red);border-color:rgba(163,58,44,.3)">Delete</button>` : ""}
      </div>
    </div>

    <img class="detail__img" src="${esc(imgSrc(p.imageUrl))}" alt="">

    <p class="detail__desc">${esc(p.description || "No description yet.")}</p>

    <div class="detail__meta">
      <div><span>Stage</span><b>${esc(STAGE_LABEL[p.stage] || "Enquiry")}</b></div>
      <div><span>Progress</span><b>${Math.max(0, Math.min(100, Number(p.progress) || 0))}%</b></div>
      <div><span>Started</span><b>${esc(fmtDate(p.startDate))}</b></div>
      <div><span>Target</span><b>${esc(fmtDate(p.targetDate))}</b></div>
    </div>

    <div>
      <div class="panel__head" style="margin-bottom:.5rem">
        <div><h2 style="font-size:1.15rem">Project cycle</h2><p>${canEdit() ? "Click a stage to move the project." : "Current position in the cycle."}</p></div>
        ${p.published ? '<span class="pill pill--live"><i></i>On website</span>' : '<span class="pill pill--muted">Not published</span>'}
      </div>
      <div class="stepper">
        ${STAGES.map(([key, label], i) => `
          <button type="button" class="${i < stageIndex ? "done" : ""}${i === stageIndex ? " current" : ""}"
            data-set-stage="${esc(key)}" data-project-id="${esc(p.id)}"
            ${canEdit() ? "" : "disabled"} aria-label="Set stage to ${esc(label)}">
            <span>${esc(label)}</span>
          </button>`).join("")}
      </div>
    </div>

    <div>
      <div class="panel__head" style="margin-bottom:.4rem">
        <div><h2 style="font-size:1.15rem">Cycle notes</h2><p>${updates.length} ${updates.length === 1 ? "update" : "updates"} recorded.</p></div>
      </div>
      <div class="updates">
        ${updates.length
          ? updates.map((u) => `<div class="update">
              <span class="update__dot">${esc(initials(u.authorName || "A"))}</span>
              <div class="update__body">
                <p>${esc(u.text || "")}</p>
                <span>${esc(u.authorName || "Team")} · ${esc(relTime(u.createdAt))}${u.stage ? " · " + esc(STAGE_LABEL[u.stage] || u.stage) : ""}</span>
              </div>
            </div>`).join("")
          : '<div class="empty-inline">No notes yet. Add the first site or design update below.</div>'}
      </div>
      ${canEdit() ? `<form class="update-form" data-update-form="${esc(p.id)}">
        <textarea name="text" required maxlength="600" placeholder="What changed? e.g. Client approved the material board; joinery released to the workshop."></textarea>
        <div class="row">
          <select name="stage" aria-label="Stage for this note">
            ${STAGES.map(([k, l]) => `<option value="${esc(k)}"${k === (p.stage || "enquiry") ? " selected" : ""}>${esc(l)}</option>`).join("")}
          </select>
          <button class="btn btn--sm" type="submit">Add note</button>
        </div>
      </form>` : ""}
    </div>

    ${linked.length ? `<div>
      <div class="panel__head" style="margin-bottom:.3rem"><div><h2 style="font-size:1.15rem">Files</h2><p>${linked.length} linked to this project.</p></div></div>
      <div class="detail__files">
        ${linked.map((f) => `<a href="${esc(f.url)}" target="_blank" rel="noopener">📎 ${esc(f.name)} <small style="color:var(--ink-faint)">· ${esc(bytes(f.size))}</small></a>`).join("")}
      </div>
    </div>` : ""}
  </div>`;
}

function selectProject(id) {
  state.selectedId = id;
  if (state.updatesUnsub) {
    state.updatesUnsub();
    state.updatesUnsub = null;
  }
  renderProjectList();
  renderProjectDetail();

  if (!id || !state.backend) return;
  state.updatesUnsub = state.backend.subscribeUpdates(id, (list) => {
    state.updates[id] = list;
    if (state.selectedId === id) renderProjectDetail();
  });
}

/* ==========================================================================
   Project editor modal
   ========================================================================== */
function openProjectModal(project) {
  const isNew = !project;
  const p = project || {
    title: "",
    category: "office",
    location: "",
    client: "",
    description: "",
    stage: "enquiry",
    progress: 5,
    startDate: "",
    targetDate: "",
    imageUrl: "",
    published: false,
    featured: false,
    order: state.projects.length + 1
  };

  lastFocus = document.activeElement;
  $("#modal-body").innerHTML = `
    <h2 id="modal-title">${isNew ? "Add a project" : "Edit project"}</h2>
    <p class="modal__lead">${isNew ? "Start the record, then move it through the cycle as work progresses." : "Changes publish to the website when the project is published."}</p>

    <form class="modal-form" id="project-form">
      <label class="field">
        <span>Project title *</span>
        <input type="text" name="title" required maxlength="90" value="${esc(p.title)}" placeholder="e.g. Open-plan workstations, Guindy">
      </label>

      <div class="field-row">
        <label class="field">
          <span>Type</span>
          <select name="category">
            ${Object.entries(CATEGORY_LABEL).map(([k, v]) => `<option value="${k}"${p.category === k ? " selected" : ""}>${v}</option>`).join("")}
          </select>
        </label>
        <label class="field">
          <span>Client / reference</span>
          <input type="text" name="client" maxlength="90" value="${esc(p.client || "")}" placeholder="Client name or internal code">
        </label>
      </div>

      <div class="field-row">
        <label class="field">
          <span>Location label</span>
          <input type="text" name="location" maxlength="60" value="${esc(p.location || "")}" placeholder="Workplace · concept">
        </label>
        <label class="field">
          <span>Stage</span>
          <select name="stage">
            ${STAGES.map(([k, l]) => `<option value="${k}"${(p.stage || "enquiry") === k ? " selected" : ""}>${l}</option>`).join("")}
          </select>
        </label>
      </div>

      <div class="field-row field-row--3">
        <label class="field">
          <span>Progress %</span>
          <input type="number" name="progress" min="0" max="100" step="5" value="${Number(p.progress) || 0}">
        </label>
        <label class="field">
          <span>Started</span>
          <input type="date" name="startDate" value="${esc(p.startDate || "")}">
        </label>
        <label class="field">
          <span>Target handover</span>
          <input type="date" name="targetDate" value="${esc(p.targetDate || "")}">
        </label>
      </div>

      <label class="field">
        <span>Description</span>
        <textarea name="description" rows="3" maxlength="600" placeholder="Scope, seat count, materials, constraints…">${esc(p.description || "")}</textarea>
      </label>

      <div class="field">
        <span>Cover image</span>
        <div class="img-pick">
          <img id="project-image-preview" src="${esc(imgSrc(p.imageUrl))}" alt="">
          <div class="img-pick__body">
            <input type="file" id="project-image-file" accept="image/*">
            <small id="project-image-status">${p.imageUrl ? "Current image shown. Choose a new photo to replace it." : "No image yet — a concept study is used until you upload one."}</small>
            <input type="hidden" name="imageUrl" value="${esc(p.imageUrl || "")}">
          </div>
        </div>
      </div>

      <div class="field-row">
        <label class="field">
          <span>Order on website</span>
          <input type="number" name="order" min="1" max="99" step="1" value="${Number(p.order) || 1}">
        </label>
        <div class="field">
          <span>Visibility</span>
          <label class="toggle"><input type="checkbox" name="published" ${p.published ? "checked" : ""}> Published on the website</label>
          <label class="toggle"><input type="checkbox" name="featured" ${p.featured ? "checked" : ""}> Feature on the home page</label>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn" type="submit">${isNew ? "Create project" : "Save changes"}</button>
        <button class="btn btn--ghost" type="button" data-modal-close>Cancel</button>
        <span class="spacer"></span>
        ${!isNew && isAdmin() ? `<button class="btn btn--ghost" type="button" data-delete-project="${esc(p.id)}" style="color:var(--red);border-color:rgba(163,58,44,.3)">Delete</button>` : ""}
      </div>
    </form>`;

  openModal();

  const form = $("#project-form");
  const fileInput = $("#project-image-file");
  const status = $("#project-image-status");
  const preview = $("#project-image-preview");

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    status.textContent = "Uploading… 0%";
    await act(async () => {
      const url = await state.backend.uploadProjectImage(file, (pct) => {
        status.textContent = "Uploading… " + pct + "%";
      });
      $('input[name="imageUrl"]', form).value = url;
      preview.src = url;
      status.textContent = "Image uploaded. Save the project to publish it.";
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const payload = {
      title: String(data.title || "").trim(),
      category: data.category,
      client: String(data.client || "").trim(),
      location: String(data.location || "").trim(),
      stage: data.stage,
      progress: Math.max(0, Math.min(100, Number(data.progress) || 0)),
      startDate: data.startDate || "",
      targetDate: data.targetDate || "",
      description: String(data.description || "").trim(),
      imageUrl: data.imageUrl || "",
      order: Number(data.order) || 1,
      published: data.published === "on",
      featured: data.featured === "on"
    };
    if (!payload.title) { toast("Give the project a title.", "error"); return; }

    await act(async () => {
      const id = await state.backend.saveProject(Object.assign({ id: p.id }, payload));
      closeModal();
      if (id) selectProject(id);
      toast(isNew ? "Project created." : "Project updated.");
    });
  });
}

/* ==========================================================================
   Delete confirm
   ========================================================================== */
function confirmDeleteProject(id) {
  const p = state.projects.find((x) => x.id === id);
  if (!p) return;
  lastFocus = document.activeElement;
  $("#modal-body").innerHTML = `
    <h2 id="modal-title">Delete this project?</h2>
    <p class="modal__lead"><strong>${esc(p.title)}</strong> and its cycle notes will be removed. Uploaded files stay in the library.</p>
    <p class="danger-note">This cannot be undone.</p>
    <div class="modal-actions">
      <button class="btn btn--danger" type="button" id="confirm-delete">Delete project</button>
      <button class="btn btn--ghost" type="button" data-modal-close>Keep it</button>
    </div>`;
  openModal();

  $("#confirm-delete").addEventListener("click", async () => {
    await act(async () => {
      await state.backend.deleteProject(id);
      if (state.selectedId === id) selectProject(null);
      closeModal();
      toast("Project deleted.");
    });
  });
}

/* ==========================================================================
   Files
   ========================================================================== */
function populateProjectSelects() {
  const options = sortedProjects()
    .map((p) => `<option value="${esc(p.id)}">${esc(p.title)}</option>`)
    .join("");

  const up = $("#upload-project");
  if (up) up.innerHTML = '<option value="">No project</option>' + options;

  const filter = $("#file-project-filter");
  if (filter) {
    const current = state.fileProject;
    filter.innerHTML = '<option value="all">All projects</option><option value="">Unlinked</option>' + options;
    filter.value = current;
  }
}

function renderFiles() {
  const count = $("#file-count");
  const list = $("#file-list");
  if (!list) return;

  const files = state.files
    .filter((f) => {
      if (state.fileProject !== "all" && (f.projectId || "") !== state.fileProject) return false;
      const q = state.fileSearch.trim().toLowerCase();
      if (!q) return true;
      return [f.name, f.note, f.uploadedByName, f.projectId]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });

  count.textContent = state.files.length + (state.files.length === 1 ? " file" : " files");

  if (!files.length) {
    list.innerHTML = `<div class="files__empty">${state.files.length ? "No files match this filter." : "No files yet. Upload the first drawing or quote."}</div>`;
    return;
  }

  const byId = Object.fromEntries(state.projects.map((p) => [p.id, p]));
  list.innerHTML = files.map((f) => {
    const project = f.projectId ? byId[f.projectId] : null;
    const canDelete = isAdmin() || (canEdit() && f.uploadedBy === (state.user && state.user.uid));
    return `<div class="file-row">
      <span class="file-row__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          ${isImage(f) ? '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m4 17 5-5 4 4 3-3 4 4"/>' : '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>'}
        </svg>
      </span>
      <span class="file-row__body">
        <a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.name)}</a>
        <span>${esc(project ? project.title : "Unlinked")} · ${esc(f.uploadedByName || "Team")} · ${esc(relTime(f.uploadedAt))}${f.note ? " · " + esc(f.note) : ""}</span>
      </span>
      <span class="file-row__size">${esc(bytes(f.size))}</span>
      ${canDelete
        ? `<button class="icon-btn" type="button" data-delete-file="${esc(f.id)}" title="Delete file" aria-label="Delete ${esc(f.name)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>
          </button>`
        : '<span></span>'}
    </div>`;
  }).join("");
}

function renderUploadQueue() {
  const wrap = $("#upload-queue");
  const hint = $("#upload-hint");
  const submit = $("#upload-submit");
  const files = state.uploadQueue;

  submit.disabled = !files.length;
  wrap.hidden = !files.length;
  hint.textContent = files.length
    ? files.length + (files.length === 1 ? " file ready" : " files ready")
    : "No files selected.";

  wrap.innerHTML = files.map((f, i) => `
    <div class="queue-item">
      <span>${esc(f.name)}</span>
      <em>${esc(bytes(f.size))}</em>
      <span class="progress"><i data-progress="${i}" style="width:0%"></i></span>
    </div>`).join("");
}

async function handleUpload(event) {
  event.preventDefault();
  if (!canEdit()) { toast("Your role is read-only.", "error"); return; }
  const files = state.uploadQueue.slice();
  if (!files.length) return;

  const projectId = $("#upload-project").value || "";
  const note = $("#upload-note").value.trim();
  const submit = $("#upload-submit");
  submit.disabled = true;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const bar = $(`[data-progress="${i}"]`);
    await act(async () => {
      await state.backend.uploadFile(file, { projectId, note }, (pct) => {
        if (bar) bar.style.width = pct + "%";
      });
    });
  }

  state.uploadQueue = [];
  $("#file-input").value = "";
  $("#upload-note").value = "";
  renderUploadQueue();
  toast(files.length + (files.length === 1 ? " file uploaded." : " files uploaded."));
}

/* ==========================================================================
   Team
   ========================================================================== */
function renderTeam() {
  const pending = state.users.filter((u) => u.status === "pending");
  $("#pending-count").textContent = pending.length + (pending.length === 1 ? " waiting" : " waiting");

  const pendingBox = $("#pending-list");
  pendingBox.innerHTML = pending.length
    ? pending.map((u) => `
      <div class="approval">
        <span class="avatar">${esc(initials(u.name, u.email))}</span>
        <div><b>${esc(u.name || "Google account")}</b><span>${esc(u.email)} · requested ${esc(relTime(u.createdAt || u.requestedAt))}</span></div>
        <div class="approval__actions">
          ${isAdmin()
            ? `<select data-approve-role="${esc(u.id)}" aria-label="Role for ${esc(u.email)}">
                 <option value="viewer">Viewer</option>
                 <option value="editor">Office staff</option>
                 <option value="admin">Admin</option>
               </select>
               <button class="btn btn--xs" type="button" data-approve="${esc(u.id)}">Approve</button>
               <button class="btn btn--xs btn--ghost" type="button" data-remove-user="${esc(u.id)}">Decline</button>`
            : '<span class="pill">Admin only</span>'}
        </div>
      </div>`).join("")
    : '<div class="empty-inline">No pending requests. Share the admin link with the office team so they can sign in.</div>';

  const tbody = $("#team-list");
  const members = state.users.filter((u) => u.status !== "pending");
  const admin = isAdmin();
  const myId = state.user && state.user.uid;

  tbody.innerHTML = members.length
    ? members.map((u) => {
        const self = u.id === myId;
        return `<tr>
          <td><span class="who">
            ${u.photo ? `<img src="${esc(u.photo)}" alt="">` : `<span class="avatar">${esc(initials(u.name, u.email))}</span>`}
            <span><b>${esc(u.name || "Google account")}${self ? " (you)" : ""}</b><span>${esc(u.email)}</span></span>
          </span></td>
          <td>${admin && !self
            ? `<select data-role-for="${esc(u.id)}" aria-label="Role for ${esc(u.email)}">
                 <option value="viewer"${u.role === "viewer" ? " selected" : ""}>Viewer</option>
                 <option value="editor"${u.role === "editor" ? " selected" : ""}>Office staff</option>
                 <option value="admin"${u.role === "admin" ? " selected" : ""}>Admin</option>
               </select>`
            : `<span class="pill">${esc(roleLabel(u.role))}</span>`}</td>
          <td>${statusPill(u.status)}</td>
          <td><span style="font-size:.7rem;color:var(--ink-faint)">${esc(u.approvedBy || "—")}</span></td>
          <td class="ta-right"><span class="row-actions">
            ${admin && !self
              ? `${u.status === "approved"
                    ? `<button class="icon-btn" type="button" data-pause-user="${esc(u.id)}" title="Pause access">
                         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 5v14M15 5v14"/></svg>
                       </button>`
                    : `<button class="icon-btn" type="button" data-restore-user="${esc(u.id)}" title="Restore access">
                         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4L19 6"/></svg>
                       </button>`}
                   <button class="icon-btn" type="button" data-remove-user="${esc(u.id)}" title="Remove account">
                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>
                   </button>`
              : '<span class="pill pill--muted">—</span>'}
          </span></td>
        </tr>`;
      }).join("")
    : '<tr><td colspan="5"><div class="empty-inline">No approved team members yet.</div></td></tr>';
}

/* ==========================================================================
   Website settings
   ========================================================================== */
function mapEmbedUrl(s) {
  const address = s.address || {};
  const q = address.mapLat && address.mapLng
    ? address.mapLat + "," + address.mapLng
    : address.mapQuery || "Chennai";
  const zoom = address.mapZoom || 17;
  return "https://www.google.com/maps?q=" + encodeURIComponent(q) + "&z=" + zoom + "&output=embed";
}

function hoursRow(day, time) {
  return `<div class="hours__row">
    <input type="text" data-hour-day value="${esc(day || "")}" placeholder="Monday – Friday" aria-label="Days">
    <input type="text" data-hour-time value="${esc(time || "")}" placeholder="9:00 am – 7:00 pm" aria-label="Hours">
    <button class="icon-btn" type="button" data-remove-hour title="Remove row" aria-label="Remove row">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
    </button>
  </div>`;
}

function fillSiteForm() {
  const s = state.settings;
  if (!s) return;
  const a = s.address || {};
  const social = s.social || {};

  $("#set-phone").value = s.phone || "";
  $("#set-whatsapp").value = s.whatsapp || "";
  $("#set-email").value = s.email || "";
  $("#set-line1").value = a.line1 || "";
  $("#set-line2").value = a.line2 || "";
  $("#set-map-query").value = a.mapQuery || "";
  $("#set-map-lat").value = a.mapLat || "";
  $("#set-map-lng").value = a.mapLng || "";
  $("#set-map-zoom").value = a.mapZoom || 17;
  $("#set-instagram").value = social.instagram || "";
  $("#set-facebook").value = social.facebook || "";
  $("#set-linkedin").value = social.linkedin || "";
  $("#set-youtube").value = social.youtube || "";

  $("#hours-rows").innerHTML = (s.hours && s.hours.length ? s.hours : [["Monday – Friday", "9:00 am – 7:00 pm"]])
    .map((row) => hoursRow(row[0], row[1]))
    .join("");

  state.siteFilled = true;
  state.siteDirty = false;
  updateMapPreview();
  updateSiteState();
}

function readSiteForm() {
  const hours = $$("#hours-rows .hours__row").map((row) => [
    $("[data-hour-day]", row).value.trim(),
    $("[data-hour-time]", row).value.trim()
  ]).filter((row) => row[0] || row[1]);

  return {
    phone: $("#set-phone").value.trim(),
    whatsapp: $("#set-whatsapp").value.replace(/\D/g, ""),
    email: $("#set-email").value.trim(),
    address: {
      line1: $("#set-line1").value.trim(),
      line2: $("#set-line2").value.trim(),
      mapQuery: $("#set-map-query").value.trim(),
      mapLat: $("#set-map-lat").value.trim(),
      mapLng: $("#set-map-lng").value.trim(),
      mapZoom: Number($("#set-map-zoom").value) || 17
    },
    hours,
    social: {
      instagram: $("#set-instagram").value.trim(),
      facebook: $("#set-facebook").value.trim(),
      linkedin: $("#set-linkedin").value.trim(),
      youtube: $("#set-youtube").value.trim()
    }
  };
}

function updateMapPreview() {
  const s = readSiteForm();
  const frame = $("#map-preview");
  if (frame) frame.src = mapEmbedUrl(s);
  const q = s.address.mapQuery || (s.address.line1 + " " + s.address.line2);
  const link = $("#map-open");
  if (link) link.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
  const hint = $("#map-hint");
  if (hint) {
    hint.textContent = s.address.mapLat && s.address.mapLng
      ? "Pinned to your coordinates."
      : "Add latitude and longitude for an exact pin.";
  }
}

function updateSiteState() {
  const el = $("#site-state");
  if (!el) return;
  el.textContent = state.siteDirty ? "Unsaved changes" : "All changes saved";
  el.style.color = state.siteDirty ? "var(--brass-ink)" : "var(--ink-faint)";
  $("#site-form").classList.toggle("is-dirty", state.siteDirty);
}

function renderSiteForm() {
  if (!state.siteFilled) fillSiteForm();
  const locked = !isAdmin();
  $("#site-form").querySelectorAll("input, select, textarea, button").forEach((el) => {
    if (el.closest(".map-preview")) return;
    el.disabled = locked;
  });
  if (locked) {
    const stateEl = $("#site-state");
    if (stateEl) {
      stateEl.textContent = "Only an admin can change the public website.";
      stateEl.style.color = "var(--ink-faint)";
    }
  }
}

/* ==========================================================================
   Modal
   ========================================================================== */
function openModal() {
  const modal = $("#modal");
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  const focusable = modal.querySelector("input, select, textarea, button");
  if (focusable) setTimeout(() => focusable.focus(), 60);
}

function closeModal() {
  const modal = $("#modal");
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  document.body.style.overflow = "";
  $("#modal-body").innerHTML = "";
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

/* ==========================================================================
   Auth
   ========================================================================== */
function handleAuth(payload) {
  const { user, profile } = payload || {};
  state.user = user;
  state.profile = profile;

  if (!user) {
    stopSubscriptions();
    gate("signin");
    return;
  }

  if (!profile) {
    // Profile document is being created on first sign-in.
    gate("pending");
    $("#pending-email").textContent = user.email || "";
    return;
  }

  if (profile.status === "pending") {
    stopSubscriptions();
    $("#pending-email").textContent = user.email || "";
    gate("pending");
    return;
  }

  if (profile.status !== "approved") {
    stopSubscriptions();
    $("#blocked-email").textContent = user.email || "";
    gate("blocked");
    return;
  }

  if (!state.started) {
    gate("app");
    renderRailUser();
    startSubscriptions();
    setView("overview");
    registerServiceWorker();
  } else {
    renderRailUser();
    renderAll();
  }
}

function startSubscriptions() {
  if (state.started) return;
  state.started = true;

  subs.push(state.backend.subscribeSettings((data) => {
    const first = !state.settings;
    state.settings = data || {};
    if (first || (!state.siteDirty && state.view === "site")) {
      state.siteFilled = false;
      if (state.view === "site") fillSiteForm();
    }
  }));

  subs.push(state.backend.subscribeProjects((list) => {
    state.projects = list || [];
    if (state.selectedId && !state.projects.some((p) => p.id === state.selectedId)) {
      state.selectedId = null;
    }
    renderAll();
  }));

  subs.push(state.backend.subscribeFiles((list) => {
    state.files = list || [];
    renderAll();
  }));

  subs.push(state.backend.subscribeUsers((list) => {
    state.users = list || [];
    renderAll();
  }));
}

function stopSubscriptions() {
  subs.forEach((unsub) => { try { if (unsub) unsub(); } catch (err) { /* noop */ } });
  subs = [];
  if (state.updatesUnsub) { state.updatesUnsub(); state.updatesUnsub = null; }
  state.started = false;
  state.projects = [];
  state.files = [];
  state.users = [];
  state.settings = null;
  state.selectedId = null;
  state.siteFilled = false;
  state.siteDirty = false;
}

/* ==========================================================================
   PWA
   ========================================================================== */
function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  navigator.serviceWorker.register("sw.js", { scope: "./" }).catch((err) => {
    console.warn("Service worker not registered", err);
  });
}

function initInstallButton() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    state.installPrompt = e;
    $("#install-app").hidden = false;
  });
  $("#install-app").addEventListener("click", async () => {
    if (!state.installPrompt) return;
    state.installPrompt.prompt();
    await state.installPrompt.userChoice;
    state.installPrompt = null;
    $("#install-app").hidden = true;
  });
  window.addEventListener("appinstalled", () => { $("#install-app").hidden = true; });
}

/* ==========================================================================
   Static event wiring
   ========================================================================== */
function wireEvents() {
  $("#google-signin").addEventListener("click", async () => {
    const err = $("#signin-error");
    err.hidden = true;
    await act(async () => {
      await state.backend.signIn();
    });
  });

  $$("[data-demo-account]").forEach((btn) => {
    btn.addEventListener("click", () => {
      act(() => state.backend.signIn(btn.dataset.demoAccount));
    });
  });

  ["pending-signout", "blocked-signout"].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener("click", () => act(() => state.backend.signOut()));
  });

  $("#signout").addEventListener("click", () => act(() => state.backend.signOut()));

  $("#demo-reset").addEventListener("click", () => {
    if (state.backend && state.backend.resetDemo) {
      state.backend.resetDemo();
      location.reload();
    }
  });

  $$(".navitem").forEach((btn) => {
    btn.addEventListener("click", () => setView(btn.dataset.view));
  });

  $("#menu-toggle").addEventListener("click", () => {
    const open = document.body.classList.toggle("nav-open");
    $("#menu-toggle").setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("click", (e) => {
    const goto = e.target.closest("[data-goto]");
    if (goto) {
      setView(goto.dataset.goto);
      if (goto.hasAttribute("data-focus-upload")) {
        setTimeout(() => { const dz = $("#dropzone"); if (dz) dz.scrollIntoView({ block: "center" }); }, 200);
      }
    }
    if (e.target.closest("[data-modal-close]")) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  /* projects */
  $("#project-search").addEventListener("input", (e) => {
    state.projectSearch = e.target.value;
    renderProjectList();
  });
  $("#project-stage-filter").addEventListener("change", (e) => {
    state.stageFilter = e.target.value;
    renderProjectList();
  });

  document.addEventListener("click", (e) => {
    const newBtn = e.target.closest("[data-new-project]");
    if (newBtn) {
      if (!canEdit()) { toast("Your role is read-only.", "error"); return; }
      openProjectModal(null);
      return;
    }

    const card = e.target.closest("[data-project]");
    if (card && !e.target.closest("[data-edit-project]")) {
      selectProject(card.dataset.project);
      return;
    }

    const edit = e.target.closest("[data-edit-project]");
    if (edit) {
      const p = state.projects.find((x) => x.id === edit.dataset.editProject);
      if (p) openProjectModal(p);
      return;
    }

    const del = e.target.closest("[data-delete-project]");
    if (del) {
      if (!isAdmin()) { toast("Only an admin can delete projects.", "error"); return; }
      confirmDeleteProject(del.dataset.deleteProject);
      return;
    }

    const stage = e.target.closest("[data-set-stage]");
    if (stage) {
      if (!canEdit()) { toast("Your role is read-only.", "error"); return; }
      const id = stage.dataset.projectId;
      const key = stage.dataset.setStage;
      act(async () => {
        await state.backend.saveProject({
          id,
          stage: key,
          progress: STAGE_POINTS[key] != null ? STAGE_POINTS[key] : 0
        });
        toast("Moved to " + (STAGE_LABEL[key] || key) + ".");
      });
      return;
    }

    const approve = e.target.closest("[data-approve]");
    if (approve) {
      const uid = approve.dataset.approve;
      const roleSel = document.querySelector(`[data-approve-role="${uid}"]`);
      act(async () => {
        await state.backend.approveUser(uid, roleSel ? roleSel.value : "viewer");
        toast("Account approved.");
      });
      return;
    }

    const roleSel = e.target.closest("[data-role-for]");
    if (roleSel && e.target === roleSel) return; // handled on change

    const remove = e.target.closest("[data-remove-user]");
    if (remove) {
      act(async () => {
        await state.backend.removeUser(remove.dataset.removeUser);
        toast("Account removed.");
      });
      return;
    }

    const pause = e.target.closest("[data-pause-user]");
    if (pause) {
      act(async () => {
        await state.backend.setStatus(pause.dataset.pauseUser, "blocked");
        toast("Access paused.");
      });
      return;
    }

    const restore = e.target.closest("[data-restore-user]");
    if (restore) {
      act(async () => {
        await state.backend.setStatus(restore.dataset.restoreUser, "approved");
        toast("Access restored.");
      });
      return;
    }

    const delFile = e.target.closest("[data-delete-file]");
    if (delFile) {
      const file = state.files.find((f) => f.id === delFile.dataset.deleteFile);
      if (!file) return;
      if (!confirm("Delete " + file.name + "? This removes it for everyone.")) return;
      act(async () => {
        await state.backend.deleteFile(file);
        toast("File deleted.");
      });
    }
  });

  document.addEventListener("change", (e) => {
    const roleSel = e.target.closest("[data-role-for]");
    if (roleSel) {
      act(async () => {
        await state.backend.setRole(roleSel.dataset.roleFor, roleSel.value);
        toast("Role updated.");
      });
    }
  });

  /* project cycle note (delegated submit) */
  document.addEventListener("submit", async (e) => {
    const form = e.target.closest("[data-update-form]");
    if (!form) return;
    e.preventDefault();
    if (!canEdit()) { toast("Your role is read-only.", "error"); return; }
    const text = form.querySelector("textarea").value.trim();
    const stage = form.querySelector("select").value;
    if (!text) { toast("Write a short note first.", "error"); return; }
    await act(async () => {
      await state.backend.addUpdate(form.dataset.updateForm, { text, stage });
      form.reset();
      toast("Note added.");
    });
  });

  /* files */
  $("#file-input").addEventListener("change", (e) => {
    state.uploadQueue = Array.from(e.target.files || []);
    renderUploadQueue();
  });
  $("#upload-form").addEventListener("submit", handleUpload);
  $("#dropzone").addEventListener("dragover", (e) => {
    e.preventDefault();
    $("#dropzone").classList.add("is-over");
  });
  $("#dropzone").addEventListener("dragleave", () => $("#dropzone").classList.remove("is-over"));
  $("#dropzone").addEventListener("drop", (e) => {
    e.preventDefault();
    $("#dropzone").classList.remove("is-over");
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      state.uploadQueue = Array.from(e.dataTransfer.files);
      renderUploadQueue();
    }
  });

  $("#file-search").addEventListener("input", (e) => {
    state.fileSearch = e.target.value;
    renderFiles();
  });
  $("#file-project-filter").addEventListener("change", (e) => {
    state.fileProject = e.target.value;
    renderFiles();
  });

  /* website form */
  const siteForm = $("#site-form");
  siteForm.addEventListener("input", () => {
    state.siteDirty = true;
    updateSiteState();
    updateMapPreview();
  });
  siteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!isAdmin()) { toast("Only an admin can publish website changes.", "error"); return; }
    const data = readSiteForm();
    if (!data.phone) { toast("Add a phone number.", "error"); return; }
    await act(async () => {
      await state.backend.saveSettings(data);
      state.siteDirty = false;
      updateSiteState();
      toast("Website details updated.");
    });
  });
  $("#site-revert").addEventListener("click", () => {
    state.siteFilled = false;
    fillSiteForm();
    toast("Changes discarded.");
  });
  $("#hours-add").addEventListener("click", () => {
    $("#hours-rows").insertAdjacentHTML("beforeend", hoursRow("", ""));
    state.siteDirty = true;
    updateSiteState();
  });
  $("#hours-rows").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove-hour]");
    if (!btn) return;
    btn.closest(".hours__row").remove();
    state.siteDirty = true;
    updateSiteState();
  });
}

/* ==========================================================================
   Boot
   ========================================================================== */
function isLocalHost() {
  return ["localhost", "127.0.0.1", "::1", ""].includes(location.hostname) ||
    location.protocol === "file:";
}

async function boot() {
  wireEvents();
  initInstallButton();

  const demo = !CFG.enabled && isLocalHost();
  if (!CFG.enabled && !demo) {
    gate("setup");
    return;
  }

  const moduleName = demo ? "./backend-demo.js" : "./backend-firebase.js";
  let mod;
  try {
    mod = await import(moduleName);
  } catch (err) {
    console.error(err);
    gate("setup");
    toast("Could not load the backend module.", "error");
    return;
  }

  try {
    state.backend = await mod.createBackend(CFG);
  } catch (err) {
    console.error(err);
    gate("setup");
    toast("Firebase could not start. Check the config values.", "error");
    return;
  }

  state.mode = state.backend.mode;
  document.body.dataset.mode = state.mode;

  if (demo) {
    $("#demo-accounts").hidden = false;
    $("#google-signin").hidden = true;
    $("#demo-banner").hidden = false;
    $("#google-signin").parentElement.querySelector(".gate__fine").hidden = true;
  }

  $("#foot-mode").textContent = demo ? "Demo · local browser" : "Live · Firebase";
  gate("signin");
  state.backend.onAuth(handleAuth);
}

boot();
