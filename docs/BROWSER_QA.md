# CareerOS browser QA procedure

All checks below are pending. Use synthetic data and a dedicated browser profile. Do not clear a personal workspace while testing.

```sh
npm run qa:fixtures
npm run build
npm run preview -- --port 4173
npm run qa:routes -- http://127.0.0.1:4173
```

Use the URL printed by Vite if the port changes. Generated fixtures live in `tmp/qa-fixtures/` and are not deployed. Connect the supported graphical browser before recording results. Record browser/version, OS, date, URL, viewport, steps, expected/actual results and screenshots for failures.

## Every route, every viewport

Visit `/dashboard`, `/profile`, `/resume`, `/jobs`, `/applications`, `/applications/tracker`, `/privacy`, `/terms` at each of 1440 × 900, 1024 × 768 and 390 × 844. Repeat populated pages after completing the workflow.

- [ ] No horizontal overflow, clipping, broken grid, offscreen buttons or unreadable text.
- [ ] Sidebar, sticky elements, footer links, dialogs and document scaling fit.
- [ ] All buttons and links perform their stated action; disabled actions explain prerequisites.
- [ ] Empty, loading, success and error states are understandable.
- [ ] Back/forward, direct links, refresh and unknown-route state work.
- [ ] Keyboard order and visible focus work; mobile menu supports Escape and restores focus.
- [ ] Tabs support arrows/Home/End; dialogs contain focus and close correctly.
- [ ] Screen reader announces names, roles, selected states and validation errors.
- [ ] Check rendered contrast, touch-target dimensions, 200% text zoom and reduced motion.

## Profile and jobs

- [ ] Submit missing/invalid fields, correct them, save and reload.
- [ ] Add/remove repeatable entries and skills; test duplicates and long values.
- [ ] Search and combine job filters; check zero results and save/unsave persistence.
- [ ] Confirm demo labels remain visible and preparing without prerequisites gives guidance.

## Resume

- [ ] Upload `resume-two-pages.pdf`; inspect both pages, pagination bounds and zoom 60–160%.
- [ ] Upload `resume.docx`; verify text, tabs and line breaks in the reflowed preview.
- [ ] Reject `invalid.pdf`, `malformed.docx`, `empty.pdf`, `oversized.pdf` with useful errors and recoverable upload controls.
- [ ] Separately supply synthetic scanned, password-protected and over-50-page PDFs; verify honest handling and limits.
- [ ] Review/edit/confirm extraction; absent information is not invented.
- [ ] Download each original before and after editing/version creation; compare SHA-256 with uploaded bytes (`shasum -a 256 <file>`).
- [ ] Create independent versions for two jobs; editing one does not change the other or original.
- [ ] Navigate away during upload and rapidly change pages/files; no stale content, lost state or unresolved spinner.
- [ ] Refresh, close the browser completely, reopen the same origin and verify original files, metadata and versions.

## Applications and tracker

- [ ] Prepare two applications; verify unique IDs, correct job/version associations and events.
- [ ] Saving draft text leaves it a draft. Review, write cover letter/answers, confirm accuracy, then approve.
- [ ] Invalid email/missing prerequisites block approval. Edits require confirmation again.
- [ ] Approval preserves the applicant snapshot and locks the approved version.
- [ ] Record demo apply; exact disclosure says “No external application was submitted.”
- [ ] Export package; inspect content and version association.
- [ ] Record In Review, Shortlisted, Interview, Offer, Rejected, Withdrawn, Expired and Skipped using separate test applications where needed; history remains intact.
- [ ] Check next actions, reload/restart persistence and unknown application IDs.

## Storage, privacy and runtime

- [ ] Export records and cancel deletion first; confirm nothing was removed.
- [ ] Confirm deletion; verify localStorage records and IndexedDB originals are gone after reload/restart.
- [ ] In a disposable workspace test denied storage/quota, corrupt JSON, cross-tab changes and blocked IndexedDB; errors must be visible and corrupt data exportable.
- [ ] Inspect console and network throughout: no React errors, unhandled rejections, missing modules/assets, PDF-worker errors, IndexedDB errors or unexpected external requests.
- [ ] Verify legal routes/footer links, title, favicon and metadata in the actual browser.

## Production pass

After configuring the actual host, repeat direct-load/refresh checks for all eight routes and unknown paths. Verify custom domain, HTTPS, production origin, SPA rewrites, assets, metadata and console/network on that origin. Obtain legal review and replace operator/contact placeholders. Record results in QA.md; do not infer production success from localhost.
