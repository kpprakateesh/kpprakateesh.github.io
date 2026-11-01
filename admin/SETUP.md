# Agam Studio — admin setup

The website is still a static site. The office admin at `/admin/` is a small
app that talks to **Firebase** for Google sign-in, live project data and
private file storage. Nothing needs a build step.

Until Firebase is connected, the admin opens in **demo mode on localhost** so
the whole workflow can be tried in a browser. On the live domain it shows this
guide's four steps instead of a broken login.

---

## What you get

| Area | Admin | Office staff (`editor`) | Viewer |
| --- | --- | --- | --- |
| Website contact details, map, hours, social | ✅ | — | — |
| Add / edit projects, move the project cycle | ✅ | ✅ | — |
| Add cycle notes | ✅ | ✅ | — |
| Upload project images and office files | ✅ | ✅ | — |
| Read projects, notes and shared files | ✅ | ✅ | ✅ |
| Approve, pause, remove accounts | ✅ | — | — |
| Delete projects or anyone's file | ✅ | own files only | — |

New Google sign-ins always start as **pending** until the admin approves them.

---

## 1. Create the Firebase project

1. Open <https://console.firebase.google.com> and sign in with
   **agaminterio@gmail.com** (the account that should own the workspace).
2. **Add project** → name it `agam-interiors` → continue. Google Analytics is
   optional and not needed.
3. In the left menu:

   **Build → Authentication**
   - *Get started*
   - **Sign-in method → Google → Enable**
   - Project public-facing name: `Agam Studio`
   - Support e-mail: `agaminterio@gmail.com`
   - Save.

   **Build → Firestore Database**
   - *Create database*
   - Choose **Production mode** (the rules below lock it down)
   - Location: `asia-south1` (Mumbai) is the closest to Chennai.
   - Create.

   **Build → Storage**
   - *Get started* → Production mode → same location.
   - Firebase now asks for the **Blaze** plan for new projects. Storage has a
     free monthly quota (5 GB stored, 1 GB/day download at the time of
     writing); Blaze only means a card is on file so usage beyond the free
     quota can be billed. Set a budget alert before uploading large files:
     *Project settings → Usage and billing → Details & settings → Budget alerts*.
   - If you would rather stay on Spark, skip Storage. Everything except file
     uploads still works; project images can use a normal URL instead.

4. **Project settings (gear) → General → Your apps**
   - *Add app* → **Web** (`</>`)
   - Nickname: `Agam website`
   - Do **not** tick Firebase Hosting (Cloudflare hosts the site).
   - Register app, then copy the `firebaseConfig` object.

---

## 2. Paste the config into the site

Open `assets/js/firebase-config.js` and replace the empty values:

```js
window.AGAM_FIREBASE = {
  enabled: true,                       // ← change this
  adminEmail: "agaminterio@gmail.com", // must match firestore.rules

  apiKey: "AIza…",
  authDomain: "agam-interiors.firebaseapp.com",
  projectId: "agam-interiors",
  storageBucket: "agam-interiors.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};
```

These keys are public by design. Security comes from the rules, not from
hiding the config.

**Important:** `adminEmail` and `ADMIN_EMAIL` inside `firestore.rules` and
`storage.rules` must be the same address. That account becomes admin on its
first sign-in, even before a profile document exists.

---

## 3. Publish the security rules

### Option A — Firebase console (no tools)

1. **Firestore Database → Rules** → paste the whole of `firestore.rules` →
   **Publish**.
2. **Storage → Rules** → paste `storage.rules` → **Publish**.

### Option B — Firebase CLI

```bash
npm install -g firebase-tools
firebase login
cd "/path/to/Agam-website/site"
firebase use --add            # pick the agam-interiors project
firebase deploy --only firestore:rules,storage
```

`firebase.json` in this folder already points at both rule files.

The rules enforce:

- public read of `settings/site` and published projects only;
- private read of unpublished projects, cycle notes, files and the team list;
- writes only from approved staff; deletes only from the admin;
- a sign-in can create only its own **pending** profile;
- uploads capped at 10 MB for images and 25 MB for other files.

---

## 4. Authorise your domains

**Authentication → Settings → Authorized domains** must contain:

