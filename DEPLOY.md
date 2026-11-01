# Deploying the Agam website (free hosting + your GoDaddy domain)

You keep the domain registered at GoDaddy. You only change **DNS records** —
that is free. Nothing here requires a paid plan or GoDaddy hosting.

Two free options are documented. Cloudflare Pages is recommended (faster, free
SSL on the naked domain, no repo required). GitHub Pages is a good backup /
second copy.

---

## Option A — Cloudflare Pages (recommended)

Free tier: unlimited requests and bandwidth, free SSL/TLS, global CDN, DDoS
protection. No credit card.

### A1. Create the project

1. Sign up at <https://dash.cloudflare.com/sign-up> (free).
2. Left sidebar → **Workers & Pages** → **Create** → **Pages** → **Upload assets**.
3. Name it `agam-website`.
4. Drag the **contents of the `site/` folder** into the uploader (not the folder
   itself — `index.html` must sit at the top level). This includes `admin/` and
   the Firebase rule files. Click **Deploy**.
5. You now have `https://agam-website.pages.dev` — the site is live. Check it.

> **Before the live admin can sign anyone in**, connect Firebase and authorise
> this Pages domain. Complete **[admin/SETUP.md](admin/SETUP.md)** (Firebase
> project, Google provider, config keys, rules, authorized domains). You can
> deploy now and connect Firebase afterwards — the public site works either
> way, and `/admin/` shows the setup screen until the keys are added.

### A2. Point your GoDaddy domain at it

**Best method — move DNS to Cloudflare (still registered at GoDaddy, still free):**

1. Cloudflare dashboard → **Add a site** → enter `agaminterio.com` → Free plan.
2. Cloudflare shows two nameservers, e.g. `ada.ns.cloudflare.com` and
   `bob.ns.cloudflare.com`.
3. GoDaddy → **My Products → your domain → DNS → Nameservers → Change →
   “I'll use my own nameservers”** → paste both Cloudflare nameservers → Save.
4. Wait for Cloudflare to show the zone as **Active** (usually 10 minutes to a few
   hours; can take up to 24h).
5. Cloudflare Pages project → **Custom domains** → **Set up a custom domain** →
   enter `agaminterio.com` → **Activate**. Repeat for `www.agaminterio.com`.
   Cloudflare creates the DNS records and issues the SSL certificate for you.

**Alternative — keep GoDaddy DNS (no nameserver change):**

1. Cloudflare Pages → **Custom domains** → add `www.agaminterio.com` only.
2. GoDaddy → DNS → add a **CNAME** record: name `www`, value
   `agam-website.pages.dev`, TTL 600.
3. For the naked domain, GoDaddy → **Domain Settings → Forwarding → Add**:
   forward `agaminterio.com` → `https://www.agaminterio.com`, permanent (301).
   (Forwarding is free at GoDaddy; it cannot do “CNAME flattening” for an apex.)
4. Wait ~30 minutes, then open both `https://agaminterio.com` and
   `https://www.agaminterio.com`.

### A3. Turn on the extras (2 minutes)

- **SSL/TLS → Overview** → mode **Full (strict)**.
- **SSL/TLS → Edge Certificates** → **Always Use HTTPS** on.
- **Rules → Redirect Rules** → create: if hostname equals `agaminterio.com`,
  redirect to `https://www.agaminterio.com` (or the reverse — pick one and be
  consistent with `set-domain.sh`).
- **Speed → Optimization** → Brotli on.

`_headers` is uploaded with the site and sets
`Cross-Origin-Opener-Policy: same-origin-allow-popups`, which Google sign-in
needs for its popup. Do not remove it or replace it with a restrictive
`Content-Security-Policy` that blocks Google/Firebase. Also add
`agaminterio.com`, `www.agaminterio.com` and the `*.pages.dev` address under
**Firebase → Authentication → Settings → Authorized domains**.

### A4. Keep the staff vault off Pages

`vault/` is a **separate private server**, not a folder to upload. It contains
session code, an encryption key, a database and staff records. Never add it to
the Pages project, the GitHub repo, or any public backup.

