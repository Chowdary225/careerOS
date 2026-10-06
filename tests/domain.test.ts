import { describe, it, expect } from "vitest";
import {
  emptyWorkspace,
  emptyProfile,
  writeWorkspace,
  readWorkspace,
  storeOriginal,
  getOriginal,
  clearOriginals,
} from "../src/services/repository";
import { profileCompletion, matchJob } from "../src/services/matching";
import { extractSections, parseResume } from "../src/services/resume";
import { extractDocx } from "../src/services/docx";
import {
  createPackage,
  approveApplication,
  recordDemoApply,
  updateApplicationStatus,
} from "../src/services/applications";
import { jobs } from "../src/data/jobs";
import { zipSync, strToU8 } from "fflate";
import type { Resume } from "../src/types";
const original: Resume = {
  id: "original",
  name: "resume.pdf",
  type: "pdf",
  text: "SKILLS\nReact\nEXPERIENCE\nMy original experience",
  pageCount: 1,
  created: "2026-10-06",
  extraction: extractSections("SKILLS\nReact"),
};
function prepared() {
  const d = emptyWorkspace();
  d.profile.user = {
    name: "Test User",
    email: "test@example.com",
    phone: "",
    location: "",
  };
  d.resumes = [structuredClone(original)];
  const pkg = createPackage(d.profile, jobs[0], d.resumes[0]);
  d.applications = [pkg.application];
  d.versions = [pkg.version];
  return d;
}
describe("profile and matching", () => {
  it("has no fabricated profile information", () => {
    expect(profileCompletion(emptyProfile)).toBe(0);
    expect(emptyProfile.experience).toEqual([]);
  });
  it("awards skills only for exact normalized matches", () => {
    const p = structuredClone(emptyProfile);
    p.skills = [
      { id: "1", name: "React.js" },
      { id: "2", name: "SQL" },
    ];
    const result = matchJob(p, jobs[0]);
    expect(result.skills).toEqual(["React"]);
    expect(result.experience).toBe(null);
    expect(result.percentage).toBe(15);
  });
  it("scores complete matching criteria and accepts zero years", () => {
    const p = structuredClone(emptyProfile);
    p.skills = jobs[0].skills.map((name, id) => ({ id: String(id), name }));
    p.years = "2";
    p.education = [
      {
        id: "e",
        institution: "Test",
        degree: "Bachelor of Technology",
        dates: "2020 to 2024",
      },
    ];
    p.location = "Hyderabad, Bengaluru";
    expect(matchJob(p, jobs[0]).percentage).toBe(100);
    p.years = "0";
    expect(matchJob(p, jobs[0]).experience).toBe(false);
  });
});
describe("resume safety and extraction", () => {
  it("recognizes sections without inventing missing content", () => {
    const e = extractSections(
      "PROFESSIONAL SUMMARY\nA developer\nTECHNICAL SKILLS\nReact, TypeScript\nWORK EXPERIENCE\nDeveloper at Test\nEDUCATION\nBachelor",
    );
    expect(e.Skills.text).toBe("React, TypeScript");
    expect(e.Experience.text).toBe("Developer at Test");
    expect(e.Certifications.text).toBe("");
    expect(e.Education.confirmed).toBe(false);
  });
  it("rejects unsupported or oversized uploads", async () => {
    await expect(parseResume(new File(["x"], "resume.exe"))).rejects.toThrow(
      "PDF or DOCX",
    );
    await expect(
      parseResume(
        new File([new Uint8Array(10 * 1024 * 1024 + 1)], "resume.pdf"),
      ),
    ).rejects.toThrow("10 MB");
  });
  it("extracts real DOCX paragraphs without rendering markup", async () => {
    const zip = zipSync({
      "word/document.xml": strToU8(
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>SKILLS</w:t></w:r></w:p><w:p><w:r><w:t>React &amp; TypeScript</w:t></w:r></w:p></w:body></w:document>',
      ),
    });
    expect(await extractDocx(zip.buffer as ArrayBuffer)).toBe(
      "SKILLS\nReact & TypeScript",
    );
  });
  it("rejects invalid DOCX archives", async () => {
    const zip = zipSync({ "other.xml": strToU8("hello") });
    await expect(extractDocx(zip.buffer as ArrayBuffer)).rejects.toThrow(
      "valid DOCX",
    );
  });
  it("stores originals immutably and retrieves bytes", async () => {
    await clearOriginals();
    const file = new File(["original bytes"], "resume.pdf", {
      type: "application/pdf",
    });
    await storeOriginal(original, file);
    const restored = await getOriginal(original.id);
    expect(restored).toBeDefined();
    await expect(
      storeOriginal(original, new File(["replacement"], "resume.pdf")),
    ).rejects.toBeDefined();
    await clearOriginals();
    expect(await getOriginal(original.id)).toBeUndefined();
  });
});
describe("application lifecycle", () => {
  it("creates separate drafts and unique application IDs", () => {
    const a = createPackage(emptyProfile, jobs[0], original),
      b = createPackage(emptyProfile, jobs[0], original);
    expect(a.application.id).not.toBe(b.application.id);
    expect(a.version.resumeId).toBe(original.id);
    expect(a.version.text).toContain(original.text);
    expect(original.text).toBe(
      "SKILLS\nReact\nEXPERIENCE\nMy original experience",
    );
  });
  it("does not invent content for a scanned resume", () => {
    expect(() =>
      createPackage(emptyProfile, jobs[0], { ...original, text: "" }),
    ).toThrow("selectable text");
  });
  it("requires approval and complete verified content", () => {
    const d = prepared();
    const id = d.applications[0].id;
    expect(() => recordDemoApply(d, id)).toThrow("Approve");
    expect(() =>
      approveApplication(d, id, {
        text: "Resume",
        letter: "Letter",
        answers: "Answer",
        verified: false,
      }),
    ).toThrow("Confirm");
    expect(() =>
      approveApplication(d, id, {
        text: "Resume",
        letter: "",
        answers: "Answer",
        verified: true,
      }),
    ).toThrow("Complete");
    expect(() => updateApplicationStatus(d, id, "Interview", "")).toThrow(
      "Approve",
    );
  });
  it("persists approval, apply and timeline without altering the original", () => {
    let d = prepared();
    const id = d.applications[0].id;
    d = approveApplication(d, id, {
      text: "Reviewed factual resume",
      letter: "My letter",
      answers: "My answer",
      verified: true,
    });
    expect(d.applications[0].status).toBe("Approved");
    expect(d.applications[0].applicant?.email).toBe("test@example.com");
    d = recordDemoApply(d, id);
    d = updateApplicationStatus(d, id, "In Review", "Manually recorded");
    expect(d.applications[0].events.map((e) => e.status)).toEqual([
      "Prepared",
      "Approved",
      "Applied",
      "In Review",
    ]);
    expect(d.applications[0].appliedDate).toBeTruthy();
    expect(d.resumes[0]).toEqual(original);
    writeWorkspace(d);
    expect(readWorkspace()).toEqual(d);
  });
  it("allows alternative outcomes and rejects repeated status", () => {
    let d = prepared();
    const id = d.applications[0].id;
    d = updateApplicationStatus(d, id, "Skipped", "Not a fit");
    expect(d.applications[0].status).toBe("Skipped");
    expect(() => updateApplicationStatus(d, id, "Skipped", "")).toThrow(
      "different",
    );
  });
});
