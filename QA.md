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

## NOT VERIFIED

| Area | Remaining verification |
|---|---|
| Viewport matrix | Desktop 1440×900 and tablet 1024×768 were not checked. Mobile 390×844 was visually spot-checked on `/dashboard` only. The remaining seven requested routes and programmatic horizontal-overflow measurements were not verified. |
| Browser diagnostics | Safari Web Inspector opened, but no usable console/network results were captured. Console errors and failed requests are not certified absent. |
| Accessibility sweep | Safari’s accessibility tree exposed a skip link and named navigation on the dashboard. Full keyboard order, visible focus states, Escape behavior, menu operation, form error announcements, contrast and heading structure across routes were not audited. |
| Browser restart persistence | Safari was not quit and reopened because the browser also had an unrelated user tab. Reload persistence was checked; true browser restart persistence remains unverified. |
| Extraction edge cases in browser | Automated tests cover malformed documents and representative fixtures; scanned/OCR, encrypted, oversized and complex-layout documents were not all exercised through the graphical browser. OCR is not implemented. |
| Lint | No lint script is defined in `package.json`; lint was not run. |

## BLOCKED

| Area | Blocker |
|---|---|
| Production deployment | Cloudflare is signed in, but its GitHub integration does not expose `Chowdary225/careerOS` (the repository search returned no match). No Pages project was created and no deployment occurred. Grant the Cloudflare Workers and Pages GitHub App access to this repository, then retry. No custom domain is owned/configured. |
| Live job sources | No external source/provider or permitted credentials are configured. Job listings are fictional local demo data. |
| Account security and server persistence | The current architecture is browser-local and has no authentication, server-side ownership controls or encrypted storage. |
| Legal release | Privacy and Terms are operational drafts; operator identity, contact information, jurisdiction, retention requirements and legal review remain launch requirements. |

CareerOS is not declared production-ready. Local automated and browser checks passed in the listed areas; deployment and the open verification gates above remain outstanding.
