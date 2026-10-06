export interface User {
  name: string;
  email: string;
  phone: string;
  location: string;
}
export interface Education {
  id: string;
  institution: string;
  degree: string;
  dates: string;
}
export interface Experience {
  id: string;
  company: string;
  role: string;
  dates: string;
  description: string;
}
export interface Skill {
  id: string;
  name: string;
}
export interface Project {
  id: string;
  name: string;
  description: string;
}
export interface Certification {
  id: string;
  name: string;
  issuer: string;
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