- `localhost` (already there — used for testing)
- your Cloudflare Pages domain, e.g. `agam-website.pages.dev`
- `agaminterio.com` and `www.agaminterio.com`

Google sign-in opens a popup. If the domain is missing you will see
`auth/unauthorized-domain`. The site's `_headers` file sets
`Cross-Origin-Opener-Policy: same-origin-allow-popups` so the popup can talk
back to the page on Cloudflare Pages.

---

## 5. First sign-in and staff accounts

1. Open `https://your-domain/admin/`.
2. **Continue with Google** → use `agaminterio@gmail.com`.
   The first sign-in creates an approved **admin** profile automatically.
3. Send the same `/admin/` link to each office colleague. They sign in with
   their own Google account and wait.
4. You will see them under **Team → Approval requests**. Choose a role and
   press **Approve**:
   - **Office staff** — projects, cycle notes, uploads.
   - **Viewer** — read-only.
   - **Admin** — full control. Give this sparingly.
5. The new account unlocks on its own; the colleague only needs to wait on the
   pending screen (or reload).

Pausing an account keeps the record but blocks access immediately. Removing an
account deletes the profile; their uploaded files stay in the library. To
remove the Google identity itself, delete the user in
**Authentication → Users** as well.

---

## 6. Hosting on Cloudflare Pages (domain stays at GoDaddy)

You do **not** move the domain. GoDaddy keeps the registration; only DNS
records change.

### A. Upload the site

**Dashboard method**

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Upload assets**.
2. Project name: `agam-website`.
3. Drag the **contents of the `site/` folder** (not its parent) into the
   uploader. `index.html` must sit at the root.
4. Deploy. You get `https://agam-website.pages.dev`.

**Git method** (if you push the folder to GitHub)

- Connect the repo, set **Root directory** to `site`, framework preset
  **None**, build command empty, output directory `/`.

**CLI method**

```bash
npm install -g wrangler
wrangler login
cd "/path/to/Agam-website/site"
wrangler pages deploy . --project-name agam-website
```

### B. Point the domain

In Cloudflare Pages → your project → **Custom domains**:

1. Add `agaminterio.com` and `www.agaminterio.com`.
2. Cloudflare shows the records to create. In **GoDaddy → DNS**:
   - `CNAME  www   agam-website.pages.dev`
   - For the root, either Cloudflare's `ALIAS`/flattening record if offered,
     or move the nameservers to Cloudflare (recommended) and let Pages add the
     record for you.
3. Wait for the certificate to show **Active**. HTTPS is automatic.

`CNAME` in the site folder already contains `agaminterio.com`. If the final
domain is different, change it, plus the canonical/OG URLs in the HTML,
`sitemap.xml` and `robots.txt`.

### C. Cache and security headers

`_headers` is picked up automatically by Cloudflare Pages. The site already
sets:

- long cache for `/assets/img/*` (they rarely change);
- no-cache for HTML, CSS, JavaScript and `/admin/*`, so admin edits and config
  changes appear on the next load;
- `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`;
- `Cross-Origin-Opener-Policy: same-origin-allow-popups` (needed for Google).

Do not add a `Content-Security-Policy` that blocks `*.googleapis.com`,
`*.gstatic.com`, `firebaseapp.com` or `accounts.google.com` — sign-in and
Firestore would stop.

---

## 7. Using the admin

### Projects

- **Projects → New project**: title, type, client, location, dates, cover
  image, publish toggle.
- The seven-stage cycle is **Enquiry → Survey → Design → Approval →
  Execution → Handover → Closed**. Click a stage to move the project; a
  suggested progress percentage follows automatically and can be overridden.
- **Cycle notes** record what changed, who wrote it and when. Notes are
  private to approved staff.
- **Published on the website** makes the project appear on the public
  `projects.html` grid and, if **Feature on the home page** is ticked, in the
  home page selection. Unpublished projects are office-only.
- **Cover image** uploads go to Firebase Storage under `public/projects/…` and
  are served through a download URL. Without Storage, paste any public image
  URL into the hidden `imageUrl` field via a project edit (or leave the concept
  artwork).

### Files

- **Files → Add a file**: drag files or browse, optionally link to a project
  and add a note.
- Stored under `staff/…`, readable by approved users only.
- Anyone approved can open the shared library; staff can delete only their own
  uploads, admins can delete any.
