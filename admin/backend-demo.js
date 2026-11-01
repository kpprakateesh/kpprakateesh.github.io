/* ==========================================================================
   AGAM — Local demo backend
   --------------------------------------------------------------------------
   Runs the admin interface entirely in this browser (localStorage) so the
   workflow can be tried and tested before Firebase is connected. It mirrors
   the Firebase adapter's interface and role rules.

   This file is only loaded on localhost / file:// — on a deployed site with
   Firebase not configured, the setup screen appears instead.
   ========================================================================== */

const KEY = "agam.demo.v1";
const SESSION = "agam.demo.session";

function uid() {
  return (crypto.randomUUID && crypto.randomUUID()) ||
    "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function now() {
  return { seconds: Math.floor(Date.now() / 1000) };
}

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function baseSettings() {
  const c = window.AGAM || {};
  return {
    phone: c.phone || "+91 99401 16073",
    whatsapp: c.whatsapp || "919940116073",
    email: c.email || "agaminterio@gmail.com",
    address: Object.assign({}, c.address || {
      line1: "No. 7/45, Police Office Road",
      line2: "St. Thomas Mount, Chennai 600016",
      mapQuery: "No. 7/45, Police Office Road, St. Thomas Mount, Chennai 600016",
      mapLat: 13.0099013,
      mapLng: 80.198755,
      mapZoom: 17
    }),
    hours: (c.hours || []).map((r) => [r[0], r[1]]),
    social: Object.assign({ instagram: "", facebook: "", linkedin: "", youtube: "" }, c.social || {})
  };
}

function seed() {
  const admin = {
    id: "demo-admin",
    email: "demo.admin@agam.local",
    name: "Demo Admin",
    photo: "",
    role: "admin",
    status: "approved",
    createdAt: now(),
    approvedAt: now(),
    approvedBy: "system"
  };
  return {
    users: {
      "demo-admin": admin,
      "demo-staff": {
        id: "demo-staff",
        email: "demo.staff@agam.local",
        name: "Priya · Office",
        photo: "",
        role: "editor",
        status: "approved",
        createdAt: now(),
        approvedAt: now(),
        approvedBy: admin.email
      },
      "demo-viewer": {
        id: "demo-viewer",
        email: "demo.viewer@agam.local",
        name: "Arun · Accounts",
        photo: "",
        role: "viewer",
        status: "approved",
        createdAt: now(),
        approvedAt: now(),
        approvedBy: admin.email
      },
      "demo-pending": {
        id: "demo-pending",
        email: "demo.pending@agam.local",
        name: "Nisha · New joiner",
        photo: "",
        role: "viewer",
        status: "pending",
        createdAt: now()
      }
    },
    settings: baseSettings(),
    projects: {
      "p-workstations": {
        id: "p-workstations",
        title: "Open-plan workstations",
        category: "office",
        location: "Workplace · concept",
        description:
          "Thirty-six seat open floor with planted dividers, acoustic ceiling rafts and a shared bench for the studio team.",
        imageUrl: "assets/img/project-7.svg",
        imagePath: "",
        stage: "execution",
        progress: 65,
        client: "Demo client · Guindy",
        startDate: "2026-08-04",
        targetDate: "2026-11-20",
        featured: true,
        published: true,
        order: 1,
        createdAt: now(),
        updatedAt: now()
      },
      "p-reception": {
        id: "p-reception",
        title: "Reception & waiting",
        category: "office",
        location: "Workplace · concept",
        description:
          "Fluted timber reception counter, arched niche and a four-seat waiting lounge for a financial services office.",
        imageUrl: "assets/img/project-8.svg",
        imagePath: "",
        stage: "design",
        progress: 35,
        client: "Demo client · Nungambakkam",
        startDate: "2026-10-12",
        targetDate: "2027-01-30",
        featured: true,
        published: true,
        order: 2,
        createdAt: now(),
        updatedAt: now()
      },
      "p-living": {
        id: "p-living",
        title: "Arched living room",
        category: "residential",
        location: "Residential · concept",
        description:
          "Living and dining rework with a tall arch, curved seating and a lime-plaster finish palette.",
        imageUrl: "assets/img/project-1.svg",
        imagePath: "",
        stage: "handover",
        progress: 100,
        client: "Demo client · Adyar",
        startDate: "2026-03-02",
        targetDate: "2026-09-18",
        featured: false,
        published: true,
        order: 3,
        createdAt: now(),
        updatedAt: now()
      },
      "p-stair": {
        id: "p-stair",
        title: "Stair & storage joinery",
        category: "furniture",
        location: "Furniture · concept",
        description:
          "Teak stair with stepped storage drawers and a brass pendant, made in the workshop and assembled on site.",
        imageUrl: "assets/img/project-5.svg",
        imagePath: "",
        stage: "approval",
        progress: 50,
        client: "Demo client · Mylapore",
        startDate: "2026-09-15",
        targetDate: "2026-12-22",
        featured: false,
        published: true,
        order: 4,
        createdAt: now(),
        updatedAt: now()
      }
    },
    updates: {
      "p-workstations": [
        {
          id: "u-1",
          text: "Partitions set out and signed off with the client. Electrical first fix starts Monday.",
          stage: "execution",
          createdAt: { seconds: Math.floor(Date.now() / 1000) - 3600 * 26 },
          authorName: "Demo Admin"
        },
        {
          id: "u-2",
          text: "3D views and material board approved. Joinery released to the workshop.",
          stage: "approval",
          createdAt: { seconds: Math.floor(Date.now() / 1000) - 3600 * 24 * 9 },
          authorName: "Priya · Office"
        }
      ],
      "p-reception": [
        {
          id: "u-3",
          text: "Concept options issued. Client prefers the fluted timber option with the arched niche.",
          stage: "design",
          createdAt: { seconds: Math.floor(Date.now() / 1000) - 3600 * 72 },
          authorName: "Priya · Office"
        }
      ],
      "p-living": [],
      "p-stair": []
    },
    files: {}
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn("Demo store reset", err);
  }
  const fresh = seed();
  localStorage.setItem(KEY, JSON.stringify(fresh));
  return fresh;
}

