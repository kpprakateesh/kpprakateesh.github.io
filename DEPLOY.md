# Deploying the Agam website (Vercel + your GoDaddy domain)

You keep the domain registered at GoDaddy and only change **DNS records** —
that is free. The public site is a plain static folder (`site/`), so it works on
Vercel, GitHub Pages or Cloudflare Pages with no build step.

**The private vault is not deployed with this site.** It stays on the office
machine and is reached only through **Tailscale** (`../vault/SETUP.md`).

Two hosting paths are documented:

- **Option A — Vercel** (recommended): fast, simple deploys, free SSL, good
  India edge presence.
- **Option B — GitHub Pages** (free fallback, already live as an interim URL).
- Option C (Cloudflare Pages) remains at the end as an alternative.

> **Vercel plan note.** The Hobby plan is for personal, non-commercial projects.
> A company website should use **Vercel Pro** (currently about US$20/month).
> If that is not wanted, use GitHub Pages or Cloudflare Pages instead — the
> site folder is identical.

---

## Option A — Vercel (recommended)

### A1. Deploy the site

From the project folder:

```bash
cd site
npx vercel login        # once, in your browser
./deploy-vercel.sh      # production deploy
```

`deploy-vercel.sh` runs `npx vercel deploy --prod`. If you prefer the dashboard:

1. Sign in at <https://vercel.com>.
2. **Add New → Project** → import the repository that contains `site/`.
3. Set **Root Directory** to `site`.
4. Framework preset: **Other**. Build command: **none**. Output directory:
   leave empty (Vercel serves the folder as-is).
5. **Deploy**. You get `https://<project>.vercel.app`.

`site/vercel.json` adds security headers (HSTS, `X-Content-Type-Options`,
`X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`,
`Cross-Origin-Opener-Policy`) and caching rules. `site/.vercelignore` keeps
`CNAME`, `DEPLOY.md` and the GitHub Pages helper files out of the upload.

> **Google sign-in / Firebase:** `Cross-Origin-Opener-Policy:
> same-origin-allow-popups` is required for the `/admin/` Google popup. Do not
> replace it with a restrictive `Content-Security-Policy` that blocks
> Google/Firebase. Add the Vercel domains to **Firebase → Authentication →
> Settings → Authorized domains** before the live admin can sign in — see
> **[admin/SETUP.md](admin/SETUP.md)**.

### A2. Point your GoDaddy domain at Vercel

1. Vercel project → **Settings → Domains → Add** → enter `agaminterio.com`.
2. Vercel shows the exact DNS records to create. Typically:
   - apex `@` → **A** `76.76.21.21`
   - `www` → **CNAME** `cname.vercel-dns.com`
   Use the values Vercel displays for your project — they can change.
3. GoDaddy → **My Products → your domain → DNS** → delete GoDaddy's default
   “Parked” A/CNAME records at `@` and `www`, then add the records above
   (TTL 600).
4. Back in Vercel, wait for both domains to show **Valid Configuration**. SSL is
   issued automatically.
5. Choose one canonical host (for example `https://www.agaminterio.com`) and set
   the other to **Redirect** in the Vercel Domains panel.

No nameserver change is needed, so e-mail and any other GoDaddy DNS records keep
working.

### A3. After the first deploy

- Run `./set-domain.sh agaminterio.com` once so canonical tags, `sitemap.xml`
  and Open Graph URLs all agree, then redeploy.
- Add `agaminterio.com`, `www.agaminterio.com` and the `*.vercel.app` address
  under **Firebase → Authentication → Settings → Authorized domains**.
- Check `https://agaminterio.com/staff-access.html` loads and that the footer
  staff link points to it.

### A4. Keep the staff vault off Vercel

`vault/` is a **separate private server**, not a folder to upload. It contains
session code, an encryption key, a database and staff records. Never add it to
the Vercel project, a public repo or any public backup.

Vercel cannot run the vault: its functions are stateless, cannot keep this
SQLite database and AES key, and cannot join the company tailnet. The vault runs
on the office machine behind **Tailscale Serve**. The public site only links to
`staff-access.html`; the real `https://….ts.net` address is stored in
`staffVaultUrl` in `assets/js/config.js` after Serve is enabled.

Full vault deployment and security guide: [`../vault/SETUP.md`](../vault/SETUP.md).

---

## Option B — GitHub Pages (free fallback, currently live)

The site is already published at **https://kpprakateesh.github.io/** as an
interim URL. Free HTTPS, 100 GB/month soft bandwidth.

