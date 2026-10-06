import type { Job } from "../types";
export const jobs: Job[] = [
  {
    id: "DEMO-001",
    company: "Sample Studio",
    role: "Frontend Developer",
    location: "Bengaluru",
    mode: "Hybrid",
    years: 1,
    employment: "Full-time",
    education: "Bachelor",
    skills: ["React", "TypeScript", "CSS", "Git"],
    description:
      "A fictional product team building accessible web experiences. This listing exists only to demonstrate job matching and application preparation.",
    responsibilities: [
      "Build reusable React interfaces and accessible interaction patterns.",
      "Collaborate with design and backend teams.",
      "Write tests and improve application performance.",
    ],
    source: "Local demo repository",
  },
  {
    id: "DEMO-002",
    company: "Example Systems",
    role: "Full Stack Developer",
    location: "Remote",
    mode: "Remote",
    years: 2,
    employment: "Full-time",
    education: "Bachelor",
    skills: ["React", "Node.js", "PostgreSQL", "REST APIs"],
    description:
      "A sample full stack role for exploring how your profile maps to technical requirements. This is not a live vacancy.",
    responsibilities: [
      "Develop web applications across the frontend and backend.",
      "Design REST APIs and relational data models.",
      "Maintain authentication and automated tests.",
    ],
    source: "Local demo repository",
  },
  {
    id: "DEMO-003",
    company: "Demo Research",
    role: "Product Designer",
    location: "Hyderabad",
    mode: "On-site",
    years: 0,
    employment: "Internship",
    education: "Any",
    skills: ["Figma", "Prototyping", "User research"],
    description:
      "A fictional design internship used to demonstrate profile-based matching. No applications are sent to an employer.",
    responsibilities: [
      "Explore user needs through research.",
      "Prototype and document product interactions.",
      "Work with engineers on usable interfaces.",
    ],
    source: "Local demo repository",
  },
  {
    id: "DEMO-004",
    company: "Sample Infrastructure",
    role: "Backend Developer",
    location: "Remote",
    mode: "Remote",
    years: 3,
    employment: "Contract",
    education: "Any",
    skills: ["Python", "SQL", "Docker", "REST APIs"],
    description:
      "A sample backend role with explicit requirements for testing filters and matching.",
    responsibilities: [
      "Build and maintain backend services.",
      "Improve data access and API reliability.",
      "Document technical decisions.",
    ],
    source: "Local demo repository",
  },
];
