import type {
  Application,
  ApplicationEvent,
  CareerProfile,
  Job,
  Resume,
  ResumeVersion,
  Status,
  Workspace,
} from "../types";
import { id } from "./repository";
import { matchJob } from "./matching";
import { isStatus, validEmail } from "./validation";
export function createPackage(
  profile: CareerProfile,
  job: Job,
  resume: Resume,
): { application: Application; version: ResumeVersion } {
  if (!resume.text.trim())
    throw new Error(
      "Upload a resume with selectable text before preparing an application.",
    );
  const created = new Date().toISOString();
  const versionId = `RES-${id().toUpperCase()}`;
  const applicationId = `APP-${new Date().getFullYear()}-${id().toUpperCase()}`;
  const skills = matchJob(profile, job).skills;
  const text =
    (skills.length
      ? `RELEVANT PROFILE SKILLS\n${skills.join(" · ")}\n\n`
      : "") + resume.text;
  return {
    version: {
      id: versionId,
      resumeId: resume.id,
      jobId: job.id,
      created,
      text,
      status: "Draft",
    },
    application: {
      id: applicationId,
      jobId: job.id,
      versionId,
      coverLetter: "",
      answers: "",
      verified: false,
      appliedDate: null,
      status: "Prepared",
      events: [
        event(
          "Prepared",
          "Demo application prepared. Nothing sent to an employer.",
        ),
      ],
    },
  };
}
function event(status: Status, note: string): ApplicationEvent {
  return { id: id(), date: new Date().toISOString(), status, note };
}
export function approveApplication(
  data: Workspace,
  applicationId: string,
  input: { text: string; letter: string; answers: string; verified: boolean },
): Workspace {
  const application = data.applications.find((a) => a.id === applicationId);
  if (!application || application.status !== "Prepared")
    throw new Error("Only a prepared application can be approved.");
  requireVersion(data, application);
  if (!input.verified)
    throw new Error("Confirm that you reviewed the application information.");
  if (!data.profile.user.name.trim() || !validEmail(data.profile.user.email))
    throw new Error("Save your full name and email in Career Profile first.");
  if (!input.text.trim() || !input.letter.trim() || !input.answers.trim())
    throw new Error(
      "Complete the resume, cover letter and application answer before approving.",
    );
  return {
    ...data,
    versions: data.versions.map((v) =>
      v.id === application.versionId
        ? { ...v, text: input.text, status: "Reviewed" }
        : v,
    ),
    applications: data.applications.map((a) =>
      a.id === applicationId
        ? {
            ...a,
            coverLetter: input.letter,
            answers: input.answers,
            verified: true,
            status: "Approved",
            applicant: { ...data.profile.user },
            events: [
              ...a.events,
              event("Approved", "Package reviewed and approved by the user."),
            ],
          }
        : a,
    ),
  };
}
export function recordDemoApply(
  data: Workspace,
  applicationId: string,
): Workspace {
  const application = data.applications.find((a) => a.id === applicationId);
  if (!application || application.status !== "Approved")
    throw new Error("Approve the application before recording demo apply.");
  requireVersion(data, application);
  const applied = event(
    "Applied",
    "Demo apply recorded locally. No external application was submitted.",
  );
  return {
    ...data,
    applications: data.applications.map((a) =>
      a.id === applicationId
        ? {
            ...a,
            status: "Applied",
            appliedDate: applied.date,
            events: [...a.events, applied],
          }
        : a,
    ),
  };
}
export function updateApplicationStatus(
  data: Workspace,
  applicationId: string,
  status: Status,
  note: string,
): Workspace {
  if (!isStatus(status)) throw new Error("Choose a valid application status.");
  const application = data.applications.find((a) => a.id === applicationId);
  if (!application) throw new Error("Application not found.");
  if (application.status === status)
    throw new Error("Choose a different status.");
  if (["Prepared", "Approved", "Applied"].includes(status))
    throw new Error(
      "Use the Applications workspace to prepare, approve and record an application.",
    );
  if (
    !application.appliedDate &&
    ["In Review", "Shortlisted", "Interview", "Offer", "Rejected"].includes(
      status,
    )
  )
    throw new Error(
      "Approve and record the demo application before updating its progress.",
    );
  return {
    ...data,
    applications: data.applications.map((a) =>
      a.id === applicationId
        ? {
            ...a,
            status,
            events: [
              ...a.events,
              event(status, note.trim() || "Status updated manually."),
            ],
          }
        : a,
    ),
  };
}

function requireVersion(data: Workspace, application: Application) {
  const version = data.versions.find((v) => v.id === application.versionId);
  if (
    !version ||
    version.jobId !== application.jobId ||
    !data.resumes.some((r) => r.id === version.resumeId)
  )
    throw new Error(
      "This application is missing its associated resume. Restore the workspace records before continuing.",
    );
  return version;
}
export function saveApplicationDraft(
  data: Workspace,
  applicationId: string,
  input: { text: string; letter: string; answers: string; verified: boolean },
): Workspace {
  const application = data.applications.find((a) => a.id === applicationId);
  if (!application || application.status !== "Prepared")
    throw new Error("This application is read-only.");
  requireVersion(data, application);
  if (!input.text.trim()) throw new Error("Resume content cannot be empty.");
  return {
    ...data,
    versions: data.versions.map((v) =>
      v.id === application.versionId
        ? { ...v, text: input.text, status: "Draft" }
        : v,
    ),
    applications: data.applications.map((a) =>
      a.id === applicationId
        ? {
            ...a,
            coverLetter: input.letter,
            answers: input.answers,
            verified: input.verified,
          }
        : a,
    ),
  };
}
export function reviewResumeVersion(
  data: Workspace,
  versionId: string,
  text: string,
): Workspace {
  if (!text.trim()) throw new Error("Resume content cannot be empty.");
  if (!data.versions.some((v) => v.id === versionId))
    throw new Error("Resume version not found.");
  if (
    data.applications.some(
      (a) => a.versionId === versionId && a.status !== "Prepared",
    )
  )
    throw new Error(
      "This resume version is read-only because its application is approved or closed.",
    );
  return {
    ...data,
    versions: data.versions.map((v) =>
      v.id === versionId ? { ...v, text, status: "Reviewed" } : v,
    ),
    applications: data.applications.map((a) =>
      a.versionId === versionId ? { ...a, verified: false } : a,
    ),
  };
}
