import { sections, stages, type Workspace } from "../types";
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const strings = (v: unknown, keys: string[]): v is Record<string, string> =>
  record(v) && keys.every((k) => typeof v[k] === "string");
const rows = (v: unknown, keys: string[]) =>
  Array.isArray(v) &&
  v.every((r) => strings(r, ["id", ...keys]) && r.id.trim()) &&
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
    !strings(p.user, ["name", "email", "phone", "location"]) ||
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
    !rows(p.certifications, ["name", "issuer"])
  )
    return false;
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
      (a.applicant === undefined ||
        strings(a.applicant, ["name", "email", "phone", "location"])) &&
      versions.some((v) => v.id === a.versionId && v.jobId === a.jobId) &&
      rows(a.events, ["date", "status", "note"]) &&
      Array.isArray(a.events) &&
      a.events.length > 0 &&
      a.events.every((e) => isStatus(e.status) && date(e.date)) &&
      a.events[a.events.length - 1].status === a.status,
  );
}
export const validEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export function messageFor(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
