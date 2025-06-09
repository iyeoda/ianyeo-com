# Ian Yeo – Personal Site

[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-F38020?style=flat&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fianyeo.com)](https://ianyeo.com)

A zero-backend personal website showcasing Ian Yeo's leadership profile. Deployed on Cloudflare Pages for £0/year with automatic GitHub Actions deployment.

## 📋 Table of Contents

- [Project Structure](#-project-structure)
- [Local Development](#-local-development)
- [Deployment](#-deployment)
- [GitHub Actions](#-automatic-deploy-with-github-actions)
- [Extras](#-extras)
- [Cost Summary](#-cost-summary)

## 📂 Project Structure

```text
.
├── index.html   # Main page (updated 2025‑06‑02)
├── assets/      # Static assets (images, CSS, JS)
└── README.md    # Documentation
```

## 🛠 Local Development

### Prerequisites

- [Node.js ≥ 16](https://nodejs.org/) (for build tooling & Wrangler)
- Cloudflare Wrangler 2 CLI

### Quick Start

```bash
# Install Wrangler CLI (one-time setup)
npm i -g wrangler

# Start local development server
wrangler pages dev .  # ⚡ http://localhost:8787
```

Wrangler provides live-reload and the same headers you'll see on Cloudflare's edge, ensuring local testing matches production.

### Alternative Development Servers

```bash
# Python 3.x minimal server
python -m http.server 8000

# npm 'serve' package
npx serve .
```

## 🚀 Deployment

### Manual Deployment to Cloudflare Pages

1. **Create Project**
   - Go to Cloudflare Dashboard → Pages
   - Connect to this GitHub repository

2. **Configure Build Settings**
   - Framework preset: None (static)
   - Build command: (leave blank)
   - Output directory: `/`

3. **Deploy**
   - Click "Save & Deploy"
   - Cloudflare assigns `https://<project>.pages.dev`

4. **Setup Custom Domain**
   - Pages → Custom Domains → Add → `ianyeo.com`
   - Add DNS CNAME records:

   | Name  | Target                |
   |-------|----------------------|
   | `@`   | `<project>.pages.dev`|
   | `www` | `<project>.pages.dev`|

5. Wait ~5 minutes for edge TLS certificate

> 💡 **Pro Tip**: Enable "Rules → Caching → Cache Rules → Cache Everything" for better reliability.

## 🤖 Automatic Deploy with GitHub Actions

The workflow automatically rebuilds and redeploys on pushes to `main`:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

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
          projectName: ian-yeo-site
          directory: .
```

### Setting Up Secrets

1. **Create API Token**
   - Cloudflare → My Profile → API Tokens → Create Token
   - Select template: "Pages – Edit"
   - Copy the generated token

2. **Add GitHub Secrets**
   - GitHub → Repo → Settings → Secrets → Actions
   - Add:
     - `CF_API_TOKEN`: Your Cloudflare API token
     - `CF_ACCOUNT_ID`: Your Cloudflare account ID

Push to `main` → site updates in ~30 seconds.

## 📈 Extras

| Feature          | Implementation                                    |
|------------------|--------------------------------------------------|
| Analytics        | Enable Web Analytics in Cloudflare dashboard     |
| Staging Previews | Add "preview" branch to Production Branches      |
| Custom 404       | Create `404.html` for custom error page          |
| Edge Fallback    | Deploy Worker (`wrangler deploy`) for fallback   |

## 💸 Cost Summary

| Item                              | Yearly £ |
|-----------------------------------|----------|
| Cloudflare Pages (hosting + BW)   | **0**    |
| Domain (`ianyeo.com`)            | ~10      |
| **Total**                        | **≈10**  |

---

Need help? Open an issue or reach out directly!
