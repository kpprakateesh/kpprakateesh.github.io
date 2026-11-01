/* ==========================================================================
   AGAM — FIREBASE CONNECTION
   --------------------------------------------------------------------------
   Paste the web app config from:
   Firebase console → Project settings → Your apps → Web app → SDK setup.

   This file is PUBLIC and safe to deploy. Nobody can read your database just
   because they can see these keys — access is controlled by the Firestore and
   Storage rules in /firestore.rules and /storage.rules.

   Until you fill this in, the website keeps using the static content in
   config.js and the admin panel shows setup instructions (on localhost it
   opens a local demo instead, so you can try the interface).
   ========================================================================== */

window.AGAM_FIREBASE = {
  // Turn this on only after the values below are filled in.
  enabled: false,

  // The Google account that owns the workspace. It becomes admin on first
  // sign-in. Keep this in sync with ADMIN_EMAIL in firestore.rules.
  adminEmail: "agaminterio@gmail.com",

  // ---- Paste from Firebase (example shape) --------------------------------
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};
