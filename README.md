# Ian Yeo – Personal Site

This repo contains the static website that showcases Ian Yeo’s leadership profile. It is designed to be **zero‑backend**, deployable on **Cloudflare Pages** for £0 / year, and automatically redeployed from GitHub with a simple GitHub Actions workflow.

---

## 📂 Project structure

```text
.
├── index.html   # main page (updated 2025‑06‑02)
├── assets/      # any images, CSS, JS you add later
└── README.md    # you are here
```

---

## 🛠 Local development

Prereqs:

* [Node.js >= 16](https://nodejs.org/) (build tooling & Wrangler)
* Cloudflare **Wrangler 2** CLI

```bash
npm i -g wrangler              # one‑time install
wrangler pages dev .           # ⚡ local server at http://localhost:8787
```

Wrangler provides live‑reload and the same headers you’ll see on Cloudflare’s edge, so what you test locally is what ships.

### Alternative quick servers (if you don’t want Wrangler)

```bash
# Python 3.x minimal
python -m http.server 8000

# npm 'serve' package (on‑demand)
npx serve .
```

---

## 🚀 Deploying to **Cloudflare Pages** (manual)

1. **Create project** → *Pages* in the Cloudflare dashboard.
2. **Connect to this GitHub repo**.
3. **Build settings**

   * **Framework preset:** **None** (static)
   * **Build command:** *(leave blank)*
   * **Output directory:** `/`
4. **Save & Deploy** – Cloudflare assigns `https://<project>.pages.dev`.
5. **Custom domain**

   * Pages → **Custom Domains** → *Add* → `ianyeo.com`.
   * In **DNS**, add CNAME records:

     | Name  | Target                |
     | ----- | --------------------- |
     | `@`   | `<project>.pages.dev` |
     | `www` | `<project>.pages.dev` |
6. Wait \~5 minutes for the free edge TLS cert → production ready.

> **Tip** Turn on **Rules → Caching → Cache Rules → Cache Everything** to serve stale copies if the origin blips.

---

## 🤖 Automatic deploy with **GitHub Actions**

The workflow below rebuilds & redeploys the site every time you push to `main`.

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          projectName: ian-yeo-site       # must match your Pages project
          directory: .                    # path to static files
```

### Setting secrets

1. In Cloudflare → **My Profile → API Tokens → Create Token**.

   * Template: **Pages – Edit**.
2. Copy the token.
3. In GitHub → *Repo* → **Settings → Secrets → Actions**.

   * Add

     * `CF_API_TOKEN`: *paste token*
     * `CF_ACCOUNT_ID`: *found in any Cloudflare API call or dashboard*

Push to `main` → live site updates in \~30 sec.

---

## 📈 Extras (optional)

| Need             | How                                                                      |
| ---------------- | ------------------------------------------------------------------------ |
| Analytics        | Turn on **Web Analytics** in Cloudflare dashboard (free, privacy‑first). |
| Staging previews | Add a “preview” branch to Pages **Production Branches**.                 |
| Fancy 404 page   | Create `404.html`; Cloudflare will serve it automatically.               |
| Edge fallback    | Deploy a tiny Worker (`wrangler deploy`) and route `ianyeo.com/*` to it. |

---

## 💸 Cost summary

| Item                                 | Yearly £ |
| ------------------------------------ | -------- |
| Cloudflare Pages hosting + bandwidth | **0**    |
| Domain (`ianyeo.com`)                | \~10     |
| **Total**                            | **≈10**  |

And that’s it—happy shipping! If you run into snags, open an issue or ping me.
