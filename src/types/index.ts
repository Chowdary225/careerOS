export interface User {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  portfolio?: string;
  source?: ResumeSource;
}
export interface ResumeSource {
  resumeId: string;
  resumeName: string;
}
export interface Education {
  id: string;
  institution: string;
  degree: string;
  dates: string;
  source?: ResumeSource;
}
export interface Experience {
  id: string;
  company: string;
  role: string;
  dates: string;
  description: string;
  source?: ResumeSource;
}
export interface Skill {
  id: string;
  name: string;
  source?: ResumeSource;
}
export interface Project {
  id: string;
  name: string;
  description: string;
  technologies?: string[];
  url?: string;
  source?: ResumeSource;
}
export interface Certification {
  id: string;
  name: string;
  issuer: string;
  source?: ResumeSource;
}
export interface CareerProfile {
  user: User;
  targetRole: string;
  category: string;
  location: string;
  years: string;
  salary: string;
  mode: string;
  employment: string;
  targetRoles: string[];
  education: Education[];
  experience: Experience[];
  skills: Skill[];
  projects: Project[];
  certifications: Certification[];
  achievements: string;
  summary: string;
  resumeImports?: ResumeSource[];
}
export const sections = [
  "Experience",
  "Education",
  "Skills",
  "Projects",
  "Certifications",
  "Achievements",
] as const;
export type Section = (typeof sections)[number];
export interface Extraction {
  text: string;
  confirmed: boolean;
}
export interface Resume {
  id: string;
  name: string;
  type: string;
  created: string;
  text: string;
  pageCount: number;
  extraction: Record<Section, Extraction>;
  structuredExtraction?: StructuredResume;
  structuredConfirmed?: boolean;
}
export type ExtractionConfidence = "high" | "review";
export interface ExtractedPersonalInfo {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  portfolio: string | null;
}
export interface ExtractedExperience {
  company: string | null;
  jobTitle: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  responsibilities: string[];
  achievements: string[];
}
export interface ExtractedEducation {
  institution: string | null;
  degree: string | null;
  field: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  grade: string | null;
}
export interface ExtractedProject {
  name: string;
  description: string;
  technologies: string[];
  url: string | null;
}
export interface ExtractedCertification {
  name: string;
  issuer: string | null;
  date: string | null;
}
export interface StructuredResume {
  personalInfo: ExtractedPersonalInfo;
  professionalSummary: string | null;
  experience: ExtractedExperience[];
  education: ExtractedEducation[];
  skills: string[];
  projects: ExtractedProject[];
  certifications: ExtractedCertification[];
  achievements: string[];
  confidence: Record<string, ExtractionConfidence>;
  reviewRequired: string[];
  warnings: string[];
}
export interface ResumeVersion {
  id: string;
  resumeId: string;
  jobId: string;
  created: string;
  text: string;
  status: "Draft" | "Reviewed";
}
export interface Job {
  id: string;
  company: string;
  role: string;
  location: string;
  mode: string;
  years: number;
  employment: string;
  education: string;
  skills: string[];
  description: string;
  responsibilities: string[];
  source: string;
}
export interface JobMatch {
  percentage: number;
  roleRelevance: number;
  skills: string[];
  missing: string[];
  experience: boolean | null;
  education: boolean | null;
  location: boolean | null;
}
export const stages = [
  "Prepared",
  "Approved",
  "Applied",
  "In Review",
  "Shortlisted",
  "Interview",
  "Offer",
  "Rejected",
  "Withdrawn",
  "Expired",
  "Skipped",
] as const;
export type Status = (typeof stages)[number];
export interface ApplicationEvent {
  id: string;
  date: string;
  status: Status;
  note: string;
}
export interface Application {
  applicant?: User;
  id: string;
  jobId: string;
  versionId: string;
  coverLetter: string;
  answers: string;
  verified: boolean;
  appliedDate: string | null;
  status: Status;
  events: ApplicationEvent[];
}
export interface Workspace {
  profile: CareerProfile;
  resumes: Resume[];
  versions: ResumeVersion[];
  applications: Application[];
  savedJobs: string[];
}