The public site only needs one pointer: paste the vault's HTTPS address into
`staffPortal` in `assets/js/config.js`, and a discreet “Staff sign-in” footer
link appears. Full deployment and security guide: `../vault/SETUP.md`.

---

## Option B — GitHub Pages (free, keeps a copy in your GitHub account)

Your GitHub account `kpprakateesh` is already connected. Free HTTPS, 100 GB/month
soft bandwidth. Fine for this site.

### B1. Publish

1. Create a **public** repository named `agam-website` at
   <https://github.com/new> (do not add a README).
2. Upload the **contents of `site/`** (Add file → Upload files → drag everything,
   including the `assets` folder). Commit.
3. Repository → **Settings → Pages** → Source: **Deploy from a branch** →
   Branch: `main`, folder: `/ (root)` → **Save**.
4. After a minute the site is at `https://kpprakateesh.github.io/agam-website/`.
5. Same page → **Custom domain** → enter `agaminterio.com` → **Save**.
   (The `CNAME` file in this folder must contain exactly that domain.)
6. Wait for the DNS check to pass, then tick **Enforce HTTPS**.

### B2. GoDaddy DNS records for GitHub Pages

GoDaddy → **DNS** → add these (delete GoDaddy's default “Parked” A/CNAME records
first):

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | `185.199.108.153` | 600 |
| A | `@` | `185.199.109.153` | 600 |
| A | `@` | `185.199.110.153` | 600 |
| A | `@` | `185.199.111.153` | 600 |
| CNAME | `www` | `kpprakateesh.github.io` | 600 |

Then wait up to 24 hours (usually under an hour). Verify with
`dig agaminterio.com +short` — you should see the four GitHub IPs.

---

## Which one should be the “real” one?

Pick **one** as the canonical address and redirect the other, so Google does not
see duplicate sites:

- Use Cloudflare Pages as the live site (faster in India, free SSL on the apex).
- Keep GitHub Pages as a staging copy on its `github.io` URL, with a `noindex`
  header if you want it out of search results.
- Run `./set-domain.sh agaminterio.com` once so canonical tags, the sitemap and
  Open Graph URLs all agree.

---

## After going live (30 minutes, well spent)

1. **Google Search Console** — <https://search.google.com/search-console> → add
   `agaminterio.com` → verify (Cloudflare/GitHub DNS makes this easy) → submit
   `https://agaminterio.com/sitemap.xml`.
2. **Google Business Profile** — create/claim it for “Agam Interiors Pvt Ltd, Chennai”. For a local design business this drives far more
   enquiries than the website alone; make sure the name, phone and address match
   the site exactly.
3. **Test on a phone** — header menu, form, WhatsApp button, map.
4. **Test the form** from the live site and confirm the enquiry arrives.
5. **Share preview** — paste the URL into WhatsApp; check the image and title
   that appear (comes from `assets/img/og-cover.jpg`).
6. **Backups** — keep the `site/` folder in a private Git repo or a cloud drive;
   re-uploading to Cloudflare Pages takes under a minute.
7. **Office admin** — open `https://agaminterio.com/admin/`, sign in with
   `agaminterio@gmail.com`, then approve the office Google accounts under
   **Team**. Test one staff account and one file upload from a phone. Full
   setup and troubleshooting: [admin/SETUP.md](admin/SETUP.md).

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| “Domain is not configured” at GoDaddy | Default parked records still present | Delete the parked A record / CNAME at `@` and `www` |
| `www` works, apex does not | No apex record / no forwarding | Cloudflare DNS (Option A) or GoDaddy forwarding to `www` |
| HTTPS warning | Certificate still issuing | Wait 15–60 min; Cloudflare: SSL mode Full (strict) |
| Site loads but no styling | `assets/` was not uploaded at the same level as `index.html` | Re-upload keeping the folder structure |
| Images/links broken after moving | Domain changed but `set-domain.sh` not run | Run it, then redeploy |
| Form does nothing | No `formEndpoint` set | It falls back to the visitor's mail app — see README §4 |
| Changes do not appear | Browser/CDN cache | Hard refresh (Ctrl/Cmd+Shift+R); Cloudflare purges automatically on deploy |
