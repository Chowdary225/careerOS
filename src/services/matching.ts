import type { CareerProfile, Job, JobMatch } from "../types";

const normalize = (value: string) =>
  value
    .toLocaleLowerCase()
    .replace(/\breact\s*\.?\s*js\b/g, "react")
    .replace(/\bnode\s*\.?\s*js\b/g, "node")
    .replace(/[^\p{L}\p{N}+#.]+/gu, " ")
    .trim();

function titleRelevance(profile: CareerProfile, role: string) {
  const targets = [...profile.targetRoles, profile.targetRole]
    .map(normalize)
    .filter(Boolean);
  if (!targets.length) return 0;
  const roleWords = new Set(normalize(role).split(/\s+/).filter(Boolean));
  const stopWords = new Set(["and", "for", "of", "the"]);
  const relevance = targets.map((target) => {
    const words = [...new Set(target.split(/\s+/).filter((word) => !stopWords.has(word)))];
    if (!words.length) return 0;
    return Math.round((words.filter((word) => roleWords.has(word)).length / words.length) * 100);
  });
  return Math.max(...relevance);
}

function locationAndModeMatch(profile: CareerProfile, job: Job): boolean | null {
  const preferredLocations = profile.location
    .split(/[,;|]/)
    .map(normalize)
    .filter(Boolean);
  const preferredMode = profile.mode && profile.mode !== "Any" ? profile.mode : "";
  if (!preferredLocations.length && !preferredMode) return null;

  const modeMatches = !preferredMode || preferredMode === job.mode;
  const locationMatches =
    !preferredLocations.length ||
    job.mode === "Remote" ||
    preferredLocations.some((location) => normalize(job.location).includes(location));
  return modeMatches && locationMatches;
}

function educationMatch(profile: CareerProfile, job: Job): boolean | null {
  if (job.education === "Any") return true;
  if (!profile.education.length) return null;
  return profile.education.some((education) =>
    /\b(bachelor|b\s*\.?\s*e\.?|b\s*\.?\s*tech|b\s*\.?\s*sc|beng|master|m\s*\.?\s*tech|m\s*\.?\s*sc|mba|ph\s*\.?\s*d)\b/i.test(
      education.degree,
    ),
  );
}

/** Deterministic comparison. This score is not an employment probability. */
export function matchJob(profile: CareerProfile, job: Job): JobMatch {
  const aliases: Record<string, string> = {
    reactjs: "react",
    "react.js": "react",
    nodejs: "node",
    "node.js": "node",
  };
  const key = (value: string) => aliases[normalize(value)] || normalize(value);
  const known = new Set(profile.skills.map((skill) => key(skill.name)));
  const skills = job.skills.filter((skill) => known.has(key(skill)));
  const missing = job.skills.filter((skill) => !known.has(key(skill)));
  const experience =
    profile.years.trim() === "" || !Number.isFinite(Number(profile.years))
      ? null
      : Number(profile.years) >= job.years;
  const education = educationMatch(profile, job);
  const location = locationAndModeMatch(profile, job);
  const roleRelevance = titleRelevance(profile, job.role);

  // Weights: skills 50, title relevance 20, experience 15, education 5, location/mode 10.
  const score =
    (job.skills.length ? (skills.length / job.skills.length) * 50 : 0) +
    roleRelevance * 0.2 +
    (experience ? 15 : 0) +
    (education ? 5 : 0) +
    (location ? 10 : 0);
  return {
    percentage: Math.round(score),
    roleRelevance,
    skills,
    missing,
    experience,
    education,
    location,
  };
}

export function profileCompletion(p: CareerProfile) {
  return Math.round(
    ([
      p.user.name,
      p.user.email,
      p.targetRole,
      p.location,
      p.years,
      p.skills.length,
      p.education.length,
      p.summary,
    ].filter((v) => String(v).trim() !== "" && v !== 0).length /
      8) *
      100,
  );
}
