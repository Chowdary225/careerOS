# CareerOS

A browser-local career workspace built with React, TypeScript, Vite, Tailwind CSS, React Router and Lucide icons. The original resume workspace image informs the dark graphite interface. The attached resume image informs the document-first approach; no personal details from the reference documents are bundled.

## Run locally

Requires Node.js 20.19+ (Node 22 LTS recommended).

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vite, normally http://127.0.0.1:5173.

```sh
npm run check
npm test
npm run build
npm run qa:fixtures
npm run preview -- --port 4173
```

With the preview running, run `npm run qa:routes -- http://127.0.0.1:4173` to check local route serving and built asset integrity.

## Included workspaces

- `/dashboard`: calculated profile completion, local application counts, next actions and recent activity.
- `/profile`: validated career requirements, contact details, structured experience and education, skills, projects, certifications, achievements and multiple target roles.
- `/resume`: real PDF/DOCX upload, PDF canvas preview and pagination, DOCX plain-text preview, local text extraction, editable section review, actual text-readability checks, immutable original-file downloads and separate tailored versions.
- `/jobs`: explicitly fictional jobs, search, combined filters, saving, deterministic matching and application preparation.
- `/applications`: separate resume drafts, cover letters, answers, reviewed applicant snapshots, approval, local demo apply and JSON package export.
- `/applications/tracker`: per-application history, primary stages and alternative outcomes, manual status updates and next actions.
- `/privacy` and `/terms`: draft operational disclosures for legal review. Privacy includes record export and confirmed local deletion.

## Try the workflow

1. Save your name, email and target role in Career Profile. Add skills and preferences as appropriate.
2. Upload a PDF or DOCX under Resume. Files must be no larger than 10 MB; PDFs are limited to 50 pages.
3. Review and confirm the extracted sections. This never changes the original file or its extracted source text.
4. Browse the demo jobs. Select **Prepare application** to create an independently stored resume draft and unique application ID.
5. Review the resume, write a cover letter and answer the sample question. Confirm accuracy and approve the package.
6. Select **Record demo apply**. No external submission occurs.
7. Open Application Tracker and record subsequent statuses manually.

## Architecture and data boundaries

- `src/types`: typed domain models.
- `src/services/repository.ts`: localStorage workspace records and an IndexedDB original-file store. Originals use `add`, never an overwrite operation.
- `src/services/resume.ts` and `docx.ts`: local PDF.js parsing and DOCX XML text extraction using fflate. Neither sends documents to an external service or executes uploaded document markup.
- `src/services/matching.ts`: transparent matching rules, weighted 60% skills, 20% experience, 10% education, 10% preferred location. Unknown details receive no points. This is not a hiring prediction.
- `src/services/applications.ts`: preparation, approval validation, applicant snapshots, demo application recording and timeline transitions.
- `src/app/store.tsx`: repository-backed shared state with storage error reporting, stale-update protection and cross-tab conflict detection. Reload after a cross-tab conflict. Corrupt records are preserved for export from Privacy; clearing them requires explicit deletion.
- PDF character maps and fonts are copied from the installed dependency at build time and served locally with the worker.
- `src/pages` and `src/components`: routed workspaces and shared presentation.
- `src/data/jobs.ts`: the replaceable demo source. No listings imply real vacancies.

No backend, authentication, analytics, external AI, automatic application system or future-feature navigation is included. Connect real providers behind the repository and service boundaries when those features are authorized.

## Explicit limitations

- Data belongs to a browser and origin; it does not synchronize. Browser storage is not an encrypted vault, can be unavailable, and can be cleared. Export records and download originals for backups. Record exports omit binary originals.
- PDF parsing requires selectable text. Scanned documents need OCR, which is not implemented. Password-protected or malformed files report errors.
- Extraction uses section headings and needs human review. It is not AI inference and may miss nonstandard headings. Confirmed extraction edits are kept separately; application drafts start from the original extracted text and explicitly entered matching profile skills.
- DOCX preview is reflowed plain text, not a facsimile. Embedded images, headers and complex layouts are not reproduced.
- Tailored resumes are editable plain-text drafts, exported as `.txt`; no automatic PDF generation or third-party ATS certification is claimed.
- Approved or closed application versions are read-only. The applicant information at approval is retained with the package.
- Demo apply records only local state. It sends nothing to an employer.
- Privacy and Terms are drafts. Operator identity, real contact details, jurisdiction and legal review remain launch requirements.

## Verification

All 71 automated tests and the production build pass; the current dependency audit reports zero known vulnerabilities. See [QA.md](QA.md) for scoped evidence and open launch gates, and [the browser checklist](docs/BROWSER_QA.md) for pending graphical checks. The app is a functional local MVP, not a declared production-ready deployment.

## Deployment

`npm run build` writes `dist/`. A static host must rewrite unknown application paths to `index.html` for React Router deep links. Configure a custom domain, HTTPS and public metadata for the actual host before launch. Do not publish personal browser data or test document files.
