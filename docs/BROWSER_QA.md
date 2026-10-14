# CareerOS browser QA

Browser work used Safari on the local production preview at `http://127.0.0.1:4173` and committed synthetic fixtures only. Exact fixture names were checked in the file picker. Do not use unrelated files from Downloads. The app stores records locally by origin and originals in IndexedDB.

## VERIFIED

- [x] Local production route/assets check: 10 application route shells and 193 built assets passed `npm run qa:routes -- http://127.0.0.1:4173`.
- [x] Final-build route/assets check after adding the host fallback: 10 route shells and 194 assets passed `npm run qa:routes -- http://127.0.0.1:4174`; `dist/_redirects` contains `/* /index.html 200`.
- [x] Responsive spot check: Safari Responsive Design Mode at 390×844 showed the dashboard's mobile header and menu control, with no obvious overlap/clipping in the visible dashboard content. This does not cover the full requested matrix.
- [x] `/tracker` opened directly and rendered Application Tracker; refreshing kept the tracker route. `/applications/tracker` resolved to `/tracker`. `/unknown-qa-route` rendered the not-found view.
- [x] PDF: uploaded `tests/fixtures/resumes/single-column.pdf`; checked parsed contact details, summary, experience, education, skills, project, certification and achievement; edited the name in review, confirmed it, and saw the saved result on Profile.
- [x] DOCX: uploaded `tests/fixtures/resumes/structured.docx`; reviewed extracted fields and confirmed them. Previously confirmed profile identity/contact data was preserved while DOCX content was merged.
- [x] Jobs: searched for a backend role, inspected local match reasons and score, saved a job, and prepared a demo application. Fictional demo data is labeled as not live vacancies.
- [x] Application: reviewed the job-specific draft, cover letter and sample answers; approved the package; recorded “Demo application.” The UI stated that no external application was submitted.
- [x] Tailored draft regression: after fixing profile/source identity precedence, prepared a new Full Stack Developer package. It showed `Asha QA Imported` and the profile-approved data rather than `LEO CHEN` and stale source content.
- [x] Tracker: application events progressed through Prepared, Approved and Applied. Changed status to Interview with a synthetic note, then refreshed; status, note and history remained visible.
- [x] Downloads: exported JSON application package and checked exact output name, nonzero size (1,864 bytes), valid JSON and expected job/version fields; downloaded original DOCX and checked 1,498 bytes and ZIP member integrity; downloaded the newly prepared profile-authoritative `RES-50294546-4C64-461C-B750-8E03DBE37260.txt` and checked its 1,410-byte UTF-8 content begins with the confirmed profile name and summary.
- [x] Reload persistence: saved profile, target role, job, confirmed resume data, application and tracker history persisted after page reloads in the same browser profile.
- [x] Safari accessibility tree exposed a skip-to-content link, main navigation links, labeled form controls and named action buttons on the checked resume/jobs/application views.

## NOT VERIFIED

- [ ] Full viewport matrix: 1440×900 desktop and 1024×768 tablet were not tested. At 390×844, only `/dashboard` was visually spot-checked; `/profile`, `/resume`, `/jobs`, `/applications`, `/tracker`, `/privacy` and `/terms` were not visually checked at that viewport. No programmatic overflow measurements were collected.
- [ ] Full browser console/network review for console errors and failed requests.
- [ ] Complete keyboard navigation, visible focus, Escape behavior, mobile menu interaction, form validation/error announcements, color contrast and heading hierarchy audit. The dashboard AX tree exposed a skip link, named nav and a mobile menu button; that is partial inspection only.
- [ ] Quit/reopen the same Safari profile to verify true browser restart persistence. A reload is not a restart test. Safari contained another unrelated user tab, so it was left open.
- [ ] Browser-only negative/edge tests for malformed, oversized, encrypted, scanned or complex-layout files. Automated tests cover representative parsing and error cases; OCR is not implemented.
- [ ] Repeat browser download validation on all browser engines. File checks were performed on generated output paths only; unrelated Downloads contents were not opened.

## BLOCKED

- [ ] Production-origin HTTPS, direct deep-link refresh, deployed assets and production smoke test: no provider/domain connection or deployment credentials were configured. Static hosting instructions are in [DEPLOYMENT.md](DEPLOYMENT.md).
- [ ] Live provider workflow: no external job source or provider credentials are configured; browser jobs are fictional demo listings.

## Reproduction commands

```sh
npm run qa:fixtures
npm run build
npm run preview -- --port 4173
npm run qa:routes -- http://127.0.0.1:4173
```

The route script checks application-shell responses and built assets only; it is not a substitute for rendered browser verification. Full verification status and limitations are recorded in [QA.md](../QA.md).