- Demo mode keeps files in `localStorage` and caps them at 3.5 MB.

### Website

Edits phone, WhatsApp, e-mail, address, map query, latitude/longitude, map
zoom, opening hours and social links. **Save website details** publishes
immediately — every public page reads the same `settings/site` document.

The map uses coordinates for an exact pin:

- Latitude `13.0099013`
- Longitude `80.198755`
- Zoom `17`

Get better coordinates any time: right-click the exact entrance in Google
Maps → click the numbers → paste them in.

### Install as an app (prototype)

`/admin/` is a PWA. Open it in Chrome or Edge → **Install app** in the top bar
(or the install icon in the address bar) → it opens in its own window like a
desktop/mobile app. On iPhone use Safari → Share → **Add to Home Screen**.
The service worker caches only the interface; data always comes live from
Firebase.

On phones the app uses Google's redirect sign-in instead of a popup. If the
first sign-in from an installed iPhone app does not return to the app, open
`/admin/` once in Safari, sign in there, then reopen the installed app — the
session carries over.

---

## 8. Local testing

```bash
cd "/path/to/Agam-website/site"
python3 -m http.server 8123 --bind 127.0.0.1
```

Open <http://127.0.0.1:8123/admin/>. With `enabled: false` it starts in demo
mode with four accounts:

- **Admin** — full control
- **Office staff** — projects, notes, uploads
- **Viewer** — read-only
- **Pending** — the approval screen

Demo data lives in this browser only. **Reset demo data** in the banner clears
it. Nothing is sent anywhere.

To test the real Firebase flow locally, set `enabled: true`, keep `localhost`
in authorised domains, and sign in.

---

## 9. Going live checklist

- [ ] Firebase project created in `asia-south1`
- [ ] Google provider enabled, support e-mail set
- [ ] Firestore created in production mode
- [ ] Storage enabled (Blaze + budget alert) or consciously skipped
- [ ] `firebase-config.js` filled, `enabled: true`
- [ ] `adminEmail` matches `ADMIN_EMAIL` in both rule files
- [ ] Rules published
- [ ] `localhost`, `*.pages.dev`, `agaminterio.com`, `www.agaminterio.com`
      authorised
- [ ] Admin signed in and profile shows **Admin**
- [ ] One staff account approved and tested on a phone
- [ ] Public site shows the admin's phone/address after saving
- [ ] Map pin lands on the office
- [ ] `https://agaminterio.com/admin/` loads over HTTPS
- [ ] Backup: Firestore **Export** (requires Blaze) or periodic JSON export

---

## 10. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `auth/unauthorized-domain` | Add the exact domain under Authentication → Settings → Authorized domains. |
| Popup closes and nothing happens | A CSP or COOP header is blocking it. Keep `same-origin-allow-popups`; allow Google/Firebase domains. |
| `Missing or insufficient permissions` | Rules not published, or the account is still `pending`, or `adminEmail` ≠ `ADMIN_EMAIL`. |
| Admin shows the setup screen on the live site | `enabled` is still `false`, or a config value is empty. |
| Changes do not appear on the website | The project is not **Published**, or the browser cached the old page. HTML is no-cache; hard-reload once. |
| Uploads fail with `storage/unauthorized` | Storage rules not published, account not approved, or file over the size limit. |
| Uploads fail with `storage/retry-limit-exceeded` | Blaze/billing issue or no connection. |
| Staff cannot delete a file | Only admins or the uploader may delete. This is intentional. |
| Map shows the wrong building | Replace latitude/longitude with the exact entrance pin from Google Maps. |
| Installed app shows an old interface | Close it, reopen, or bump `VERSION` in `admin/sw.js` when deploying UI changes. |

---

## Data model (for reference)

```
users/{uid}                     role, status, name, email, photo, approvals
settings/site                   phone, whatsapp, email, address{}, hours[], social{}
projects/{id}                   title, category, stage, progress, dates, imageUrl,
                                published, featured, order, client, description
projects/{id}/updates/{id}      text, stage, createdAt, authorUid, authorName
files/{id}                      name, path, url, size, projectId, note, uploadedBy
```

Storage:

```
public/projects/{id}/{file}     website images, world-readable
staff/{id}/{file}               private office files, approved users only
```
