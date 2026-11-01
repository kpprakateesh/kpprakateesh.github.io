# Agam — website

A fast, dependency-free static website for **Agam Interiors Pvt Ltd**
(Chennai). Eight pages, no framework, no build step: open the folder, upload it,
done.

**Design:** editorial-modern — Instrument Serif headlines over Inter body text, a
deep-green / cream / sand / brass palette taken from the logo, an arched hero
portrait with a workplace/home preview toggle, a workplace-first service grid,
filterable project gallery with a keyboard-accessible lightbox, scroll progress,
cursor spotlight, subtle parallax, an animated FAQ and a sticky mobile call bar.
All of it is progressive enhancement: the site is fully readable with JavaScript
disabled.

```
site/
├── index.html              Home
├── services.html           All services in detail
├── projects.html           Project gallery with filters
├── about.html              Studio story, values, team
├── contact.html            Enquiry form, map, hours
├── privacy.html            Privacy notice
├── thanks.html             Form success page (optional)
├── 404.html                Not-found page
├── admin/                  Office admin (Google login) — see admin/SETUP.md
├── robots.txt · sitemap.xml · manifest.webmanifest · CNAME · .nojekyll
├── _headers                Security + cache headers (Cloudflare Pages)
├── firebase.json           Deploy config for Firestore + Storage rules
├── firestore.rules         Security model for users, settings, projects, files
├── storage.rules           Public project images, private staff files
├── assets/
│   ├── css/styles.css      All styling
│   ├── js/config.js        ← YOUR DETAILS GO HERE (static fallback)
│   ├── js/firebase-config.js  ← Firebase keys + admin Gmail (see below)
│   ├── js/site-data.js     Loads live settings/projects from Firestore
│   ├── js/main.js          Nav, filters, form, animations, spotlight
│   └── img/                Logo, favicons, og-cover.jpg, hero + project art
├── set-domain.sh           One-command domain update
└── preview.sh              Local preview server
```

---

## 1. Edit your details (do this first)

Open **`assets/js/config.js`**. Everything below is set in that one file and
applied to every page automatically:

| Field | What it does |
|---|---|
| `phone`, `phoneHref` | Shown in header, footer, contact page. `phoneHref` must be `tel:+91…` with no spaces. |
| `whatsapp` | Floating button + “WhatsApp us” links. Digits only, with country code: `919940116073`. |
| `email` | All e-mail links (`agaminterio@gmail.com`). **Optional** — set to `""` and every e-mail block hides itself. |
| `address`, `hours` | Contact page and footer. |
| `formEndpoint` | Where enquiries are sent (see §4). |
| `social` | Instagram / Facebook / LinkedIn / YouTube. Leave `""` to hide an icon. |
| `staffPortal` | Private staff-vault URL. Leave `""` to hide the discreet footer link. **Never host the vault inside this site.** |

> **E-mail is optional.** Elements marked `data-email-only` stay hidden until
> `email` is filled in, so the site never shows a blank e-mail row. Add the
> address in `config.js` and the rows appear on every page automatically.


> The phone number is also written into the HTML as a no-JavaScript fallback.
> If you change it, update `config.js` **and** search-and-replace the old number
> in the `.html` files.

### 1a. The private staff vault is separate

The office records gateway is **not** part of this static site and must never be
uploaded with it. It lives in `../vault/`, runs as a small Node server on the
office machine, and is reached through Tailscale or Cloudflare Access.

When it is deployed, paste its HTTPS address into `staffPortal` in
`config.js`. A discreet **“Staff sign-in”** link then appears in the footer on
every page. Leave it empty and no link is rendered. See
[`../vault/SETUP.md`](../vault/SETUP.md) for the security model and deployment
steps.

## 2. Preview locally

```bash
cd site
./preview.sh          # http://localhost:8080
```

Or simply double-click `index.html` — the site works offline from `file://`.

## 3. Set your domain

```bash
./set-domain.sh agaminterio.com   # already done
```

This rewrites every `https://YOUR-DOMAIN.com` (canonical tags, Open Graph tags,
`robots.txt`, `sitemap.xml`) and writes the `CNAME` file used by GitHub Pages.
Run it once you know the exact domain (with or without `www`).

## 4. Make the enquiry form deliver to your inbox

