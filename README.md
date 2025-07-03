# Ian Yeo - Executive Portfolio & Gated Content System

This repository contains the source code for the personal portfolio website of Ian Yeo, a PropTech executive. The site showcases his professional experience, skills, and includes a dynamic blog. A key feature is a secure, gated content system for distributing a detailed "CEO Executive Brief" to qualified contacts.

The project is built on a modern, serverless architecture using Cloudflare's ecosystem, ensuring high performance, security, and scalability.

## Live Demo

The live website can be viewed at: [https://ianyeo.com](https://ianyeo.com)

## Features

*   **Executive Portfolio:** A comprehensive showcase of Ian Yeo's career, achievements, and expertise.
*   **Dynamic Blog:** The blog is dynamically populated from Markdown files in this repository, allowing for easy content management without requiring a traditional CMS.
*   **Gated Content System:**
    *   Users can request access to a confidential "CEO Executive Brief" via a form.
    *   The form is protected from spam and bots using Cloudflare Turnstile.
    *   Upon successful submission, a Cloudflare Worker sends a transactional email containing a secure, time-limited download link.
    *   The download link provides access to the PDF file stored in Cloudflare R2, with a limited number of downloads allowed.
*   **Serverless Architecture:** The entire backend is powered by Cloudflare Workers, providing a scalable and cost-effective solution.
*   **CI/CD:** The website and worker are automatically deployed to Cloudflare via GitHub Actions.
*   **SEO Optimised:** The website is heavily optimised for search engines, with extensive structured data (JSON-LD), meta tags, and a focus on Core Web Vitals.

## Technology Stack

*   **Frontend:**
    *   HTML5
    *   CSS3 (with custom properties for theming)
    *   JavaScript (ES6+)
*   **Backend:**
    *   Cloudflare Workers
*   **Infrastructure:**
    *   **Hosting:** Cloudflare Pages
    *   **Serverless Functions:** Cloudflare Workers
    *   **Storage:** Cloudflare R2 (for the executive brief PDF)
    *   **Database:** Cloudflare KV (for access tokens and metadata)
    *   **Security:** Cloudflare Turnstile (bot protection)
    *   **Email:** Zoho Mail (via ZeptoMail API)
*   **CI/CD:**
    *   GitHub Actions

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

*   [Node.js](https://nodejs.org/) (v16.0.0 or higher)
*   [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (Cloudflare's command-line tool)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/ianyeo1/ianyeo-com.git
    cd ianyeo-com
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Configuration

This project uses environment variables and secrets for configuration. For local development, you can create a `.dev.vars` file in the root of the project. For production, you'll need to set these in your Cloudflare dashboard.

1.  **Cloudflare Account:** You'll need a Cloudflare account with Pages, Workers, R2, and KV enabled.

2.  **KV Namespace:** Create a KV namespace for storing report access data.
    ```bash
    wrangler kv:namespace create REPORT_ACCESS
    ```
    This will output the namespace ID. Add it to your `wrangler.toml` file.

3.  **R2 Bucket:** Create an R2 bucket for storing the executive report.
    ```bash
    wrangler r2 bucket create executive-reports
    ```
    Update the bucket name in your `wrangler.toml` file.

4.  **Secrets:** You'll need to set the following secrets for the Cloudflare Worker. For local development, you can add them to a `.dev.vars` file. For production, use `wrangler secret put`.
    *   `ZOHO_API_KEY`: Your API key for the Zoho Mail/ZeptoMail service.
    *   `TURNSTILE_SECRET_KEY`: Your secret key for Cloudflare Turnstile.

5.  **Environment Variables:** The following variables are configured in `wrangler.toml`.
    *   `SITE_URL`: The URL of your website.
    *   `REPORT_FILE_KEY`: The name of the PDF file in your R2 bucket.
    *   `ZOHO_FROM_EMAIL`: The email address to send emails from (must be verified with Zoho).
    *   `TURNSTILE_SITE_KEY`: Your site key for Cloudflare Turnstile.

### Running Locally

To run the project locally, use the `wrangler dev` command. This will start a local server that emulates the Cloudflare environment.

```bash
wrangler dev
```

This will start a local development server, typically at `http://localhost:8787`.

## Deployment

The project is automatically deployed to Cloudflare using GitHub Actions. The workflow is defined in `.github/workflows/deploy.yml`.

*   **Cloudflare Pages:** The static website (HTML, CSS, JS) is deployed to Cloudflare Pages.
*   **Cloudflare Worker:** The `worker.js` file is deployed as a Cloudflare Worker.

When changes are pushed to the `main` branch, the GitHub Actions workflow will automatically build and deploy the project to Cloudflare.

## Project Structure

```
.
├── .github/              # GitHub Actions workflows
├── assets/               # Images, fonts, and other static assets
├── blog/                 # Markdown files for blog posts
├── .gitignore
├── EXECUTIVE_REPORT_SETUP.md # Setup guide for the gated report system
├── index.html            # Main HTML file
├── package.json
├── README.md             # This file
├── script.js             # Frontend JavaScript
├── SEO_IMPLEMENTATION_GUIDE.md # Guide for SEO implementation
├── style.css             # Main CSS file
├── worker.js             # Cloudflare Worker script
└── wrangler.toml         # Cloudflare Worker configuration
```

## Blog Management

The blog is managed by adding, editing, or deleting Markdown files in the `/blog` directory.

*   **Adding a Post:** Create a new file with the name format `YYYY-MM-DD-your-post-title.md`. Add frontmatter for the title, date, category, and excerpt.
*   **Editing a Post:** Simply edit the corresponding Markdown file.
*   **Deleting a Post:** Delete the Markdown file.

Changes pushed to the `main` branch will be automatically reflected on the live website. For more details, see `blog/README.md`.

## Executive Report System

The gated report system is a core feature of this project. Here's how it works:

1.  **Request:** A user fills out the form on the website to request the executive brief.
2.  **Verification:** The form submission is verified by Cloudflare Turnstile to prevent spam.
3.  **Processing:** The submission is sent to the `/api/request-report` endpoint, which is handled by the Cloudflare Worker.
4.  **Token Generation:** The worker generates a secure, unique access token.
5.  **Storage:** The access data (including the token, user information, and an expiration date) is stored in a Cloudflare KV namespace.
6.  **Email:** The worker sends an email to the user with a secure download link containing the token.
7.  **Download:** When the user clicks the link, they are taken to the `/api/download-report` endpoint. The worker validates the token, checks the download limit, and then streams the PDF file from Cloudflare R2.

This system ensures that the executive brief is only accessible to authorised users and that the access is time-limited and tracked.

## Contributing

Contributions are welcome! If you have any suggestions or find any bugs, please open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.