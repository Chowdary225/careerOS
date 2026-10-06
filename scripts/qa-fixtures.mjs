import { mkdir, writeFile } from "node:fs/promises";
import { zipSync, strToU8 } from "fflate";
const directory = new URL("../tmp/qa-fixtures/", import.meta.url);
await mkdir(directory, { recursive: true });
const streams = [
  "BT /F1 18 Tf 50 740 Td (CareerOS QA fixture - page 1) Tj /F1 12 Tf 0 -45 Td (TECHNICAL SKILLS) Tj 0 -20 Td (React, TypeScript) Tj 0 -45 Td (PROJECTS) Tj 0 -20 Td (Sample test document only. Not a real applicant.) Tj ET",
  "BT /F1 18 Tf 50 740 Td (CareerOS QA fixture - page 2) Tj /F1 12 Tf 0 -45 Td (EDUCATION) Tj 0 -20 Td (Test qualification for parser QA only) Tj 0 -45 Td (ACHIEVEMENTS) Tj 0 -20 Td (Fixture content. No real achievements asserted.) Tj ET",
];
const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>",
  ...[6, 7].map(
    (content) =>
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents ${content} 0 R >>`,
  ),
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ...streams.map((s) => `<< /Length ${s.length} >>\nstream\n${s}\nendstream`),
];
let pdf = "%PDF-1.4\n";
const offsets = [];
objects.forEach((object, i) => {
  offsets.push(pdf.length);
  pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
});
const xref = pdf.length;
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((n) => String(n).padStart(10, "0") + " 00000 n ").join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
const paragraphs = [
  "CareerOS QA fixture",
  "TECHNICAL SKILLS",
  "React, TypeScript",
  "EXPERIENCE",
  "Fixture content only. Not a real applicant.",
  "EDUCATION",
  "Test qualification for parser QA",
];
const xml = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs.map((t) => `<w:p><w:r><w:t>${t}</w:t></w:r></w:p>`).join("")}</w:body></w:document>`;
const docx = zipSync({
  "[Content_Types].xml": strToU8(
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  ),
  "_rels/.rels": strToU8(
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  ),
  "word/document.xml": strToU8(xml),
});
for (const [name, bytes] of [
  ["resume-two-pages.pdf", pdf],
  ["resume.docx", docx],
  ["invalid.pdf", "Not a PDF"],
  ["malformed.docx", zipSync({ "word/document.xml": strToU8("<not-word/>") })],
  ["empty.pdf", ""],
  ["oversized.pdf", new Uint8Array(10 * 1024 * 1024 + 1)],
])
  await writeFile(new URL(name, directory), bytes);
console.log(
  `QA fixtures created in ${directory.pathname}. These files contain no personal data and are not deployed.`,
);