function save(db) {
  localStorage.setItem(KEY, JSON.stringify(db));
}

export async function createBackend() {
  let db = load();
  let authCb = null;
  const subs = {
    settings: new Set(),
    projects: new Set(),
    files: new Set(),
    users: new Set(),
    updates: new Map()
  };

  function sessionUser() {
    const id = localStorage.getItem(SESSION);
    if (!id || !db.users[id]) return null;
    return db.users[id];
  }

  function emitAuth() {
    if (typeof authCb !== "function") return;
    const u = sessionUser();
    authCb(
      u
        ? {
            user: { uid: u.id, email: u.email, name: u.name, photo: u.photo || "" },
            profile: clone(u)
          }
        : { user: null, profile: null }
    );
  }

  function notify(kind, projectId) {
    if (kind === "settings") subs.settings.forEach((cb) => cb(clone(db.settings)));
    if (kind === "projects") subs.projects.forEach((cb) => cb(clone(Object.values(db.projects))));
    if (kind === "files") subs.files.forEach((cb) => cb(clone(Object.values(db.files))));
    if (kind === "users") subs.users.forEach((cb) => cb(clone(Object.values(db.users))));
    if (kind === "updates") {
      const set = subs.updates.get(projectId);
      if (set) {
        const list = clone(db.updates[projectId] || []).sort(
          (a, b) => (b.createdAt.seconds || 0) - (a.createdAt.seconds || 0)
        );
        set.forEach((cb) => cb(list));
      }
    }
  }

  function me() {
    return sessionUser();
  }

  function needStaff() {
    const u = me();
    if (!u || u.status !== "approved" || !["admin", "editor"].includes(u.role)) {
      throw new Error("Your account does not have permission for this action.");
    }
    return u;
  }

  function needAdmin() {
    const u = me();
    if (!u || u.status !== "approved" || u.role !== "admin") {
      throw new Error("Only an admin can do this.");
    }
    return u;
  }

  function onAuth(cb) {
    authCb = cb;
    emitAuth();
  }

  async function signIn(key) {
    const account = key || "demo-admin";
    if (!db.users[account]) throw new Error("Unknown demo account");
    localStorage.setItem(SESSION, account);
    emitAuth();
  }

  async function signOutNow() {
    localStorage.removeItem(SESSION);
    emitAuth();
  }

  function subscribeSettings(cb) {
    subs.settings.add(cb);
    cb(clone(db.settings));
    return () => subs.settings.delete(cb);
  }

  async function saveSettings(data) {
    const user = needAdmin();
    db.settings = Object.assign({}, db.settings, data, {
      updatedAt: now(),
      updatedBy: user.email
    });
    save(db);
    notify("settings");
  }

  function subscribeProjects(cb) {
    subs.projects.add(cb);
    cb(clone(Object.values(db.projects)));
    return () => subs.projects.delete(cb);
  }

  async function saveProject(data) {
    needStaff();
    const id = data.id || uid();
    const existing = db.projects[id] || {};
    db.projects[id] = Object.assign({}, existing, data, {
      id,
      updatedAt: now(),
      createdAt: existing.createdAt || now()
    });
    save(db);
    notify("projects");
    return id;
  }

  async function deleteProject(id) {
    needAdmin();
    delete db.projects[id];
    delete db.updates[id];
    save(db);
    notify("projects");
  }

  function subscribeUpdates(projectId, cb) {
    if (!subs.updates.has(projectId)) subs.updates.set(projectId, new Set());
    subs.updates.get(projectId).add(cb);
    const list = clone(db.updates[projectId] || []).sort(
      (a, b) => (b.createdAt.seconds || 0) - (a.createdAt.seconds || 0)
    );
    cb(list);
    return () => {
      const set = subs.updates.get(projectId);
      if (set) set.delete(cb);
    };
  }

  async function addUpdate(projectId, data) {
    const user = needStaff();
    if (!db.updates[projectId]) db.updates[projectId] = [];
    db.updates[projectId].push({
      id: uid(),
      text: String(data.text || "").trim(),
      stage: data.stage || "",
      createdAt: now(),
      authorUid: user.id,
      authorName: user.name || user.email
    });
    save(db);
    notify("updates", projectId);
  }

  function subscribeFiles(cb) {
    subs.files.add(cb);
    cb(
      clone(Object.values(db.files)).sort(
        (a, b) => (b.uploadedAt.seconds || 0) - (a.uploadedAt.seconds || 0)
      )
    );
    return () => subs.files.delete(cb);
  }

  function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function uploadFile(file, meta, onProgress) {
    needStaff();
    if (file.size > 3.5 * 1024 * 1024) {
      throw new Error("Demo mode stores files in this browser. Keep files under 3.5 MB here.");
    }
    if (onProgress) onProgress(35);
    const url = await readAsDataURL(file);
    if (onProgress) onProgress(90);
    const user = me();
    const id = uid();
    db.files[id] = {
      id,
      name: file.name,
      path: "staff/" + id + "/" + file.name,
      url,
      size: file.size,
      contentType: file.type || "",
      projectId: (meta && meta.projectId) || "",
      note: (meta && meta.note) || "",
      uploadedBy: user.id,
      uploadedByName: user.name || user.email,
      uploadedAt: now()
    };
    save(db);
    notify("files");
    if (onProgress) onProgress(100);
    return id;
  }

  async function uploadProjectImage(file, onProgress) {
    needStaff();
    if (file.size > 3.5 * 1024 * 1024) {
      throw new Error("Demo mode stores images in this browser. Keep images under 3.5 MB.");
    }
    if (onProgress) onProgress(50);
    const url = await readAsDataURL(file);
    if (onProgress) onProgress(100);
    return url;
  }

  async function deleteFile(file) {
    needStaff();
    const u = me();
    if (u.role !== "admin" && file.uploadedBy !== u.id) {
      throw new Error("You can only delete files you uploaded.");
    }
    delete db.files[file.id];
    save(db);
    notify("files");
  }

  function subscribeUsers(cb) {
    subs.users.add(cb);
    cb(clone(Object.values(db.users)));
    return () => subs.users.delete(cb);
  }

  async function approveUser(id, role) {
    needAdmin();
    const u = db.users[id];
    if (!u) return;
    u.status = "approved";
    u.role = role || "viewer";
    u.approvedAt = now();
    u.approvedBy = me().email;
    save(db);
    notify("users");
  }

  async function setRole(id, role) {
    needAdmin();
    if (!db.users[id]) return;
    db.users[id].role = role;
    save(db);
    notify("users");
  }

  async function setStatus(id, status) {
    needAdmin();
    if (!db.users[id]) return;
    db.users[id].status = status;
    save(db);
    notify("users");
  }

  async function removeUser(id) {
    needAdmin();
    if (id === me().id) throw new Error("You cannot remove your own admin account.");
    delete db.users[id];
    save(db);
    notify("users");
  }

  return {
    mode: "demo",
    onAuth,
    signIn,
    signOut: signOutNow,
    currentUser: () => {
      const u = sessionUser();
      return u ? { uid: u.id, email: u.email, name: u.name } : null;
    },
    subscribeSettings,
    saveSettings,
    subscribeProjects,
    saveProject,
    deleteProject,
    subscribeUpdates,
    addUpdate,
    subscribeFiles,
    uploadFile,
    uploadProjectImage,
    deleteFile,
    subscribeUsers,
    approveUser,
    setRole,
    setStatus,
    removeUser,
    resetDemo: () => {
      localStorage.removeItem(KEY);
      localStorage.removeItem(SESSION);
      db = load();
    }
  };
}
