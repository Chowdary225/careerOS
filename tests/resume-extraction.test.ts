import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseResume, extractStructuredResume } from "../src/services/resume";
import { extractDocx } from "../src/services/docx";
import { zipSync, strToU8 } from "fflate";

function docxFixture() {
  const bytes = Uint8Array.from(readFileSync(join(process.cwd(), "tests/fixtures/resumes/structured.docx")));
  const file = new File([bytes], "structured.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  Object.defineProperty(file, "arrayBuffer", { value: async () => bytes.buffer.slice(0) });
  return file;
}

describe("structured resume extraction", () => {
  it("extracts structured fields from DOCX paragraphs and ordered table rows", async () => {
    const parsed = await parseResume(docxFixture());
    expect(parsed.structuredExtraction?.personalInfo).toMatchObject({
      name: "LEO CHEN", email: "leo.chen@example.test", phone: "+1 415 555 0144",
      location: "Oakland, CA", linkedin: "https://linkedin.com/in/leo-chen",
    });
    expect(parsed.structuredExtraction?.professionalSummary).toBe(
      "Full-stack engineer building accessible financial applications.",
    );
    expect(parsed.structuredExtraction?.experience).toEqual([
      expect.objectContaining({
        company: "River Bank", jobTitle: "Software Engineer", startDate: "Jan 2021", endDate: "Present",
        responsibilities: ["Delivered customer account features."],
        achievements: ["Improved page load time by 40%."]
      }),
    ]);
    expect(parsed.structuredExtraction?.education).toEqual([
      expect.objectContaining({
        degree: "Bachelor of Science", field: "Information Systems", institution: "Bay University",
        startDate: "2017", endDate: "2021",
      }),
    ]);
    expect(parsed.structuredExtraction?.skills).toEqual(["TypeScript", "React.js", "PostgreSQL"]);
    expect(parsed.structuredExtraction?.projects).toEqual([
      { name: "Budget Planner", description: "A monthly budget planning app.", technologies: ["React", "TypeScript"], url: null },
    ]);
    expect(parsed.structuredExtraction?.certifications).toEqual([
      { name: "Web Accessibility Specialist", issuer: "W3C", date: "2022" },
    ]);
    expect(parsed.structuredExtraction?.achievements).toEqual([]);
    expect(parsed.text.indexOf("Email:")).toBeLessThan(parsed.text.indexOf("About Me"));
    expect(parsed.text.indexOf("Institution | Bay University")).toBeLessThan(parsed.text.indexOf("Technologies"));
  });

  it("recognizes heading variants, multiple entries, partial resumes and aliases without guessing", () => {
    const extracted = extractStructuredResume([
      "TAYLOR KIM", "taylor@example.test", "", "Career Objective", "Build reliable developer platforms.",
      "", "Employment History", "Frontend Engineer at Northstar Labs | 2022 - Current",
      "• Built a component library.", "Platform Engineer at Northstar Labs | 2020 - 2022",
      "• Cut bundle size by 20%.", "", "Academic Qualifications",
      "B.E. Computer Science | Bay University | 2016 - 2020", "", "Core Competencies",
      "ReactJS; React.js; TypeScript", "", "Personal Projects", "Status Board | Technologies: React, SQL",
      "Shows build status.", "", "Certificates", "Cloud Foundations", "",
    ].join("\n"));
    expect(extracted.personalInfo.name).toBe("TAYLOR KIM");
    expect(extracted.personalInfo.phone).toBeNull();
    expect(extracted.professionalSummary).toBe("Build reliable developer platforms.");
    expect(extracted.experience).toHaveLength(2);
    expect(extracted.experience[0]).toMatchObject({ company: "Northstar Labs", jobTitle: "Frontend Engineer", endDate: "Present" });
    expect(extracted.experience[1]).toMatchObject({ startDate: "2020", endDate: "2022", achievements: ["Cut bundle size by 20%."] });
    expect(extracted.education[0]).toMatchObject({ degree: "B.E.", field: "Computer Science", institution: "Bay University" });
    expect(extracted.skills).toEqual(["ReactJS", "TypeScript"]);
    expect(extracted.projects[0]).toEqual({ name: "Status Board", description: "Shows build status.", technologies: ["React", "SQL"], url: null });
    expect(extracted.certifications).toEqual([{ name: "Cloud Foundations", issuer: null, date: null }]);
    expect(extracted.experience[0].location).toBeNull();
    expect(extracted.education[0].grade).toBeNull();
    expect(extracted.reviewRequired).toContain("personalInfo.name");
  });

  it("extracts an explicitly labeled project URL", () => {
    const extracted = extractStructuredResume([
      "Projects", "Inventory Dashboard", "Tracks warehouse stock.",
      "Technologies: React, SQL", "GitHub: https://example.test/inventory.",
    ].join("\n"));
    expect(extracted.projects).toEqual([{
      name: "Inventory Dashboard",
      description: "Tracks warehouse stock.",
      technologies: ["React", "SQL"],
      url: "https://example.test/inventory",
    }]);
  });

  it("extracts DOCX table content without losing the original document", async () => {
    const zip = zipSync({
      "word/document.xml": strToU8(
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>FIRST</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>LEFT</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>RIGHT</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Bullet</w:t></w:r></w:p></w:body></w:document>',
      ),
    });
    expect(await extractDocx(zip.buffer as ArrayBuffer)).toBe("FIRST\nLEFT | RIGHT\n• Bullet");
  });

  it("returns a clear error for corrupt DOCX archives and missing document bodies", async () => {
    await expect(extractDocx(new TextEncoder().encode("not a zip").buffer))
      .rejects.toThrow("valid or readable DOCX");
    const zip = zipSync({
      "word/document.xml": strToU8(
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:other/></w:document>',
      ),
    });
    await expect(extractDocx(zip.buffer as ArrayBuffer)).rejects.toThrow("no readable document body");
  });
});
