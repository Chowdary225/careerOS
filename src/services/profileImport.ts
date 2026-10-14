import type { CareerProfile, ResumeSource, StructuredResume } from "../types";
import { id } from "./repository";

const norm = (value: string) =>
  value.toLocaleLowerCase().replace(/\s+/g, " ").trim().replace(/[.,]/g, "");
const skillKey = (value: string) => {
  const key = norm(value).replace(/\s/g, "");
  return ({ reactjs: "react", "react.js": "react", nodejs: "node.js", "node.js": "node.js" } as Record<string, string>)[key] || key;
};
function mergeUnique<T>(existing: T[], incoming: T[], key: (value: T) => string) {
  const seen = new Set(existing.map(key));
  return [...existing, ...incoming.filter((value) => {
    const valueKey = key(value);
    if (!valueKey || seen.has(valueKey)) return false;
    seen.add(valueKey);
    return true;
  })];
}
function mergeText(existing: string, incoming: string[]) {
  const additions = incoming.map((value) => value.trim()).filter(Boolean)
    .filter((value) => !existing.includes(value));
  return additions.length ? [existing.trim(), ...additions].filter(Boolean).join("\n\n") : existing;
}
const dateText = (start: string | null, end: string | null) =>
  [start, end].filter(Boolean).join(" - ");

/** Safely merge user-confirmed structured extraction; never replace existing profile values. */
export function applyStructuredResume(
  profile: CareerProfile,
  extracted: StructuredResume,
  source: ResumeSource,
): CareerProfile {
  const personal = extracted.personalInfo;
  const user = { ...profile.user };
  for (const key of ["name", "email", "phone", "location", "linkedin", "portfolio"] as const) {
    const value = personal[key]?.trim();
    if (value && !user[key]?.trim()) user[key] = value;
  }
  if (Object.values(personal).some(Boolean)) user.source ||= source;

  const experience: CareerProfile["experience"] = extracted.experience
    .filter((entry) => entry.company || entry.jobTitle || entry.location || entry.startDate || entry.endDate || entry.responsibilities.length || entry.achievements.length)
    .map((entry) => ({
      id: id(), company: entry.company || "", role: entry.jobTitle || "",
      dates: dateText(entry.startDate, entry.endDate),
      description: [
        entry.responsibilities.length ? `Responsibilities:\n${entry.responsibilities.map((line) => `• ${line}`).join("\n")}` : "",
        entry.achievements.length ? `Achievements:\n${entry.achievements.map((line) => `• ${line}`).join("\n")}` : "",
        entry.location ? `Location: ${entry.location}` : "",
      ].filter(Boolean).join("\n\n"), source,
    }));
  const education: CareerProfile["education"] = extracted.education
    .filter((entry) => entry.institution || entry.degree || entry.field || entry.location || entry.startDate || entry.endDate || entry.grade)
    .map((entry) => ({
      id: id(), institution: entry.institution || "",
      degree: [entry.degree, entry.field].filter(Boolean).join(" - "),
      dates: dateText(entry.startDate, entry.endDate),
      source,
    }));
  const skills: CareerProfile["skills"] = extracted.skills.map((name) => ({ id: id(), name, source }));
  const projects: CareerProfile["projects"] = extracted.projects.map((project) => ({
    id: id(), name: project.name,
    description: project.description,
    technologies: project.technologies,
    ...(project.url ? { url: project.url } : {}),
    source,
  }));
  const certifications: CareerProfile["certifications"] = extracted.certifications.map((certification) => ({
    id: id(), name: certification.name,
    issuer: [certification.issuer, certification.date].filter(Boolean).join(" · "),
    source,
  }));
  const experienceKey = (entry: (typeof experience)[number]) =>
    norm([entry.company, entry.role, entry.dates].join("|"));
  const educationKey = (entry: (typeof education)[number]) =>
    norm([entry.institution, entry.degree, entry.dates].join("|"));
  const projectKey = (entry: (typeof projects)[number]) => norm(entry.name);
  const certificationKey = (entry: (typeof certifications)[number]) => norm(entry.name);
  const mergedSkills = mergeUnique(profile.skills, skills, (entry) => skillKey(entry.name));
  const mergedExperience = mergeUnique(profile.experience, experience, experienceKey);
  const mergedEducation = mergeUnique(profile.education, education, educationKey);
  const mergedProjects = mergeUnique(profile.projects, projects, projectKey);
  const mergedCertifications = mergeUnique(profile.certifications, certifications, certificationKey);
  const previousImports = profile.resumeImports || [];
  const resumeImports = mergeUnique(previousImports, [source], (value) => value.resumeId);
  return {
    ...profile,
    user,
    summary: profile.summary.trim() || extracted.professionalSummary || "",
    experience: mergedExperience,
    education: mergedEducation,
    skills: mergedSkills,
    projects: mergedProjects,
    certifications: mergedCertifications,
    achievements: mergeText(profile.achievements, extracted.achievements),
    resumeImports,
  };
}
