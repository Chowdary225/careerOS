import { sections, stages, type Workspace } from "../types";
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const strings = (v: unknown, keys: string[]): v is Record<string, string> =>
  record(v) && keys.every((k) => typeof v[k] === "string");
const rows = (v: unknown, keys: string[]) =>
  Array.isArray(v) &&
  v.every((r) => strings(r, ["id", ...keys]) && r.id.trim() &&
    (r.source === undefined || isResumeSource(r.source))) &&
  new Set(v.map((r) => r.id)).size === v.length;
const list = (v: unknown) =>
  Array.isArray(v) && v.every((s) => typeof s === "string");
const date = (v: unknown) =>
  typeof v === "string" && Number.isFinite(Date.parse(v));
export function isStatus(value: unknown): value is (typeof stages)[number] {
  return typeof value === "string" && stages.some((s) => s === value);
}
/** Validate persisted, untrusted JSON before rendering it. Never silently discard records. */
export function isWorkspace(value: unknown): value is Workspace {
  if (!record(value) || !record(value.profile)) return false;
  const p = value.profile;
  if (
    !isUser(p.user) ||
    !strings(p, [
      "targetRole",
      "category",
      "location",
      "years",
      "salary",
      "mode",
      "employment",
      "achievements",
      "summary",
    ]) ||
    !list(p.targetRoles) ||
    !rows(p.skills, ["name"]) ||
    !rows(p.education, ["institution", "degree", "dates"]) ||
    !rows(p.experience, ["company", "role", "dates", "description"]) ||
    !rows(p.projects, ["name", "description"]) ||
    !rows(p.certifications, ["name", "issuer"]) ||
    (p.resumeImports !== undefined &&
      (!Array.isArray(p.resumeImports) || !p.resumeImports.every(isResumeSource)))
  )
    return false;
  const projects = p.projects as unknown as Record<string, unknown>[];
  if (!projects.every((project) =>
    (project.technologies === undefined || list(project.technologies)) &&
    (project.url === undefined || typeof project.url === "string"),
  )) return false;
  if (
    !list(value.savedJobs) ||
    !rows(value.resumes, ["name", "type", "created", "text"]) ||
    !rows(value.versions, ["resumeId", "jobId", "created", "text", "status"]) ||
    !rows(value.applications, [
      "jobId",
      "versionId",
      "coverLetter",
      "answers",
      "status",
    ])
  )
    return false;
  // Array structure was checked above. Narrow element fields individually below.
  const resumes = value.resumes as Record<string, unknown>[];
  const versions = value.versions as Record<string, unknown>[];
  const applications = value.applications as Record<string, unknown>[];
  if (
    !resumes.every(
      (r) =>
        (r.type === "pdf" || r.type === "docx") &&
        date(r.created) &&
        typeof r.pageCount === "number" &&
        Number.isInteger(r.pageCount) &&
        r.pageCount >= 1 &&
        record(r.extraction) &&
        (r.structuredConfirmed === undefined || typeof r.structuredConfirmed === "boolean") &&
        (r.structuredExtraction === undefined || isStructuredResume(r.structuredExtraction)) &&
        sections.every(
          (s) =>
            record(r.extraction) &&
            strings(r.extraction[s], ["text"]) &&
            typeof r.extraction[s].confirmed === "boolean",
        ),
    )
  )
    return false;
  if (
    !versions.every(
      (v) =>
        date(v.created) &&
        ["Draft", "Reviewed"].includes(String(v.status)) &&
        resumes.some((r) => r.id === v.resumeId),
    )
  )
    return false;
  return applications.every(
    (a) =>
      isStatus(a.status) &&
      typeof a.verified === "boolean" &&
      (a.appliedDate === null || date(a.appliedDate)) &&
      (a.applicant === undefined || isUser(a.applicant)) &&
      versions.some((v) => v.id === a.versionId && v.jobId === a.jobId) &&
      rows(a.events, ["date", "status", "note"]) &&
      Array.isArray(a.events) &&
      a.events.length > 0 &&
      a.events.every((e) => isStatus(e.status) && date(e.date)) &&
      a.events[a.events.length - 1].status === a.status,
  );
}
function isResumeSource(value: unknown): value is { resumeId: string; resumeName: string } {
  return strings(value, ["resumeId", "resumeName"]) &&
    value.resumeId.trim().length > 0 && value.resumeName.trim().length > 0;
}
function isUser(value: unknown): boolean {
  return strings(value, ["name", "email", "phone", "location"]) &&
    (value.linkedin === undefined || typeof value.linkedin === "string") &&
    (value.portfolio === undefined || typeof value.portfolio === "string") &&
    (value.source === undefined || isResumeSource(value.source));
}
function nullableString(value: unknown) {
  return value === null || typeof value === "string";
}
function isStructuredResume(value: unknown) {
  if (!record(value) || !record(value.personalInfo) || !record(value.confidence)) return false;
  const personal = value.personalInfo;
  if (!["name", "email", "phone", "location", "linkedin", "portfolio"].every((key) => nullableString(personal[key]))) return false;
  if (!nullableString(value.professionalSummary)) return false;
  if (!Array.isArray(value.skills) || !list(value.skills) || !list(value.achievements) || !list(value.reviewRequired) || !list(value.warnings)) return false;
  if (!Array.isArray(value.experience) || !value.experience.every((entry) =>
    record(entry) && ["company", "jobTitle", "location", "startDate", "endDate"].every((key) => nullableString(entry[key])) &&
    list(entry.responsibilities) && list(entry.achievements))) return false;
  if (!Array.isArray(value.education) || !value.education.every((entry) =>
    record(entry) && ["institution", "degree", "field", "location", "startDate", "endDate", "grade"].every((key) => nullableString(entry[key])))) return false;
  if (!Array.isArray(value.projects) || !value.projects.every((entry) =>
    strings(entry, ["name", "description"]) && list(entry.technologies) &&
    (entry.url === undefined || nullableString(entry.url)))) return false;
  if (!Array.isArray(value.certifications) || !value.certifications.every((entry) =>
    strings(entry, ["name"]) && nullableString(entry.issuer) && nullableString(entry.date))) return false;
  return Object.values(value.confidence).every((confidence) => confidence === "high" || confidence === "review");
}
export const validEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export function messageFor(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
