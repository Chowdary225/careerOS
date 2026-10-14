import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseResume } from "../src/services/resume";
function fixtureFile(name: string) {
  const bytes = Uint8Array.from(readFileSync(join(process.cwd(), `tests/fixtures/resumes/${name}`)));
  const file = new File([bytes], name, { type: "application/pdf" });
  Object.defineProperty(file, "arrayBuffer", { value: async () => bytes.buffer.slice(0) });
  return file;
}
/** Small valid PDF fixture containing selectable text and real section headings. */
function fixture() {
  const content =
    "BT /F1 12 Tf 50 750 Td (TECHNICAL SKILLS) Tj 0 -20 Td (React and TypeScript) Tj 0 -40 Td (EDUCATION) Tj 0 -20 Td (Bachelor of Technology) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((n) => String(n).padStart(10, "0") + " 00000 n ")
    .join(
      "\n",
    )}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
it("extracts actual PDF text through PDF.js and recognizes sections", async () => {
  Object.assign(globalThis, {
    pdfjsWorker: await import("pdfjs-dist/legacy/build/pdf.worker.mjs"),
  });
  const bytes = fixture();
  const file = new File([bytes], "fixture.pdf", { type: "application/pdf" });
  Object.defineProperty(file, "arrayBuffer", {
    value: async () => bytes.buffer.slice(0),
  });
  const resume = await parseResume(file);
  expect(resume.pageCount).toBe(1);
  expect(resume.text).toContain("React and TypeScript");
  expect(resume.extraction.Skills.text.trim()).toBe("React and TypeScript");
  expect(resume.extraction.Education.text.trim()).toBe(
    "Bachelor of Technology",
  );
});

it("extracts exact structured fields from a realistic single-column PDF", async () => {
  Object.assign(globalThis, {
    pdfjsWorker: await import("pdfjs-dist/legacy/build/pdf.worker.mjs"),
  });
  const parsed = await parseResume(fixtureFile("single-column.pdf"));
  expect(parsed.structuredExtraction?.personalInfo).toMatchObject({
    name: "ASHA RAO", email: "asha.rao@example.test", phone: "+1 206 555 0198",
    location: "Seattle, WA", linkedin: "https://linkedin.com/in/asha-rao",
    portfolio: "https://asha.example.test",
  });
  expect(parsed.structuredExtraction?.professionalSummary).toBe(
    "Backend engineer focused on reliable services and distributed systems.",
  );
  expect(parsed.structuredExtraction?.experience).toEqual([
    expect.objectContaining({
      company: "Example Systems Inc.", jobTitle: "Backend Engineer",
      location: "Seattle, WA", startDate: "Jan 2022", endDate: "Present",
      responsibilities: ["Built APIs for inventory workflows."],
      achievements: ["Reduced request latency by 30%."],
    }),
    expect.objectContaining({
      company: "Northwind Technologies", jobTitle: "Software Developer",
      startDate: "Mar 2019", endDate: "Dec 2021",
      responsibilities: ["Maintained internal services."],
      achievements: ["Increased test coverage to 90%."],
    }),
  ]);
  expect(parsed.structuredExtraction?.education).toEqual([
    expect.objectContaining({
      degree: "Bachelor of Technology", field: "Computer Science",
      institution: "State University", startDate: "2015", endDate: "2019", grade: "3.8/4.0",
    }),
    expect.objectContaining({
      degree: "Master of Science", field: "Software Engineering",
      institution: "City College", startDate: "2019", endDate: "2021",
    }),
  ]);
  expect(parsed.structuredExtraction?.skills).toEqual(["Java", "React.js", "TypeScript", "SQL"]);
  expect(parsed.structuredExtraction?.projects).toEqual([
    { name: "Inventory Dashboard", description: "A dashboard for stock management.", technologies: ["React", "SQL"], url: null },
  ]);
  expect(parsed.structuredExtraction?.certifications).toEqual([
    { name: "Cloud Practitioner", issuer: "Example Academy", date: "2024" },
  ]);
  expect(parsed.structuredExtraction?.achievements).toEqual(["Engineering award, 2023"]);
});

it("warns about estimated two-column order and does not invent missing fields", async () => {
  Object.assign(globalThis, {
    pdfjsWorker: await import("pdfjs-dist/legacy/build/pdf.worker.mjs"),
  });
  const parsed = await parseResume(fixtureFile("two-column.pdf"));
  expect(parsed.structuredExtraction?.personalInfo).toMatchObject({
    name: "MIRA SHAH", email: "mira@example.test", phone: null, location: null,
    linkedin: null, portfolio: null,
  });
  expect(parsed.structuredExtraction?.skills).toEqual(["Python", "React", "PostgreSQL"]);
  expect(parsed.structuredExtraction?.experience[0]).toMatchObject({
    jobTitle: "Data Engineer", company: "Acme Labs", startDate: "2022", endDate: "Present",
    responsibilities: ["Built ETL pipelines."], achievements: ["Improved runtime by 25%."]
  });
  expect(parsed.structuredExtraction?.warnings).toContain(
    "Two-column PDF reading order was estimated from text positions. Verify section order and field assignments against the original.",
  );
  expect(parsed.structuredExtraction?.personalInfo.phone).toBeNull();
  expect(parsed.structuredExtraction?.certifications).toEqual([]);
});

it("keeps multi-page PDF text in page order and extracts later-page sections", async () => {
  Object.assign(globalThis, {
    pdfjsWorker: await import("pdfjs-dist/legacy/build/pdf.worker.mjs"),
  });
  const parsed = await parseResume(fixtureFile("multi-page.pdf"));
  expect(parsed.pageCount).toBe(2);
  expect(parsed.text.indexOf("Platform Engineer")).toBeLessThan(parsed.text.indexOf("Metro University"));
  expect(parsed.structuredExtraction?.experience[0]).toMatchObject({
    company: "Contoso Systems", jobTitle: "Platform Engineer", startDate: "Feb 2023", endDate: "Present",
  });
  expect(parsed.structuredExtraction?.education[0]).toMatchObject({
    degree: "Bachelor of Engineering", field: "Computer Science", institution: "Metro University",
  });
  expect(parsed.structuredExtraction?.certifications).toEqual([
    { name: "Security Fundamentals", issuer: "Secure Academy", date: "2025" },
  ]);
});
