import {
  sections,
  type Extraction,
  type ExtractedCertification,
  type ExtractedEducation,
  type ExtractedExperience,
  type ExtractedProject,
  type Resume,
  type Section,
  type StructuredResume,
} from "../types";
import { id } from "./repository";
import { openPdfTask } from "./pdf";

const sectionAliases: Record<Section | "Summary", string[]> = {
  Experience: [
    "experience", "work experience", "professional experience",
    "employment history", "work history", "career history",
  ],
  Education: [
    "education", "academic background", "academic qualifications",
    "educational qualifications",
  ],
  Skills: [
    "skills", "technical skills", "core competencies", "technologies",
    "technical expertise", "tools",
  ],
  Projects: ["projects", "personal projects", "academic projects", "selected projects"],
  Certifications: [
    "certifications", "certificates", "professional certifications",
  ],
  Achievements: ["achievements", "awards and achievements", "awards"],
  Summary: [
    "summary", "professional summary", "profile", "objective",
    "career objective", "about me",
  ],
};
const normalizeHeading = (line: string) =>
  line
    .trim()
    .replace(/[:：]+$/, "")
    .replace(/[|•·]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[.,;]+$/, "")
    .toLocaleLowerCase();
const headingMap = new Map<string, Section | "Summary">(
  Object.entries(sectionAliases).flatMap(([section, aliases]) =>
    aliases.map((alias) => [normalizeHeading(alias), section as Section | "Summary"]),
  ),
);
function detectHeading(line: string): Section | "Summary" | null {
  const normalized = normalizeHeading(line);
  const exact = headingMap.get(normalized);
  if (exact) return exact;
  // Common heading decorations, e.g. "Professional Experience & Internships".
  const candidate = normalized.replace(/\s+(and|&)\s+(internships?|projects?|tools?)$/, "");
  return headingMap.get(candidate) || null;
}

