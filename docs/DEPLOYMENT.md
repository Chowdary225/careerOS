# Static deployment preparation

## Current configuration

CareerOS is a Vite + React Router single-page app. A successful `npm run build` writes the static site to `dist/`. The build currently emits `dist/index.html`, hashed JS/CSS bundles, `/favicon.svg`, and local PDF.js character maps/fonts. `public/_redirects` contains `/* /index.html 200` for Netlify. Cloudflare Pages provides SPA fallback routing automatically when there is no top-level `404.html`; the React app renders its own not-found page for unknown paths.

All asset URLs use the domain root. Deploy at the host's root path (for example, `https://careeros.example/`); a subdirectory deployment would need a Vite `base` value and matching router basename first. No application environment variables are required or read by the current code. Do not add secrets to a frontend build: values compiled into static assets are public.

## Build and local production verification

```sh
npm ci
npm test -- --run
npm run check
npm run build
npm run preview -- --port 4173
npm run qa:routes -- http://127.0.0.1:4173
```

The route checker verifies shell responses and asset bytes from the local preview. It cannot prove the host's rewrite behavior, TLS, cache behavior, browser console, or production persistence. After deployment, open `/tracker` directly, refresh it, follow browser back/forward, and visit an unknown path. Confirm it renders CareerOS's not-found view, not a host 404.

## Cloudflare Pages setup

The current project is `careeros-app`, connected to `Chowdary225/careerOS` on production branch `main`. Its build command is `npm run build`, output directory is `dist`, and root directory is `/`. The successful deployment is available at [https://careeros-app.pages.dev](https://careeros-app.pages.dev). The deployed `/tracker` direct-load and refresh, plus an unknown route, were verified on 2026-10-14. Other deployed routes and the full browser workflow remain unverified.

The Pages dashboard settings show the Git repository connected and automatic deployments enabled for `main`. The initial build of commit `cb2b42708b0303451dc1588c70bb99059ffa7673` succeeded. A later commit has not yet been pushed to confirm a subsequent automatic deployment.

To add a custom domain, open the Pages project's **Custom domains** and follow Cloudflare's DNS instructions. For an apex domain, Cloudflare requires the domain to be on the account and its nameservers configured; for a subdomain, follow the dashboard's DNS instructions. Wait for the domain status and certificate to become active, then test HTTPS and HTTP-to-HTTPS behavior before public use. No custom domain is currently configured.

Cloudflare documents Pages' [single-page application fallback](https://developers.cloudflare.com/pages/configuration/serving-pages/), [build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/), and [custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/). Netlify uses the `_redirects` file described below.

## Netlify setup

1. Push the reviewed project to a Git repository and import it from Netlify's team dashboard.
2. Set build command `npm run build` and publish directory `dist`. No environment variables are needed.
3. Deploy to the generated Netlify URL. Confirm the deployed `/_redirects` is being applied by loading `/tracker` directly, refreshing, and checking an unknown path.
4. Add a custom domain under the site's domain settings, follow the DNS instructions for the domain registrar, wait for Netlify's HTTPS certificate provisioning, and verify HTTPS on the custom domain before sharing it.

Netlify documents the SPA fallback rule used in `public/_redirects` in its [page-not-found guide](https://docs.netlify.com/resources/troubleshooting/page-not-found-error-guide/).

## Release constraints

- The unrelated Pages project `new` was left untouched. A separate CareerOS Pages project, `careeros-app`, is deployed at `https://careeros-app.pages.dev`; the associated `careeros` Worker is separate. The GitHub connection was visible in Pages settings and automatic deployment was enabled for `main`. One deployment page briefly showed a disconnected-account warning; verify Git-triggered deployment with a subsequent commit before relying on automatic releases. No custom domain is configured.
- The app stores user workspace records in origin-scoped `localStorage` and original resume files in origin-scoped IndexedDB. There is no account login, server storage, encryption-at-rest layer, or cross-device sync. This model is appropriate for a private local demo or a public demo using synthetic data with clear disclosures; it is not appropriate for collecting real applicants' resumes as a shared hosted service without an approved privacy/security design.
- Before a public release, provide operator identity and contact details, set a policy effective date, obtain jurisdiction-specific legal review, review retention/deletion behavior, and decide whether collecting real resume data is in scope. The existing Privacy Policy and Terms describe current local-only behavior and remain drafts.
- Listings are fictional examples. A future live job source requires a permitted provider, documented terms/licensing, stable feed/API access, provenance and freshness fields, error handling and source-specific display disclosures. Application submission must remain explicitly local-demo-only until a separately authorized employer integration exists.
- The dependency audit run on 2026-10-14 reported zero known vulnerabilities. Full viewport/accessibility QA, same-profile browser-restart verification, deployed route-matrix/E2E checks, and a follow-up automatic deployment check remain open. Do not describe the service as production-ready until those release-specific checks have evidence.