### B1. Publish

1. Create a **public** repository (the interim copy uses
   `kpprakateesh/kpprakateesh.github.io`).
2. Upload the **contents of `site/`** — `index.html` must sit at the top level.
3. Repository → **Settings → Pages** → Source: **Deploy from a branch** →
   Branch: `main`, folder `/ (root)` → **Save**.
4. For a project repo the address is
   `https://kpprakateesh.github.io/<repo>/`; for the special
   `kpprakateesh.github.io` repo it is `https://kpprakateesh.github.io/`.
5. Remove `CNAME` when using the `github.io` address; keep it when using the
   real domain.

### B2. GoDaddy DNS records for GitHub Pages

GoDaddy → **DNS** → delete the default “Parked” records, then add:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | `185.199.108.153` | 600 |
| A | `@` | `185.199.109.153` | 600 |
| A | `@` | `185.199.110.153` | 600 |
| A | `@` | `185.199.111.153` | 600 |
| CNAME | `www` | `kpprakateesh.github.io` | 600 |

Then add the custom domain in **Settings → Pages** and tick **Enforce HTTPS**
after the DNS check passes.

---

## Option C — Cloudflare Pages (alternative static host)

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Upload assets**.
2. Name it `agam-website`, drag the **contents of `site/`**, deploy.
3. To use the domain, either move DNS to Cloudflare (free; still registered at
   GoDaddy) or add a `www` CNAME to `agam-website.pages.dev` and forward the apex
   at GoDaddy.
4. `_headers` (kept for non-Vercel hosts) sets the same
   `Cross-Origin-Opener-Policy: same-origin-allow-popups` header Google sign-in
   needs.

Cloudflare Access + Tunnel remains documented in `../vault/SETUP.md` only as a
fallback for staff who cannot install Tailscale. **Do not** publish the vault
this way unless that fallback is genuinely required.

---

## Which one should be the “real” one?

Pick **one** canonical address and redirect the others so search engines do not
see duplicate sites:

- Use **Vercel** for the live site at `https://agaminterio.com` (or `www`).
- Keep GitHub Pages as a staging copy on its `github.io` URL, ideally `noindex`.
- Run `./set-domain.sh agaminterio.com` once so canonical tags, the sitemap and
  Open Graph URLs all agree.

---

## After going live (30 minutes, well spent)

1. **Google Search Console** — <https://search.google.com/search-console> → add
   `agaminterio.com` → verify → submit
   `https://agaminterio.com/sitemap.xml`.
2. **Google Business Profile** — create/claim it for “Agam Interiors Pvt Ltd,
   Chennai”. Keep the name, phone and address identical to the site.
3. **Test on a phone** — header menu, form, WhatsApp button, map.
4. **Test the enquiry form** and confirm the message arrives.
5. **Share preview** — paste the URL into WhatsApp; check the image and title
   (from `assets/img/og-cover.jpg`).
6. **Backups** — keep `site/` in a private repo or cloud drive. Redeploying to
   Vercel takes under a minute.
7. **Office admin** — open `https://agaminterio.com/admin/`, sign in with
   `agaminterio@gmail.com`, approve the office Google accounts under **Team**,
   then test one staff account and one file upload. See
   [admin/SETUP.md](admin/SETUP.md).
8. **Private vault** — finish Tailscale (`../vault/SETUP.md` §2), then put the
   printed `.ts.net` address in `staffVaultUrl` and redeploy.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| “Domain is not configured” at GoDaddy | Default parked records still present | Delete the parked A record / CNAME at `@` and `www` |
| `www` works, apex does not | Missing apex record | Add the apex A record Vercel/GitHub shows, or forward to `www` |
| Vercel says “Invalid Configuration” | DNS not propagated or wrong record | Re-check the exact values in Vercel → Domains; wait up to an hour |
| HTTPS warning | Certificate still issuing | Wait 15–60 min |
| Site loads but no styling | `assets/` not uploaded beside `index.html` | Redeploy keeping the folder structure |
| Images/links broken after moving | Domain changed but `set-domain.sh` not run | Run it, then redeploy |
| Admin Google popup blocked | COOP header or unauthorised domain | Keep `same-origin-allow-popups`; add the domain in Firebase |
| Form does nothing | No `formEndpoint` set | Falls back to the visitor's mail app — see README §4 |
| Changes do not appear | Browser/CDN cache | Hard refresh (Ctrl/Cmd+Shift+R); Vercel deploys are immutable per URL |
