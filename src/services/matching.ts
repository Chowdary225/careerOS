import type { CareerProfile, Job, JobMatch } from "../types";
const normalize = (s: string) => s.toLowerCase().trim().replace(/\.js$/, "");
export function matchJob(profile: CareerProfile, job: Job): JobMatch {
  const known = profile.skills.map((s) => normalize(s.name));
  const skills = job.skills.filter((s) => known.includes(normalize(s)));
  const missing = job.skills.filter((s) => !skills.includes(s));
  const experience =
    profile.years.trim() === "" ? null : Number(profile.years) >= job.years;
  const education =
    job.education === "Any"
      ? true
      : profile.education.length
        ? profile.education.some((e) =>
            /\b(bachelor|btech|b\.tech|bsc|b\.sc|master|mtech|beng)\b/i.test(
              e.degree,
            ),
          )
        : null;
  const location = profile.location
    ? job.mode === "Remote" ||
      profile.location
        .toLowerCase()
        .split(",")
        .some((s) => s.trim() === job.location.toLowerCase())
    : null;
  return {
    percentage: Math.round(
      (job.skills.length ? skills.length / job.skills.length : 0) * 60 +
        (experience ? 20 : 0) +
        (education ? 10 : 0) +
        (location ? 10 : 0),
    ),
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
