/* ==========================================================================
   AGAM — Firebase backend (production)
   --------------------------------------------------------------------------
   Thin adapter over Firebase Auth / Firestore / Storage. The admin UI never
   talks to the SDK directly, so the same interface can run in local demo mode
   (backend-demo.js) for testing without a live project.
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  addDoc,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const FIREBASE_VERSION = "10.12.2";

function byNewest(a, b) {
  const av = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
  const bv = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
  return bv - av;
}

function safeName(name) {
  return String(name || "file")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .slice(-90) || "file";
}

export async function createBackend(cfg) {
  const app = initializeApp(cfg);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

  let profileUnsub = null;
  let authCb = null;

  function currentUser() {
    return auth.currentUser;
  }

  function onAuth(cb) {
    authCb = cb;

    // Completes a redirect sign-in (used on phones where popups are blocked).
    getRedirectResult(auth).catch((err) => {
      console.warn("Google redirect sign-in", err);
    });

    onAuthStateChanged(auth, async (user) => {
      if (profileUnsub) { profileUnsub(); profileUnsub = null; }

      if (!user) {
        cb({ user: null, profile: null });
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const isBootstrap =
        (user.email || "").toLowerCase() === String(cfg.adminEmail || "").toLowerCase();

      let snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          email: user.email || "",
          name: user.displayName || "",
          photo: user.photoURL || "",
          role: isBootstrap ? "admin" : "viewer",
          status: isBootstrap ? "approved" : "pending",
          requestedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });
        snap = await getDoc(userRef);
      }

      const emit = (s) => {
        if (typeof authCb !== "function") return;
        authCb({
          user: {
            uid: user.uid,
            email: user.email || "",
            name: user.displayName || "",
            photo: user.photoURL || ""
          },
          profile: s.exists() ? Object.assign({ id: s.id }, s.data()) : null
        });
      };

      emit(snap);
      profileUnsub = onSnapshot(userRef, emit);
    });
  }

  async function signIn() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    const mobile = /iphone|ipad|ipod|android/i.test(navigator.userAgent || "");
    if (mobile) {
      await signInWithRedirect(auth, provider);
      return;
    }

    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      const code = err && err.code;
      if (
        code === "auth/popup-blocked" ||
        code === "auth/operation-not-supported-in-this-environment" ||
        code === "auth/web-storage-unsupported"
      ) {
        await signInWithRedirect(auth, provider);
        return;
      }
      throw err;
    }
  }

  async function signOutNow() {
    await signOut(auth);
  }

  /* ---------------- Website settings ---------------- */
  function subscribeSettings(cb) {
    return onSnapshot(doc(db, "settings", "site"), (s) => {
      cb(s.exists() ? s.data() : null);
    });
  }

  async function saveSettings(data) {
    await setDoc(
      doc(db, "settings", "site"),
      Object.assign({}, data, {
        updatedAt: serverTimestamp(),
        updatedBy: (auth.currentUser && auth.currentUser.email) || ""
      }),
      { merge: true }
    );
  }

  /* ---------------- Projects ---------------- */
  function subscribeProjects(cb) {
    return onSnapshot(collection(db, "projects"), (snap) => {
      cb(snap.docs.map((d) => Object.assign({ id: d.id }, d.data())));
    });
  }

  async function saveProject(data) {
    const payload = Object.assign({}, data);
    delete payload.id;
    payload.updatedAt = serverTimestamp();
    if (data.id) {
      await setDoc(doc(db, "projects", data.id), payload, { merge: true });
      return data.id;
    }
    payload.createdAt = serverTimestamp();
    payload.createdBy = (auth.currentUser && auth.currentUser.email) || "";
    const created = await addDoc(collection(db, "projects"), payload);
    return created.id;
  }

  async function deleteProject(id) {
    try {
      const updates = await getDocs(collection(db, "projects", id, "updates"));
      await Promise.all(updates.docs.map((d) => deleteDoc(d.ref)));
    } catch (err) {
      console.warn("Could not clear project updates", err);
    }
    await deleteDoc(doc(db, "projects", id));
  }

  /* ---------------- Project cycle updates ---------------- */
  function subscribeUpdates(projectId, cb) {
    return onSnapshot(collection(db, "projects", projectId, "updates"), (snap) => {
      cb(snap.docs.map((d) => Object.assign({ id: d.id }, d.data())).sort(byNewest));
    });
  }

  async function addUpdate(projectId, data) {
    const user = auth.currentUser;
    await addDoc(collection(db, "projects", projectId, "updates"), {
      text: String(data.text || "").trim(),
      stage: data.stage || "",
      createdAt: serverTimestamp(),
      authorUid: user ? user.uid : "",
      authorName: user ? user.displayName || user.email : ""
    });
  }

  /* ---------------- Files ---------------- */
  function subscribeFiles(cb) {
    return onSnapshot(collection(db, "files"), (snap) => {
      cb(
        snap.docs
          .map((d) => Object.assign({ id: d.id }, d.data()))
          .sort((a, b) => {
            const av = a.uploadedAt && a.uploadedAt.seconds ? a.uploadedAt.seconds : 0;
            const bv = b.uploadedAt && b.uploadedAt.seconds ? b.uploadedAt.seconds : 0;
            return bv - av;
          })
      );
    });
  }

  function uploadTo(storageRef, file, onProgress) {
    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, file, {
        contentType: file.type || "application/octet-stream",
        customMetadata: { uploadedBy: (auth.currentUser && auth.currentUser.uid) || "" }
      });
      task.on(
        "state_changed",
        (s) => {
          if (onProgress && s.totalBytes) {
            onProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100));
          }
        },
        reject,
        resolve
      );
    });
  }

  async function uploadFile(file, meta, onProgress) {
    const id = (crypto.randomUUID && crypto.randomUUID()) ||
      String(Date.now()) + Math.random().toString(16).slice(2);
    const path = "staff/" + id + "/" + safeName(file.name);
    const storageRef = ref(storage, path);
    await uploadTo(storageRef, file, onProgress);
    const url = await getDownloadURL(storageRef);
    const user = auth.currentUser;
    await setDoc(doc(db, "files", id), {
      name: file.name,
      path,
      url,
      size: file.size,
      contentType: file.type || "",
      projectId: (meta && meta.projectId) || "",
      note: (meta && meta.note) || "",
      uploadedBy: user ? user.uid : "",
      uploadedByName: user ? user.displayName || user.email : "",
      uploadedAt: serverTimestamp()
    });
    return id;
  }

  async function uploadProjectImage(file, onProgress) {
    const id = (crypto.randomUUID && crypto.randomUUID()) ||
      String(Date.now()) + Math.random().toString(16).slice(2);
    const path = "public/projects/" + id + "/" + safeName(file.name);
    const storageRef = ref(storage, path);
    await uploadTo(storageRef, file, onProgress);
    return getDownloadURL(storageRef);
  }

  async function deleteFile(file) {
    if (file.path) {
      try {
        await deleteObject(ref(storage, file.path));
      } catch (err) {
        console.warn("Storage delete skipped", err);
      }
    }
    await deleteDoc(doc(db, "files", file.id));
  }

  /* ---------------- Office team ---------------- */
  function subscribeUsers(cb) {
    return onSnapshot(collection(db, "users"), (snap) => {
      cb(
        snap.docs
          .map((d) => Object.assign({ id: d.id }, d.data()))
          .sort((a, b) => {
            const av = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
            const bv = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
            return av - bv;
          })
      );
    });
  }

  async function approveUser(uid, role) {
    await updateDoc(doc(db, "users", uid), {
      status: "approved",
      role: role || "viewer",
      approvedAt: serverTimestamp(),
      approvedBy: (auth.currentUser && auth.currentUser.email) || ""
    });
  }

  async function setRole(uid, role) {
    await updateDoc(doc(db, "users", uid), { role });
  }

  async function setStatus(uid, status) {
    await updateDoc(doc(db, "users", uid), { status });
  }

  async function removeUser(uid) {
    await deleteDoc(doc(db, "users", uid));
  }

  return {
    mode: "firebase",
    version: FIREBASE_VERSION,
    onAuth,
    signIn,
    signOut: signOutNow,
    currentUser,
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
    removeUser
  };
}