Out of the box the form validates, then hands the enquiry to WhatsApp with the
message pre-filled (and shows the phone number if the pop-up is blocked). If you
set `email` in `config.js` but leave `formEndpoint` empty, it opens the visitor's
mail app instead.

For proper inbox delivery, pick one free option:

**Formspree** — formspree.io → new form → copy endpoint → paste into
`formEndpoint` in `config.js`:

```js
formEndpoint: "https://formspree.io/f/xxxxxxxx"
```

**Web3Forms** — web3forms.com → enter your e-mail → copy the access key → set:

```js
formEndpoint: "https://api.web3forms.com/submit"
```

…and add the key to the form in `contact.html` as a hidden field:

```html
<input type="hidden" name="access_key" value="YOUR-KEY">
```

Both free tiers cover a small business comfortably. Whichever you use, test it
once from the live site.

## 5. Replace the placeholder artwork with real photos

Once the admin is connected you can do this from **Admin → Projects → Edit →
Cover image**; no code change or redeploy is needed. The steps below remain the
manual route if Firebase is not set up yet.

The gallery and hero use on-brand SVG illustrations so the site looks finished
today (they are labelled as concept studies, not photographs). When you have real
photographs:

1. Put them in `assets/img/`.
2. In `projects.html`, swap the `src` of each `.project img`. Every tile is a
   portrait `4:5` crop — supply at least 1000 px wide, and keep the subject away
   from the very top and bottom.
3. In `index.html`, swap the two hero images (`data-hero-img="work"` and
   `data-hero-img="home"`). Both are `4:5`; use a workplace shot for the default
   “Workplace” view and a warm room for “Home”.
4. Keep the `alt` text describing the photo, and update the `data-title` /
   `data-meta` attributes on the project tile so the lightbox caption is correct.
5. The homepage “featured work” section reuses `project-7/8/1.svg` — point those
   `src` values at your new files too.

Update the `og-cover.jpg` (1200×630) when you have a good hero photograph — it is
what appears when the site is shared on WhatsApp or Facebook.

## 6. Content honesty checklist before launch

- [x] Real phone and WhatsApp number in `config.js` (+91 99401 16073)
- [x] E-mail address in `config.js` (agaminterio@gmail.com)
- [x] Registered office address in `config.js` (No. 7/45, Police Office Road,
      St. Thomas Mount, Chennai 600016) — also drives the Google Map
- [ ] Real project names and locations in `projects.html` (they are concepts now)
  — or publish them from the admin instead
- [ ] Firebase connected and rules published (see `admin/SETUP.md`)
- [ ] Office Google accounts approved in **Admin → Team**
- [ ] Replace the `privacy.html` wording with how you actually handle data
- [ ] Add your Instagram/Facebook URLs to `config.js`
- [ ] Test the form once, from a phone and a desktop
- [ ] Check `https://agaminterio.com/sitemap.xml` loads

## 7. Deploy

See **[DEPLOY.md](DEPLOY.md)** — step-by-step for Cloudflare Pages and GitHub
Pages, plus the exact GoDaddy DNS records. Both are free and both use your
GoDaddy domain without paying GoDaddy for hosting.

---

## 8. Office admin — edit the site without touching code

Open `/admin/` on the live site and sign in with the office Google account.
The admin can change:

- phone, WhatsApp, e-mail, address, opening hours and social links (all pages
  update from one Firestore document);
- the Google Map pin (latitude, longitude and zoom) with a live preview;
- project images, descriptions, stage, progress and dates;
- the seven-stage project cycle and its notes;
- office team accounts: approve, pause, remove, or change a role.

New sign-ins wait as **pending** until the admin approves them. Roles are
**Admin** (everything), **Office staff** (projects, notes, uploads) and
**Viewer** (read-only). Private office files are visible to every approved
account and never to the public.

The admin is also an installable app (PWA): use **Install app** in Chrome/Edge,
or Safari → Share → **Add to Home Screen** on iPhone.

**One-time setup is required before the live admin works:** create the Firebase
project, paste the keys and publish the rules. Follow
**[admin/SETUP.md](admin/SETUP.md)** — about 15 minutes. Until then the public
site keeps using the static content in `config.js`, and the admin shows the
setup screen on the live domain (it runs in local demo mode on localhost).

Live data only replaces the static content when it is available, so the site
still works with JavaScript disabled or Firebase offline. Published projects
appear in `projects.html`, and tick **Feature on the home page** to include one
in the home selection.
