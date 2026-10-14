# CareerOS QA and release status

Last verification: 2026-10-14. CareerOS is a browser-local MVP. It has no backend, account system, cross-device synchronization, live job feed, or external AI integration. Browser checks used synthetic test resumes only.

## VERIFIED

| Area | Evidence |
|---|---|
| Automated regression | Final run: 88 tests passed across 8 files; `npm run check`, `npm run build`, and `git diff --check` passed. |
| Production route/assets check | Local production preview; `npm run qa:routes -- http://127.0.0.1:4174` passed for 10 application routes and 194 built assets. `dist/_redirects` is present with `/* /index.html 200`. The checker verifies shell responses/assets, not rendered page behavior. |
| Dependency audit | `npm audit --audit-level=low` completed on 2026-10-14 and reported 0 known vulnerabilities in the audited dependency tree. This is not a general security certification. |
| Responsive spot check | Safari Responsive Design Mode displayed `/dashboard` at 390×844 with the mobile header/menu control and no obvious visual overlap or clipped card content in the visible region. This is a single-page spot check, not the requested full viewport matrix. |
| PDF resume browser flow | In Safari, uploaded `tests/fixtures/resumes/single-column.pdf`, inspected extracted personal/contact details, summary, employment, education, skills, project, certification and achievement, edited the name, confirmed, and verified the profile update. |
| DOCX resume browser flow | In Safari, uploaded `tests/fixtures/resumes/structured.docx`, reviewed extracted details and confirmed them. Profile showed merged content while preserving previously confirmed name and contact information. |
| Tailored resume source consistency | Prepared a new Full Stack Developer demo application after the profile-authoritative formatter fix. Its draft used the confirmed profile name `Asha QA Imported`, saved summary, profile experience, education, skills, projects and certifications; it did not substitute the DOCX source name `LEO CHEN`. The original resume remains unchanged. |
| Application workflow | Safari completed job search, selected a demo role, inspected its local match breakdown, saved a job, prepared a draft, edited/reviewed the package, approved, and recorded a demo apply. The UI explicitly stated no external application was submitted. |
| Tracker workflow | `/tracker` rendered directly and survived reload. A recorded application moved through Prepared, Approved and Applied; a manual Interview update and note appeared in the history and remained after reload. Legacy `/applications/tracker` resolved to `/tracker`; an unknown path displayed the not-found page. |
| Downloads | Browser produced an application-package `.json` (1,864 bytes, parsed as valid JSON and included the expected job/resume version), original `structured.docx` (1,498 bytes; ZIP integrity test passed), and the newly prepared profile-authoritative tailored resume `RES-50294546-4C64-461C-B750-8E03DBE37260.txt` (1,410 bytes, UTF-8 text containing the confirmed profile identity/content). These were checked by exact generated filenames only. |
| Reload persistence | Profile fields, target role, saved job, resume original/confirmed extraction, application and tracker history survived page reloads within the same Safari profile. This is reload evidence only, not a browser restart test. |
| Local security boundaries | Uploaded documents are parsed in-browser with local libraries. PDF parsing disables PDF.js evaluation, DOCX content is parsed as XML text, uploaded content is not executed in the DOM, and size/page-count limits are enforced. Profile records use localStorage and original documents use IndexedDB. There is no authentication or encryption at rest. |
| Cloudflare Pages deployment | GitHub repository `Chowdary225/careerOS` appeared in the Pages repository picker. Project `careeros-app` was created with production branch `main`, build command `npm run build`, and output directory `dist`. Cloudflare reported successful deployment of commit `cb2b42708b0303451dc1588c70bb99059ffa7673` to `https://careeros-app.pages.dev`. The deployment settings show the Git repository connected and automatic deployments enabled. |
| Live production routing | In Safari, direct HTTPS navigation to `https://careeros-app.pages.dev/tracker` rendered Application Tracker; refreshing the page kept `/tracker` and rendered the same page. A direct unknown path rendered CareerOS's Page not found view. An initial request during rollout returned Cloudflare 522; retry after rollout completed succeeded. |

## NOT VERIFIED

| Area | Remaining verification |
|---|---|
| Viewport matrix | Desktop 1440×900 and tablet 1024×768 were not checked. Mobile 390×844 was visually spot-checked on `/dashboard` only. The remaining seven requested routes and programmatic horizontal-overflow measurements were not verified. |
| Browser diagnostics | Safari Web Inspector opened, but no usable console/network results were captured. Console errors and failed requests are not certified absent. |
| Accessibility sweep | Safari’s accessibility tree exposed a skip link and named navigation on the dashboard. Full keyboard order, visible focus states, Escape behavior, menu operation, form error announcements, contrast and heading structure across routes were not audited. |
| Browser restart persistence | Safari was not quit and reopened because the browser also had an unrelated user tab. Reload persistence was checked; true browser restart persistence remains unverified. |
| Extraction edge cases in browser | Automated tests cover malformed documents and representative fixtures; scanned/OCR, encrypted, oversized and complex-layout documents were not all exercised through the graphical browser. OCR is not implemented. |
| Lint | No lint script is defined in `package.json`; lint was not run. |
| Deployed route matrix and E2E | Only `/tracker` and an unknown route were checked on the deployed site. Other MVP routes, deployed application workflows, downloads, console/network diagnostics, mobile layouts, and deployed persistence were not tested. |
| Subsequent automatic deployment | The project settings show automatic deployments enabled for `main`, but a later commit has not been pushed to verify a subsequent Git-triggered build. |

## BLOCKED

| Area | Blocker |
|---|---|
| Custom domain | No CareerOS custom domain is configured. The Pages-provided `careeros-app.pages.dev` hostname is live over HTTPS; ownership of a custom domain, DNS, custom-domain TLS, and HTTP-to-HTTPS behavior on that domain are not configured or verified. |
| Live job sources | No external source/provider or permitted credentials are configured. Job listings are fictional local demo data. |
| Account security and server persistence | The current architecture is browser-local and has no authentication, server-side ownership controls or encrypted storage. |
| Legal release | Privacy and Terms are operational drafts; operator identity, contact information, jurisdiction, retention requirements and legal review remain launch requirements. |

CareerOS is not declared production-ready. A Pages deployment is live, but only the tracker direct-load/refresh and unknown-route smoke checks have been verified on that deployment. The other verification gates above remain open.
