import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Bookmark,
  ArrowRight,
  Check,
  Plus,
  BriefcaseBusiness,
} from "lucide-react";
import { useStore } from "../app/store";
import { PageHeader, Badge, Empty, Field } from "../components/ui";
import { jobs } from "../data/jobs";
import { matchJob } from "../services/matching";
import { createPackage } from "../services/applications";
import type { Job } from "../types";
export function Jobs() {
  const { data, update, notify } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(jobs[0].id);
  const [filters, setFilters] = useState(false);
  const [location, setLocation] = useState("");
  const [mode, setMode] = useState("");
  const [employment, setEmployment] = useState("");
  const [years, setYears] = useState("");
  const [education, setEducation] = useState("");
  const [skill, setSkill] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [error, setError] = useState("");
  const filtered = jobs.filter(
    (j) =>
      (!savedOnly || data.savedJobs.includes(j.id)) &&
      `${j.role} ${j.company}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()) &&
      j.location.toLowerCase().includes(location.trim().toLowerCase()) &&
      (!mode || j.mode === mode) &&
      (!employment || j.employment === employment) &&
      (years === "" || j.years <= Number(years)) &&
      (!education || j.education === education) &&
      j.skills.join(" ").toLowerCase().includes(skill.trim().toLowerCase()),
  );
  const job = filtered.find((j) => j.id === selected) || filtered[0];
  const match = job ? matchJob(data.profile, job) : null;
  function prepare(j: Job) {
    setError("");
    const existing = data.applications.find((a) => a.jobId === j.id);
    if (existing) {
      navigate(`/applications?id=${existing.id}`);
      return;
    }

    const resume = data.resumes[0];
    if (!resume) {
      setError("Upload an original resume before preparing an application.");
      return;
    }
    if (!resume.text.trim()) {
      setError(
        "This resume has no extractable text. Upload a text-based PDF or DOCX first.",
      );
      return;
    }
    const { version, application } = createPackage(data.profile, j, resume);
    if (
      update((d) => ({
        ...d,
        versions: [...d.versions, version],
        applications: [...d.applications, application],
      }))
    ) {
      notify("Separate resume draft and application package created.");
      navigate(`/applications?id=${application.id}`);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="FIND YOUR FIT"
        title="Jobs, with context."
        description="Compare requirements. Understand the match. Prepare with intent."
        action={
          <button
            className={`button secondary ${savedOnly ? "selected" : ""}`}
            aria-pressed={savedOnly}
            onClick={() => setSavedOnly(!savedOnly)}
          >
            <Bookmark size={16} />
            {savedOnly
              ? "Show all jobs"
              : `Saved jobs (${data.savedJobs.length})`}
          </button>
        }
      />
      <div className="demo-banner">
        <span className="live-dot" />
        <strong>Demo job source</strong>
        <span>
          These fictional listings are for testing. They are not live vacancies.
        </span>
      </div>
      <div className="search-bar">
        <div className="search-input">
          <Search size={19} />
          <input
            aria-label="Search jobs"
            placeholder="Search by role or company"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          className="button secondary"
          onClick={() => setFilters(!filters)}
          aria-expanded={filters}
        >
          <SlidersHorizontal size={16} />
          Filters
        </button>
      </div>
      {filters && (
        <div className="filter-panel panel">
          <Field label="Location">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Any location"
            />
          </Field>
          <Field label="Work mode">
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="">Any mode</option>
              {["Remote", "Hybrid", "On-site"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Employment">
            <select
              value={employment}
              onChange={(e) => setEmployment(e.target.value)}
            >
              <option value="">Any type</option>
              {["Full-time", "Part-time", "Contract", "Internship"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Maximum required experience">
            <input
              type="number"
              min="0"
              value={years}
              onChange={(e) => setYears(e.target.value)}
              placeholder="Any years"
            />
          </Field>
          <Field label="Education requirement">
            <select
              value={education}
              onChange={(e) => setEducation(e.target.value)}
            >
              <option value="">All requirements</option>
              <option>Bachelor</option>
              <option>Any</option>
            </select>
          </Field>
          <Field label="Required skill">
            <input
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              placeholder="e.g. React"
            />
          </Field>
          <button
            className="text-button"
            onClick={() => {
              setLocation("");
              setMode("");
              setEmployment("");
              setYears("");
              setEducation("");
              setSkill("");
              setQuery("");
              setSavedOnly(false);
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      {error && (
        <div className="alert error" role="alert">
          {error} <Link to="/resume">Open resume workspace</Link>
        </div>
      )}
      <div className="section-heading results-heading">
        <span>
          {filtered.length} demo {filtered.length === 1 ? "role" : "roles"}
        </span>
        <small>Match based on your saved profile</small>
      </div>
      <div className="jobs-layout">
        <section className="job-list" aria-label="Job results">
          {filtered.map((j) => (
            <button
              className={`job-result ${job?.id === j.id ? "selected" : ""}`}
              key={j.id}
              aria-pressed={job?.id === j.id}
              onClick={() => setSelected(j.id)}
            >
              <div className="section-heading">
                <span className="company-monogram">
                  {j.company
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <span className="match-label">
                  {matchJob(data.profile, j).percentage}% match
                </span>
              </div>
              <h3>{j.role}</h3>
              <p>{j.company}</p>
              <div className="job-metadata">
                <span>
                  <MapPin size={13} />
                  {j.location}
                </span>
                <span>{j.mode}</span>
              </div>
              <div className="section-heading">
                <small>
                  {j.employment} · {j.years}+ years
                </small>
                {data.savedJobs.includes(j.id) && (
                  <Bookmark size={14} fill="currentColor" />
                )}
              </div>
            </button>
          ))}
          {!filtered.length && (
            <Empty title="No roles match these filters.">
              Try another role, location or skill.
            </Empty>
          )}
        </section>
        {job && match && (
          <section className="panel job-detail">
            <div className="section-heading">
              <Badge>DEMO LISTING</Badge>
              <span className="muted small">{job.id}</span>
            </div>
            <h2>{job.role}</h2>
            <p className="company-name">{job.company}</p>
            <div className="job-metadata">
              <span>
                <MapPin size={15} />
                {job.location}
              </span>
              <span>
                <BriefcaseBusiness size={15} />
                {job.employment}
              </span>
              <span>{job.mode}</span>
            </div>
            <div className="button-row">
              <button className="button" onClick={() => prepare(job)}>
                Prepare application
                <ArrowRight size={16} />
              </button>
              <button
                className="button secondary"
                aria-pressed={data.savedJobs.includes(job.id)}
                onClick={() => {
                  update((d) => ({
                    ...d,
                    savedJobs: d.savedJobs.includes(job.id)
                      ? d.savedJobs.filter((s) => s !== job.id)
                      : [...d.savedJobs, job.id],
                  }));
                }}
              >
                <Bookmark size={16} />
                {data.savedJobs.includes(job.id) ? "Saved" : "Save job"}
              </button>
            </div>
            <div className="match-panel">
              <div className="section-heading">
                <div>
                  <h3>Your match breakdown</h3>
                  <p>
                    60% skills · 20% experience · 10% education · 10% location
                  </p>
                </div>
                <strong>
                  {match.percentage}
                  <small>%</small>
                </strong>
              </div>
              <div className="progress-track">
                <i style={{ width: match.percentage + "%" }} />
              </div>
              <div className="match-grid">
                <span>
                  Skills
                  <strong>
                    {match.skills.length} / {job.skills.length}
                  </strong>
                </span>
                {(["experience", "education", "location"] as const).map(
                  (key) => (
                    <span key={key}>
                      {key}
                      <strong>
                        {match[key] === null
                          ? "Not provided"
                          : match[key]
                            ? "Matches"
                            : "Does not match"}
                      </strong>
                    </span>
                  ),
                )}
              </div>
            </div>
            <h3>About this sample role</h3>
            <p>{job.description}</p>
            <h3>Responsibilities</h3>
            <ul>
              {job.responsibilities.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <h3>Required skills</h3>
            <div className="chips">
              {job.skills.map((s) => (
                <span
                  className={`chip ${match.skills.includes(s) ? "matched" : ""}`}
                  key={s}
                >
                  {match.skills.includes(s) ? (
                    <Check size={13} />
                  ) : (
                    <Plus size={13} />
                  )}{" "}
                  {s}
                </span>
              ))}
            </div>
            <div className="eligibility">
              <h3>Eligibility</h3>
              <p>
                {job.years}+ years of experience ·{" "}
                {job.education === "Any"
                  ? "No specific degree requirement"
                  : `${job.education} degree required`}
              </p>
              <small>
                Matching is a local rules-based comparison, not an employer
                eligibility decision. Missing profile details receive no points.
              </small>
            </div>
            <div className="job-source">Source: {job.source}</div>
          </section>
        )}
      </div>
    </>
  );
}
