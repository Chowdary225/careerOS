import { sections, type Resume, type Section, type Extraction } from "../types";
import { id } from "./repository";
import { openPdfTask } from "./pdf";
const aliases: Record<Section, RegExp> = {
  Experience: /^(professional |work |employment )?experience$/i,
  Education: /^(academic )?education$/i,
  Skills: /^(technical |core |professional )?skills$/i,
  Projects: /^(selected |personal |academic )?projects$/i,
  Certifications: /^certifications?$/i,
  Achievements: /^(awards( and)? )?achievements$/i,
};
export function extractSections(text: string): Record<Section, Extraction> {
  const result = Object.fromEntries(
    sections.map((s) => [s, { text: "", confirmed: false }]),
  ) as Record<Section, Extraction>;
  let active: Section | null = null;
  for (const line of text.split("\n")) {
    const clean = line.trim().replace(/:$/, "");
    const section = sections.find((s) => aliases[s].test(clean));
    if (section) {
      active = section;
      continue;
    }
    if (
      /^(summary|professional summary|profile|interests|references|extra.?curricular activities)$/i.test(
        clean,
      )
    ) {
      active = null;
      continue;
    }
    if (active) result[active].text += (result[active].text ? "\n" : "") + line;
  }
  return result;
}
export async function parseResume(file: File): Promise<Resume> {
  if (file.size === 0)
    throw new Error("This file is empty. Choose a readable PDF or DOCX.");
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Choose a file smaller than 10 MB.");
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!["pdf", "docx"].includes(ext || ""))
    throw new Error("Choose a PDF or DOCX file.");
  let text = "",
    pageCount = 1;
  if (ext === "pdf") {
    const task = await openPdfTask(file);
    try {
      const document = await task.promise;
      pageCount = document.numPages;
      if (pageCount > 50) {
        throw new Error("Choose a resume with 50 pages or fewer.");
      }
      for (let n = 1; n <= pageCount; n++) {
        const page = await document.getPage(n);
        const content = await page.getTextContent();
        let y: number | undefined;
        for (const item of content.items) {
          if ("str" in item) {
            if (y !== undefined && Math.abs(item.transform[5] - y) > 3)
              text += "\n";
            text += item.str + (item.hasEOL ? "\n" : " ");
            y = item.transform[5];
          }
        }
        text += "\n";
      }
    } catch (error) {
      if (error instanceof Error && error.name === "PasswordException")
        throw new Error(
          "Password-protected PDFs cannot be read. Upload an unlocked copy.",
        );
      throw error;
    } finally {
      await task.destroy();
    }
  } else {
    const { extractDocx } = await import("./docx");
    text = await extractDocx(await file.arrayBuffer());
  }
  return {
    id: id(),
    name: file.name,
    type: ext!,
    created: new Date().toISOString(),
    text: text.trim(),
    pageCount,
    extraction: extractSections(text),
  };
}
