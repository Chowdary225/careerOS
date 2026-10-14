# Static deployment preparation

## Current configuration

CareerOS is a Vite + React Router single-page app. A successful `npm run build` writes the static site to `dist/`. The build currently emits `dist/index.html`, hashed JS/CSS bundles, `/favicon.svg`, and local PDF.js character maps/fonts. `public/_redirects` contains `/* /index.html 200` so Netlify and Cloudflare Pages send direct route requests to the React app. The app then renders its own not-found page for unknown paths.

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

1. Push the reviewed project to a Git repository and connect that repository under **Workers & Pages → Create application → Pages → Import an existing Git repository**.
2. Set the build command to `npm run build`, build output directory to `dist`, and root directory to the repository root. No environment variables are needed.
3. Deploy the first revision to its generated Pages URL. Check the build log and repeat the direct-route/refresh smoke test on `/tracker`, `/profile`, and an unknown path.
4. Under the Pages project's **Custom domains**, add a domain. For an apex domain, Cloudflare requires the domain to be on the account and its nameservers configured; for a subdomain, follow the dashboard's DNS instructions. Wait for the domain status and certificate to become active, then test HTTPS and HTTP-to-HTTPS behavior before public use.

Cloudflare's current documentation lists `npm run build` and `dist` for React (Vite), and documents `_redirects` as the static redirect file location: [build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/), [redirects](https://developers.cloudflare.com/pages/configuration/redirects/), [custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/).

## Netlify setup

1. Push the reviewed project to a Git repository and import it from Netlify's team dashboard.
2. Set build command `npm run build` and publish directory `dist`. No environment variables are needed.
3. Deploy to the generated Netlify URL. Confirm the deployed `/_redirects` is being applied by loading `/tracker` directly, refreshing, and checking an unknown path.
4. Add a custom domain under the site's domain settings, follow the DNS instructions for the domain registrar, wait for Netlify's HTTPS certificate provisioning, and verify HTTPS on the custom domain before sharing it.

Netlify documents the SPA fallback rule used in `public/_redirects` in its [page-not-found guide](https://docs.netlify.com/resources/troubleshooting/page-not-found-error-guide/).

## Release constraints

- No hosting provider, repository connection, custom domain, DNS access, or deployment credentials are configured in this workspace. No deployment has been performed.
- The app stores user workspace records in origin-scoped `localStorage` and original resume files in origin-scoped IndexedDB. There is no account login, server storage, encryption-at-rest layer, or cross-device sync. This model is appropriate for a private local demo or a public demo using synthetic data with clear disclosures; it is not appropriate for collecting real applicants' resumes as a shared hosted service without an approved privacy/security design.
- Before a public release, provide operator identity and contact details, set a policy effective date, obtain jurisdiction-specific legal review, review retention/deletion behavior, and decide whether collecting real resume data is in scope. The existing Privacy Policy and Terms describe current local-only behavior and remain drafts.
- Listings are fictional examples. A future live job source requires a permitted provider, documented terms/licensing, stable feed/API access, provenance and freshness fields, error handling and source-specific display disclosures. Application submission must remain explicitly local-demo-only until a separately authorized employer integration exists.
- Full viewport/accessibility QA, same-profile browser-restart verification, production-origin smoke tests, and a successful dependency audit remain open. Do not describe the service as production-ready until those release-specific checks have evidence.