export function normalizeResumeText(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\t ]+\n/g, "\n")
    .replace(/\n[\t ]+/g, "\n")
    .replace(/[\t ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractSections(text: string): Record<Section, Extraction> {
  const result = Object.fromEntries(
    sections.map((section) => [section, { text: "", confirmed: false }]),
  ) as Record<Section, Extraction>;
  let active: Section | "Summary" | null = null;
  for (const line of normalizeResumeText(text).split("\n")) {
    const heading = detectHeading(line);
    if (heading) {
      active = heading;
      continue;
    }
    if (active && active !== "Summary") {
      result[active].text += (result[active].text ? "\n" : "") + line.trim();
    }
  }
  return result;
}

type Line = { text: string; start: number; end: number; y: number };
const month = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const dateAtom = `(?:${month}\\.?\\s+)?(?:19|20)\\d{2}|present|current|now`;
const dateRangeRe = new RegExp(`(${dateAtom})\\s*(?:-|to|until)\\s*(${dateAtom})`, "i");
const singleDateRe = new RegExp(`\\b(${dateAtom})\\b`, "i");
function normalizedDate(value: string | undefined) {
  if (!value) return null;
  const clean = value.trim().replace(/\.$/, "");
  if (/^(present|current|now)$/i.test(clean)) return "Present";
  return clean.replace(/\b([a-z])/i, (letter) => letter.toUpperCase());
}
function datesIn(line: string) {
  const range = dateRangeRe.exec(line);
  if (range) return {
    startDate: normalizedDate(range[1]), endDate: normalizedDate(range[2]),
    rest: `${line.slice(0, range.index)} ${line.slice(range.index + range[0].length)}`.trim(),
  };
  const single = singleDateRe.exec(line);
  if (single) return {
    startDate: normalizedDate(single[1]), endDate: null,
    rest: `${line.slice(0, single.index)} ${line.slice(single.index + single[0].length)}`.trim(),
  };
  return { startDate: null, endDate: null, rest: line };
}
const bullets = (line: string) => line.trim().replace(/^[•●▪◦*-]+\s*/, "").trim();
const companyWords = /\b(inc\.?|llc|ltd\.?|corp\.?|corporation|company|technologies|technology|solutions|systems|university|college|institute|hospital|group|agency|labs?)\b/i;
const titleWords = /\b(engineer|developer|architect|manager|analyst|designer|consultant|administrator|specialist|director|lead|intern|scientist|officer|coordinator|associate|professor|teacher|nurse|accountant|executive)\b/i;
function labeledValue(line: string, label: string) {
  const match = line.match(new RegExp(`^${label}\\s*:\\s*(.+)$`, "i"));
  return match?.[1]?.trim() || null;
}
function emptyExperience(): ExtractedExperience {
  return {
    company: null, jobTitle: null, location: null, startDate: null,
    endDate: null, responsibilities: [], achievements: [],
  };
}
function parseExperience(lines: string[]): ExtractedExperience[] {
  const entries: ExtractedExperience[] = [];
  let current: ExtractedExperience | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const dates = datesIn(line);
    const explicitCompany = labeledValue(line, "(?:company|employer|organization)");
    const explicitTitle = labeledValue(line, "(?:job title|title|role|position)");
    const explicitLocation = labeledValue(line, "location");
    const headerText = dates.rest.trim().replace(/[|•]+\s*$/, "").trim();
    const atMatch = headerText.match(/^(.+?)\s+at\s+(.+)$/i);
    const parts = headerText.split(/\s*[|•]\s*/).map((s) => s.trim()).filter(Boolean);
    const headerLike = !!(dates.startDate || explicitCompany || explicitTitle || atMatch ||
      (parts.length >= 2 && parts.some((part) => titleWords.test(part) || companyWords.test(part))));
    if (headerLike) {
      if (current) entries.push(current);
      current = emptyExperience();
      current.startDate = dates.startDate;
      current.endDate = dates.endDate;
      current.company = explicitCompany;
      current.jobTitle = explicitTitle;
      current.location = explicitLocation;
      if (atMatch) {
        current.jobTitle ||= atMatch[1].trim();
        current.company ||= atMatch[2].trim();
      } else {
        const candidates = parts.length > 1 ? parts : dates.rest.split(/\s+-\s+/);
        for (const part of candidates) {
          if (!current.jobTitle && titleWords.test(part) && !companyWords.test(part)) current.jobTitle = part;
          if (!current.company && companyWords.test(part) && !titleWords.test(part)) current.company = part;
        }
      }
      const unlabeled = parts.find((part) => /^[\p{L}][\p{L} .'-]*,\s*(?:[A-Z]{2}|[A-Z][a-z]+)(?:,\s*\d{5})?$/u.test(part));
      if (!current.location && unlabeled) current.location = unlabeled;
      continue;
    }
    if (!current) {
      if (explicitCompany || explicitTitle || explicitLocation) {
        current = emptyExperience();
        current.company = explicitCompany;
        current.jobTitle = explicitTitle;
        current.location = explicitLocation;
      } else continue;
    }
    const company = labeledValue(line, "(?:company|employer|organization)");
    const title = labeledValue(line, "(?:job title|title|role|position)");
    const location = labeledValue(line, "location");
    if (company) current.company = company;
    else if (title) current.jobTitle = title;
    else if (location) current.location = location;
    else {
      const item = bullets(line);
      if (!item) continue;
      if (/\b(increased|improved|reduced|saved|awarded|recognized|achieved|raised|cut)\b|\b\d+\s*%/i.test(item))
        current.achievements.push(item);
      else current.responsibilities.push(item);
    }
  }
  if (current) entries.push(current);
  return entries.filter((entry) =>
    entry.company || entry.jobTitle || entry.startDate || entry.location ||
    entry.responsibilities.length || entry.achievements.length,
  );
}

const degreeRe = /\b(b\.?\s?tech(?:nology)?|b\.?\s?e\.?|bachelor(?:'s)?(?: of (?:technology|engineering|science|arts|commerce|business administration))?|b\.?\s?sc\.?|m\.?\s?tech|m\.?\s?sc\.?|master(?:'s)?(?: of (?:science|arts|technology|engineering|business administration))?|m\.?\s?b\.?\s?a\.?|mba|ph\.?\s?d\.?|doctorate|associate(?:'s)? degree|diploma)\b/i;
function parseEducation(lines: string[]): ExtractedEducation[] {
  const entries: ExtractedEducation[] = [];
  let current: ExtractedEducation = { institution: null, degree: null, field: null,
    location: null, startDate: null, endDate: null, grade: null };
  const hasData = () => Object.values(current).some((value) => value !== null);
  const flush = () => { if (hasData()) entries.push(current); current = {
    institution: null, degree: null, field: null, location: null,
    startDate: null, endDate: null, grade: null,
  }; };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const dates = datesIn(line);
    const degree = degreeRe.exec(line);
    const parts = line.split(/\s*[|•]\s*/).map((part) => part.trim()).filter(Boolean);
    const degreePart = parts.find((part) => degreeRe.test(part)) || line;
    const degreeMatch = degreeRe.exec(degreePart);
    const institutionLabel = labeledValue(line, "(?:institution|school|university|college)");
    const degreeLabel = labeledValue(line, "(?:degree|qualification)");
    const institutionPart = parts.find((part) => /\b(university|college|institute|school)\b/i.test(part) && !degreeRe.test(part));
    const grade = line.match(/\b(?:GPA|CGPA|grade|score)\s*:?\s*([\d.]+(?:\s*\/\s*[\d.]+)?)/i);
    if (degree && current.degree && (current.institution || current.startDate || current.field)) flush();
    current.startDate ||= dates.startDate;
    current.endDate ||= dates.endDate;
    current.institution ||= institutionLabel;
    current.institution ||= institutionPart || null;
    const degreeValue = degreeMatch?.[0].trim() || null;
    const displayDegree = degreeValue && /^b\.?\s?e\.?$/i.test(degreeValue)
      ? "B.E."
      : degreeValue;
    current.degree ||= degreeLabel || displayDegree;
    if (degreeMatch) {
      const tail = degreePart.slice(degreeMatch.index + degreeMatch[0].length).trim().replace(/^[.,:;-]+\s*/, "");
      const field = tail.match(/^(?:(?:in|of)\s+)?(.+?)(?:\s*[,|]\s*(?:GPA|CGPA|Grade)\b.*)?$/i);
      if (field && !/^(in|of)$/i.test(field[1].trim())) current.field ||= field[1].trim();
    }
    if (!current.institution && /\b(university|college|institute|school)\b/i.test(line) && !degree)
      current.institution = dates.rest.trim() || line;
    const location = labeledValue(line, "location");
    if (location) current.location = location;
    if (grade) current.grade = grade[1];
  }
  flush();
  return entries;
}

function splitItems(lines: string[]) {
  return lines.flatMap((line) =>
    line.split(/\s*[•●▪◦]\s*|\s*;\s*|\s*,\s*(?=[A-Z][A-Za-z+#.\- ]{1,30}$)/)
      .map(bullets).filter(Boolean),
  );
}
function dedupeSkills(values: string[]) {
  const aliases: Record<string, string> = {
    reactjs: "react", "react.js": "react", nodejs: "node.js", "node js": "node.js",
    javascript: "javascript", js: "js", typescript: "typescript",
  };
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLocaleLowerCase().replace(/\s+/g, " ").trim();
    const canonical = aliases[key] || key;
    if (seen.has(canonical)) return false;
    seen.add(canonical);
    return true;
  });
}
function parseProjects(lines: string[]): ExtractedProject[] {
  const entries: ExtractedProject[] = [];
  let name = "";
  let description: string[] = [];
  let technologies: string[] = [];
  let url: string | null = null;
  const flush = () => {
    if (!name) return;
    entries.push({ name, description: description.join(" ").trim(), technologies, url });
    name = ""; description = []; technologies = []; url = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    const tech = line.match(/(?:technologies|tech stack|tools)\s*:\s*(.+)$/i)?.[1];
    if (tech) {
      technologies = splitItems([tech]);
      if (/^(?:technologies|tech stack|tools)\s*:/i.test(line)) continue;
    }
    const explicitName = labeledValue(line, "(?:project name|project)");
    if (explicitName) { flush(); name = explicitName; continue; }
    const urlMatch = line.match(/(?:link|url|demo|github)\s*:\s*(https?:\/\/\S+)|\b(https?:\/\/\S+)/i);
    if (urlMatch) {
      url = (urlMatch[1] || urlMatch[2]).replace(/[),.;]+$/, "");
    }
    const descriptionLine = urlMatch
      ? line.replace(urlMatch[0], "").replace(/^\s*(?:link|url|demo|github)\s*:\s*$/i, "").trim()
      : line;
    if (!name) {
      const delimiter = descriptionLine.match(/^([^|:]{2,80})\s*[|:]\s*(.+)$/);
      name = (delimiter?.[1] || bullets(descriptionLine)).trim();
      if (delimiter && !tech) description.push(delimiter[2].trim());
    } else if (descriptionLine) description.push(bullets(descriptionLine));
  }
  flush();
  return entries;
}
function parseCertifications(lines: string[]): ExtractedCertification[] {
  return lines.map((line) => line.trim()).filter(Boolean).map((line) => {
    const parts = line.split(/\s*[|•]\s*/).map((part) => part.trim()).filter(Boolean);
    const name = labeledValue(line, "(?:certification|certificate|name)") ||
      parts.find((part) => !/^(issuer|issued by|provider|date|issued|year)\s*:/i.test(part)) || bullets(line);
    return {
      name,
      issuer: parts.map((part) => labeledValue(part, "(?:issuer|issued by|provider)")).find(Boolean) || null,
      date: parts.map((part) => labeledValue(part, "(?:date|issued|year)")).find(Boolean) || null,
    };
  }).filter((item) => item.name.length > 1);
}

function extractStructuredFromLines(text: string, warnings: string[] = []): StructuredResume {
  const lines = normalizeResumeText(text).split("\n");
  const grouped: Record<Section | "Summary", string[]> = {
    Experience: [], Education: [], Skills: [], Projects: [],
    Certifications: [], Achievements: [], Summary: [],
  };
  const header: string[] = [];
  let active: Section | "Summary" | null = null;
  for (const line of lines) {
    const heading = detectHeading(line);
    if (heading) { active = heading; continue; }
    if (active) grouped[active].push(line);
    else header.push(line);
  }
  const headerText = header.join("\n");
  const email = headerText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || null;
  const phone = headerText.match(/(?:\+?\d[\d ().-]{7,}\d)/)?.[0]?.trim() || null;
  const urls = headerText.match(/(?:https?:\/\/|www\.)[^\s|]+/gi) || [];
  const linkedin = urls.find((url) => /linkedin\.com\//i.test(url)) ||
    headerText.match(/(?:linkedin\s*:\s*)([^\s|]+)/i)?.[1] || null;
  const portfolio = urls.find((url) => !/linkedin\.com\//i.test(url)) ||
    headerText.match(/(?:portfolio|website|web\s*:\s*)([^\s|]+)/i)?.[1] || null;
  const location = headerText.match(/\b(?:location|based in|address)\s*:\s*([^\n|]+)/i)?.[1]?.trim() || null;
  const roleWords = /\b(engineer|developer|architect|manager|analyst|designer|consultant|student|resume|curriculum vitae)\b/i;
  const nameCandidate = header.find((line) => {
    const value = line.trim();
    const words = value.split(/\s+/);
    return value && !value.includes("@") && !/https?:|www\.|linkedin|phone|email|location|portfolio/i.test(value) &&
      words.length <= 4 && /^[\p{L}][\p{L}'’.-]*(?:\s+[\p{L}][\p{L}'’.-]*){0,3}$/u.test(value) &&
      !roleWords.test(value) && !companyWords.test(value) && !dateRangeRe.test(value);
  }) || null;
  const summary = grouped.Summary.join("\n").trim() || null;
  const experience = parseExperience(grouped.Experience);
  const education = parseEducation(grouped.Education);
  const skills = dedupeSkills(grouped.Skills.flatMap((line) =>
    line.split(/[,;|]/).map(bullets).filter(Boolean),
  ));
  const projects = parseProjects(grouped.Projects);
  const certifications = parseCertifications(grouped.Certifications);
  const achievements = grouped.Achievements.map(bullets).filter(Boolean);
  const confidence: StructuredResume["confidence"] = {};
  const reviewRequired: string[] = [];
  const mark = (path: string, high: boolean) => {
    confidence[path] = high ? "high" : "review";
    if (!high) reviewRequired.push(path);
  };
  if (email) mark("personalInfo.email", true);
  if (phone) mark("personalInfo.phone", true);
  if (linkedin) mark("personalInfo.linkedin", true);
  if (portfolio) mark("personalInfo.portfolio", true);
  if (location) mark("personalInfo.location", /^(location|based in|address)\s*:/i.test(header.find((line) => /^(location|based in|address)\s*:/i.test(line.trim())) || ""));
  if (nameCandidate) mark("personalInfo.name", false);
  if (summary) mark("professionalSummary", false);
  experience.forEach((entry, index) => {
    mark(`experience.${index}`, !!(entry.jobTitle && entry.company && entry.startDate));
    if (!entry.company || !entry.jobTitle) warnings.push(`Experience ${index + 1} has incomplete identity fields; review it manually.`);
  });
  education.forEach((entry, index) => {
    mark(`education.${index}`, !!(entry.degree && entry.institution));
    if (!entry.degree || !entry.institution) warnings.push(`Education ${index + 1} has incomplete identity fields; review it manually.`);
  });
  if (skills.length) mark("skills", true);
  projects.forEach((_, index) => mark(`projects.${index}`, false));
  certifications.forEach((_, index) => mark(`certifications.${index}`, false));
  if (achievements.length) mark("achievements", false);
  if (warnings.length === 0 && reviewRequired.length === 0) warnings.push("Review all extracted information against the original resume before confirming.");
  return {
    personalInfo: { name: nameCandidate, email, phone, location, linkedin, portfolio },
    professionalSummary: summary,
    experience,
    education,
    skills,
    projects,
    certifications,
    achievements,
    confidence,
    reviewRequired,
    warnings,
  };
}

export function extractStructuredResume(text: string): StructuredResume {
  return extractStructuredFromLines(text);
}

export function replaceSectionText(text: string, section: Section, replacement: string) {
  const lines = normalizeResumeText(text).split("\n");
  let start = -1;
  let end = lines.length;
  for (let index = 0; index < lines.length; index++) {
    if (detectHeading(lines[index]) !== section) continue;
    start = index;
    for (let next = index + 1; next < lines.length; next++) {
      if (detectHeading(lines[next])) { end = next; break; }
    }
    break;
  }
  if (start < 0) return normalizeResumeText(`${text}\n\n${section}\n${replacement}`);
  return normalizeResumeText([
    ...lines.slice(0, start + 1),
    replacement.trim(),
    ...lines.slice(end),
  ].join("\n"));
}

function linesFromPdfItems(items: { str: string; x: number; y: number; width: number; hasEOL: boolean }[], pageWidth: number) {
  const grouped: { y: number; items: typeof items }[] = [];
  for (const item of items) {
    let line = grouped.find((candidate) => Math.abs(candidate.y - item.y) <= 3);
    if (!line) { line = { y: item.y, items: [] }; grouped.push(line); }
    line.items.push(item);
  }
  const lines: Line[] = grouped.flatMap((line) => {
    const sorted = line.items.sort((a, b) => a.x - b.x);
    const clusters: typeof items[] = [];
    for (const item of sorted) {
      const cluster = clusters.at(-1);
      const previous = cluster?.at(-1);
      if (!cluster || (previous && item.x - (previous.x + previous.width) > Math.max(42, pageWidth * 0.065)))
        clusters.push([item]);
      else cluster.push(item);
    }
    return clusters.map((cluster) => ({
      text: cluster.map((item) => item.str.trim()).filter(Boolean).join(" "),
      start: Math.min(...cluster.map((item) => item.x)),
      end: Math.max(...cluster.map((item) => item.x + item.width)),
      y: line.y,
    })).filter((entry) => entry.text);
  });
  // A wide, persistent gutter between line origins is evidence of two columns.
  const origins = [...new Set(lines.map((line) => Math.round(line.start / 8) * 8))].sort((a, b) => a - b);
  const gaps = origins.slice(1).map((x, index) => ({ x: (x + origins[index]) / 2, gap: x - origins[index] }));
  const split = gaps.filter(({ gap }) => gap >= Math.max(64, pageWidth * 0.14)).sort((a, b) => b.gap - a.gap)[0]?.x;
  if (!split) return { text: lines.sort((a, b) => b.y - a.y).map((line) => line.text).join("\n"), twoColumn: false };
  const left = lines.filter((line) => line.start < split && line.end < split + pageWidth * 0.08).sort((a, b) => b.y - a.y);
  const right = lines.filter((line) => line.start >= split || line.end >= split + pageWidth * 0.08).sort((a, b) => b.y - a.y);
  const wide = lines.filter((line) => line.start < split && line.end >= split + pageWidth * 0.08).sort((a, b) => b.y - a.y);
  return { text: [...wide, ...left, ...right].map((line) => line.text).join("\n"), twoColumn: true };
}

export async function parseResume(file: File): Promise<Resume> {
  if (file.size === 0) throw new Error("This file is empty. Choose a readable PDF or DOCX.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Choose a file smaller than 10 MB.");
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!["pdf", "docx"].includes(ext || "")) throw new Error("Choose a PDF or DOCX file.");
  let text = "";
  let pageCount = 1;
  let twoColumn = false;
  if (ext === "pdf") {
    const task = await openPdfTask(file);
    try {
      const document = await task.promise;
      pageCount = document.numPages;
      if (pageCount > 50) throw new Error("Choose a resume with 50 pages or fewer.");
      const pageTexts: string[] = [];
      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        const items = content.items.flatMap((item) => "str" in item ? [{
          str: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width,
          hasEOL: item.hasEOL,
        }] : []);
        const layout = linesFromPdfItems(items, page.view[2] - page.view[0]);
        const annotations = await page.getAnnotations();
        const links = annotations.flatMap((annotation) =>
          typeof annotation.url === "string" && annotation.url.trim() ? [annotation.url.trim()] : [],
        );
        pageTexts.push(normalizeResumeText(`${layout.text}\n${[...new Set(links)].join("\n")}`));
        twoColumn ||= layout.twoColumn;
      }
      text = pageTexts.join("\n\n");
    } catch (error) {
      if (error instanceof Error && error.name === "PasswordException")
        throw new Error("Password-protected PDFs cannot be read. Upload an unlocked copy.");
      throw error;
    } finally {
      await task.destroy();
    }
  } else {
    const { extractDocx } = await import("./docx");
    text = await extractDocx(await file.arrayBuffer());
  }
  text = normalizeResumeText(text);
  const structuredExtraction = extractStructuredFromLines(text,
    twoColumn ? ["Two-column PDF reading order was estimated from text positions. Verify section order and field assignments against the original."] : [],
  );
  return {
    id: id(), name: file.name, type: ext!, created: new Date().toISOString(),
    text, pageCount, extraction: extractSections(text), structuredExtraction,
  };
}
