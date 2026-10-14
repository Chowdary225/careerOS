import { describe, expect, it } from "vitest";
import { emptyProfile } from "../src/services/repository";
import { applyStructuredResume } from "../src/services/profileImport";
import type { StructuredResume } from "../src/types";

const source = { resumeId: "resume-a", resumeName: "candidate.docx" };
const extracted: StructuredResume = {
  personalInfo: {
    name: "Asha Rao", email: "asha@example.test", phone: "+1 206 555 0198",
    location: "Seattle, WA", linkedin: "https://linkedin.com/in/asha",
    portfolio: "https://asha.example.test",
  },
  professionalSummary: "Backend engineer with distributed systems experience.",
  experience: [{
    company: "Example Systems", jobTitle: "Backend Engineer", location: "Seattle, WA",
    startDate: "Jan 2022", endDate: "Present", responsibilities: ["Built APIs"],
    achievements: ["Reduced latency by 30%"],
  }],
  education: [{
    institution: "State University", degree: "Bachelor of Technology",
    field: "Computer Science", location: "Seattle, WA", startDate: "2017",
    endDate: "2021", grade: "3.8/4.0",
  }],
  skills: ["React", "TypeScript"],
  projects: [{ name: "Inventory tool", description: "A stock dashboard.", technologies: ["React", "SQL"], url: "https://example.test/inventory" }],
  certifications: [{ name: "Cloud Practitioner", issuer: "Example Academy", date: "2024" }],
  achievements: ["Engineering award, 2023"],
  confidence: {}, reviewRequired: [], warnings: [],
};

describe("confirmed structured resume import", () => {
  it("maps structured fields and records the original resume source", () => {
    const profile = structuredClone(emptyProfile);
    const imported = applyStructuredResume(profile, extracted, source);
    expect(imported.user).toMatchObject({
      name: "Asha Rao", email: "asha@example.test", phone: "+1 206 555 0198",
      location: "Seattle, WA", linkedin: "https://linkedin.com/in/asha", source,
    });
    expect(imported.summary).toBe(extracted.professionalSummary);
    expect(imported.experience[0]).toMatchObject({
      company: "Example Systems", role: "Backend Engineer", dates: "Jan 2022 - Present",
      source, description: expect.stringContaining("Built APIs"),
    });
    expect(imported.education[0]).toMatchObject({
      institution: "State University", degree: "Bachelor of Technology - Computer Science",
      dates: "2017 - 2021", source,
    });
    expect(imported.projects[0]).toMatchObject({
      name: "Inventory tool", technologies: ["React", "SQL"],
      url: "https://example.test/inventory", source,
    });
    expect(imported.certifications[0]).toMatchObject({ name: "Cloud Practitioner", issuer: "Example Academy · 2024", source });
    expect(imported.achievements).toContain("Engineering award, 2023");
    expect(imported.resumeImports).toEqual([source]);
  });

  it("preserves existing values and avoids duplicate imports", () => {
    const profile = structuredClone(emptyProfile);
    profile.user.name = "Manual Name";
    profile.user.email = "manual@example.test";
    profile.skills = [{ id: "old", name: "React.js" }];
    profile.experience = [{
      id: "old-job", company: "Example Systems", role: "Backend Engineer",
      dates: "Jan 2022 - Present", description: "Manually entered",
    }];
    const imported = applyStructuredResume(profile, extracted, source);
    const repeated = applyStructuredResume(imported, extracted, source);
    expect(imported.user.name).toBe("Manual Name");
    expect(imported.user.email).toBe("manual@example.test");
    expect(imported.skills).toHaveLength(2);
    expect(imported.experience).toHaveLength(1);
    expect(repeated.experience).toHaveLength(1);
    expect(repeated.resumeImports).toEqual([source]);
  });
});
