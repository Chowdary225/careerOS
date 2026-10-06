import { it, expect } from "vitest";
import { parseResume } from "../src/services/resume";
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
