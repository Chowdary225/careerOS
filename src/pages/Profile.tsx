import { useEffect, useState } from "react";
import { Plus, X, Check, Save } from "lucide-react";
import { useStore } from "../app/store";
import { PageHeader, Field, Badge, RouteButton } from "../components/ui";
import { id } from "../services/repository";
import { Tabs } from "../components/Tabs";
import { validEmail } from "../services/validation";
import type { CareerProfile } from "../types";
export function Profile() {
  const { data, update, notify } = useStore();
  const [p, setP] = useState<CareerProfile>(structuredClone(data.profile));
  const [tab, setTab] = useState("Requirements");
  const [skill, setSkill] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [attempted, setAttempted] = useState(false);
  useEffect(() => {
    if (error)
      document
        .querySelector<HTMLElement>('.profile-layout [aria-invalid="true"]')
        ?.focus();
  }, [error, tab]);
  const change = <K extends keyof CareerProfile>(
    key: K,
    value: CareerProfile[K],
  ) => {
    setP({ ...p, [key]: value });
    setSaved(false);
  };
  function save() {
    setAttempted(true);
    setSaved(false);
    if (!p.user.name.trim() || !p.user.email.trim() || !p.targetRole.trim()) {
      setTab("Requirements");
      setError(
        "Add your full name, a valid email and a target role before saving.",
      );
      return;
    }
    if (!validEmail(p.user.email)) {
      setTab("Requirements");
      setError("Enter a valid email address.");
      return;
    }
    if (
      p.years !== "" &&
      (!Number.isFinite(Number(p.years)) ||
        Number(p.years) < 0 ||
        Number(p.years) > 60)
    ) {
      setTab("Requirements");
      setError("Experience must be between 0 and 60 years.");
      return;
    }
    if (
      p.education.some((e) => !e.source && (!e.institution.trim() || !e.degree.trim())) ||
      p.experience.some((e) => !e.source && (!e.company.trim() || !e.role.trim()))
    ) {
      setTab("Professional profile");
      setError("Complete or remove empty education and experience entries.");
      return;
    }
    if (
      p.projects.some((v) => !v.name.trim()) ||
      p.certifications.some((v) => !v.name.trim())
    ) {
      setTab("Professional profile");
      setError("Name each project and certification, or remove empty entries.");
      return;
    }
    if (update((d) => ({ ...d, profile: p }))) {
      setError("");
      setSaved(true);
      notify("Career profile saved on this device.");
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="THE FOUNDATION"
        title="Career profile"
        description="Your experience, your preferences, your next direction."
        action={
          <button className="button" onClick={save}>
            {saved ? <Check size={16} /> : <Save size={16} />}{" "}
            {saved ? "Saved" : "Save profile"}
          </button>
        }
      />
      <Tabs
        id="profile"
        label="Profile sections"
        options={["Requirements", "Professional profile", "Target roles"].map(
          (value) => ({ value, label: value }),
        )}
        value={tab}
        onChange={setTab}
      />
      {error && (
        <div role="alert" className="alert error">
          {error}
        </div>
      )}
      <div
        className="profile-layout"
        id="profile-panel"
        role="tabpanel"
        aria-labelledby={`profile-tab-${["Requirements", "Professional profile", "Target roles"].indexOf(tab)}`}
        tabIndex={0}
      >
        <section className="panel form-panel">
          {tab === "Requirements" ? (
            <>
              <div className="section-heading">
                <div>
                  <h2>Career requirements</h2>
                  <p>Make your search specific to you.</p>
                </div>
                <Badge>01</Badge>
              </div>
              {p.user.source && (
                <p className="muted small">
                  Personal information imported from Original Resume: {p.user.source.resumeName}. Please review it.
                </p>
              )}
              <div className="form-grid">
                <Field
                  label="Full name *"
                  required
                  error={
                    attempted && !p.user.name.trim()
                      ? "Enter your full name."
                      : undefined
                  }
                >
                  <input
                    id="profile-full-name"
                    name="name"
                    value={p.user.name}
                    autoComplete="name"
                    onChange={(e) =>
                      change("user", { ...p.user, name: e.target.value })
                    }
                  />
                </Field>
                <Field
                  label="Email address *"
                  required
                  error={
                    attempted && !validEmail(p.user.email)
                      ? "Enter a valid email address."
                      : undefined
                  }
                >
                  <input
                    id="profile-email"
                    name="email"
                    type="email"
                    value={p.user.email}
                    autoComplete="email"
                    onChange={(e) =>
                      change("user", { ...p.user, email: e.target.value })
                    }
                  />
                </Field>
                <Field label="Phone">
                  <input
                    id="profile-phone"
                    name="phone"
                    type="tel"
                    value={p.user.phone}
                    autoComplete="tel"
                    onChange={(e) =>
                      change("user", { ...p.user, phone: e.target.value })
                    }
                  />
                </Field>
                <Field label="Current location">
                  <input
                    id="profile-current-location"
                    name="personal-location"
                    value={p.user.location}
                    onChange={(e) =>
                      change("user", { ...p.user, location: e.target.value })
                    }
                  />
                </Field>
                <Field label="LinkedIn profile">
                  <input
                    id="profile-linkedin"
                    name="linkedin"
                    type="url"
                    value={p.user.linkedin || ""}
                    onChange={(e) => change("user", { ...p.user, linkedin: e.target.value })}
                  />
                </Field>
                <Field label="Portfolio or website">
                  <input
                    id="profile-portfolio"
                    name="portfolio"
                    type="url"
                    value={p.user.portfolio || ""}
                    onChange={(e) => change("user", { ...p.user, portfolio: e.target.value })}
                  />
                </Field>
                <Field
                  label="Target job role *"
                  required
                  error={
                    attempted && !p.targetRole.trim()
                      ? "Enter a target role."
                      : undefined
                  }
                >
                  <input
                    placeholder="e.g. Full Stack Developer"
                    value={p.targetRole}
                    onChange={(e) => change("targetRole", e.target.value)}
                  />
                </Field>
                <Field label="Job category">
                  <select
                    value={p.category}
                    onChange={(e) => change("category", e.target.value)}
                  >
                    {[
                      "Engineering",
                      "Design",
                      "Product",
                      "Data",
                      "Operations",
                      "Other",
                    ].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Preferred locations"
                  hint="Separate multiple locations with commas."
                >
                  <input
                    placeholder="e.g. Bengaluru, Hyderabad"
                    value={p.location}
                    onChange={(e) => change("location", e.target.value)}
                  />
                </Field>
                <Field
                  label="Years of experience"
                  error={
                    attempted &&
                    p.years !== "" &&
                    (!Number.isFinite(Number(p.years)) ||
                      Number(p.years) < 0 ||
                      Number(p.years) > 60)
                      ? "Use a number between 0 and 60."
                      : undefined
                  }
                >
                  <input
                    type="number"
                    min="0"
                    max="60"
                    step="0.5"
                    value={p.years}
                    onChange={(e) => change("years", e.target.value)}
                  />
                </Field>
                <Field
                  label="Salary preference"
                  hint="Optional. Include currency and pay period."
                >
                  <input
                    placeholder="e.g. INR 8,00,000 per year"
                    value={p.salary}
                    onChange={(e) => change("salary", e.target.value)}
                  />
                </Field>
                <Field label="Work mode">
                  <select
                    value={p.mode}
                    onChange={(e) => change("mode", e.target.value)}
                  >
                    {["Any", "Remote", "Hybrid", "On-site"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Employment type">
                  <select
                    value={p.employment}
                    onChange={(e) => change("employment", e.target.value)}
                  >
                    {["Full-time", "Part-time", "Contract", "Internship"].map(
                      (v) => (
                        <option key={v}>{v}</option>
                      ),
                    )}
                  </select>
                </Field>
              </div>
            </>
          ) : tab === "Target roles" ? (
            <>
              <h2>Target roles</h2>
              <p className="muted">
                Keep a shortlist of the roles you want to explore.
              </p>
              <form
                className="inline-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (
                    role.trim() &&
                    !p.targetRoles.some(
                      (r) => r.toLowerCase() === role.trim().toLowerCase(),
                    )
                  ) {
                    change("targetRoles", [...p.targetRoles, role.trim()]);
                    setRole("");
                  }
                }}
              >
                <input
                  aria-label="New target role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Add a target role"
                />
                <button
                  className="button secondary"
                  disabled={
                    !role.trim() ||
                    p.targetRoles.some(
                      (r) => r.toLowerCase() === role.trim().toLowerCase(),
                    )
                  }
                >
                  <Plus size={16} />
                  Add role
                </button>
              </form>
              <div className="chips">
                {p.targetRoles.map((r) => (
                  <span className="chip" key={r}>
                    {r}
                    <button
                      aria-label={`Remove ${r}`}
                      onClick={() =>
                        change(
                          "targetRoles",
                          p.targetRoles.filter((v) => v !== r),
                        )
                      }
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
              {!p.targetRoles.length && (
                <p className="muted">No additional target roles yet.</p>
              )}
            </>
          ) : (
            <>
              <h2>Professional profile</h2>
              <p className="muted">
                Use only experience and qualifications you can verify. Confirmed
                resume sections are added here for review.
              </p>
              <RouteButton to="/resume">Upload or review resume</RouteButton>
              {p.resumeImports?.map((source) => (
                <p className="muted small" key={source.resumeId}>
                  Imported from Original Resume: {source.resumeName}. Check imported values before using them.
                </p>
              ))}
              <Field label="Professional summary">
                <textarea
                  rows={4}
                  value={p.summary}
                  onChange={(e) => change("summary", e.target.value)}
                  placeholder="Describe your experience and areas of focus."
                />
              </Field>
              <div className="subsection">
                <h3>Skills</h3>
                <form
                  className="inline-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (
                      skill.trim() &&
                      !p.skills.some(
                        (s) =>
                          s.name.toLowerCase() === skill.trim().toLowerCase(),
                      )
                    ) {
                      change("skills", [
                        ...p.skills,
                        { id: id(), name: skill.trim() },
                      ]);
                      setSkill("");
                    }
                  }}
                >
                  <input
                    id="profile-new-skill"
                    name="skill"
                    aria-label="New skill"
                    value={skill}
                    onChange={(e) => setSkill(e.target.value)}
                    placeholder="e.g. React"
                  />
                  <button
                    className="button secondary"
                    disabled={
                      !skill.trim() ||
                      p.skills.some(
                        (s) =>
                          s.name.toLowerCase() === skill.trim().toLowerCase(),
                      )
                    }
                  >
                    <Plus size={16} />
                    Add skill
                  </button>
                </form>
                <div className="chips">
                  {p.skills.map((s) => (
                    <span className="chip" key={s.id}>
                      {s.name}
                      {s.source && <small title={`Imported from ${s.source.resumeName}`}>Resume</small>}
                      <button
                        aria-label={`Remove ${s.name}`}
                        onClick={() =>
                          change(
                            "skills",
                            p.skills.filter((v) => v.id !== s.id),
                          )
                        }
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="subsection">
                <div className="section-heading">
                  <h3>Work experience</h3>
                  <button
                    className="text-button"
                    onClick={() =>
                      change("experience", [
                        ...p.experience,
                        {
                          id: id(),
                          company: "",
                          role: "",
                          dates: "",
                          description: "",
                        },
                      ])
                    }
                  >
                    <Plus size={15} />
                    Add experience
                  </button>
                </div>
                {p.experience.map((entry, index) => (
                  <fieldset key={entry.id}>
                    <legend>Experience {index + 1}</legend>
                    {entry.source && <p className="muted small">Imported from Original Resume: {entry.source.resumeName}. Please review this information.</p>}
                    <div className="form-grid">
                      {(
                        ["company", "role", "dates", "description"] as const
                      ).map((key) => (
                        <Field
                          key={key}
                          error={
                            attempted && !entry.source &&
                            (key === "company" || key === "role") &&
                            !entry[key].trim()
                              ? "Complete this field or remove the entry."
                              : undefined
                          }
                          label={
                            key === "dates"
                              ? "Dates (e.g. 2023 to present)"
                              : key
                          }
                        >
                          <input
                            value={entry[key]}
                            onChange={(e) =>
                              change(
                                "experience",
                                p.experience.map((v) =>
                                  v.id === entry.id
                                    ? { ...v, [key]: e.target.value }
                                    : v,
                                ),
                              )
                            }
                          />
                        </Field>
                      ))}
                    </div>
                    <button
                      className="text-button danger"
                      onClick={() =>
                        change(
                          "experience",
                          p.experience.filter((v) => v.id !== entry.id),
                        )
                      }
                    >
                      Remove experience
                    </button>
                  </fieldset>
                ))}
              </div>
              <div className="subsection">
                <div className="section-heading">
                  <h3>Education</h3>
                  <button
                    className="text-button"
                    onClick={() =>
                      change("education", [
                        ...p.education,
                        { id: id(), institution: "", degree: "", dates: "" },
                      ])
                    }
                  >
                    <Plus size={15} />
                    Add education
                  </button>
                </div>
                {p.education.map((entry, index) => (
                  <fieldset key={entry.id}>
                    <legend>Education {index + 1}</legend>
                    {entry.source && <p className="muted small">Imported from Original Resume: {entry.source.resumeName}. Please review this information.</p>}
                    <div className="form-grid">
                      {(["institution", "degree", "dates"] as const).map(
                        (key) => (
                          <Field
                            key={key}
                            label={key}
                            error={
                              attempted && !entry.source &&
                              ["institution", "degree", "name"].includes(key) &&
                              !entry[key].trim()
                                ? "Complete this field or remove the entry."
                                : undefined
                            }
                          >
                            <input
                              value={entry[key]}
                              onChange={(e) =>
                                change(
                                  "education",
                                  p.education.map((v) =>
                                    v.id === entry.id
                                      ? { ...v, [key]: e.target.value }
                                      : v,
                                  ),
                                )
                              }
                            />
                          </Field>
                        ),
                      )}
                    </div>
                    <button
                      className="text-button danger"
                      onClick={() =>
                        change(
                          "education",
                          p.education.filter((v) => v.id !== entry.id),
                        )
                      }
                    >
                      Remove education
                    </button>
                  </fieldset>
                ))}
              </div>
              <div className="subsection">
                <div className="section-heading">
                  <h3>Projects</h3>
                  <button
                    className="text-button"
                    onClick={() =>
                      change("projects", [
                        ...p.projects,
                        { id: id(), name: "", description: "", technologies: [], url: "" },
                      ])
                    }
                  >
                    <Plus size={15} />
                    Add project
                  </button>
                </div>
                {p.projects.map((entry) => (
                  <fieldset key={entry.id}>
                    {entry.source && <p className="muted small">Imported from Original Resume: {entry.source.resumeName}. Please review this information.</p>}
                    {(["name", "description"] as const).map((key) => (
                      <Field
                        key={key}
                        label={key}
                        error={
                          attempted &&
                          ["institution", "degree", "name"].includes(key) &&
                          !entry[key].trim()
                            ? "Complete this field or remove the entry."
                            : undefined
                        }
                      >
                        <input
                          value={entry[key]}
                          onChange={(e) =>
                            change(
                              "projects",
                              p.projects.map((v) =>
                                v.id === entry.id
                                  ? { ...v, [key]: e.target.value }
                                  : v,
                              ),
                            )
                          }
                        />
                      </Field>
                    ))}
                    <Field label="Technologies (comma-separated)">
                      <input
                        value={entry.technologies?.join(", ") || ""}
                        onChange={(e) =>
                          change(
                            "projects",
                            p.projects.map((v) =>
                              v.id === entry.id
                                ? { ...v, technologies: e.target.value.split(",").map((item) => item.trim()).filter(Boolean) }
                                : v,
                            ),
                          )
                        }
                      />
                    </Field>
                    <Field label="Project link (optional)">
                      <input
                        type="url"
                        value={entry.url || ""}
                        onChange={(e) =>
                          change(
                            "projects",
                            p.projects.map((v) =>
                              v.id === entry.id ? { ...v, url: e.target.value } : v,
                            ),
                          )
                        }
                      />
                    </Field>
                    <button
                      className="text-button danger"
                      onClick={() =>
                        change(
                          "projects",
                          p.projects.filter((v) => v.id !== entry.id),
                        )
                      }
                    >
                      Remove project
                    </button>
                  </fieldset>
                ))}
              </div>
              <div className="subsection">
                <div className="section-heading">
                  <h3>Certifications</h3>
                  <button
                    className="text-button"
                    onClick={() =>
                      change("certifications", [
                        ...p.certifications,
                        { id: id(), name: "", issuer: "" },
                      ])
                    }
                  >
                    <Plus size={15} />
                    Add certification
                  </button>
                </div>
                {p.certifications.map((entry) => (
                  <fieldset key={entry.id}>
                    {entry.source && <p className="muted small">Imported from Original Resume: {entry.source.resumeName}. Please review this information.</p>}
                    {(["name", "issuer"] as const).map((key) => (
                      <Field
                        key={key}
                        label={key}
                        error={
                          attempted && !entry.source &&
                          ["institution", "degree", "name"].includes(key) &&
                          !entry[key].trim()
                            ? "Complete this field or remove the entry."
                            : undefined
                        }
                      >
                        <input
                          value={entry[key]}
                          onChange={(e) =>
                            change(
                              "certifications",
                              p.certifications.map((v) =>
                                v.id === entry.id
                                  ? { ...v, [key]: e.target.value }
                                  : v,
                              ),
                            )
                          }
                        />
                      </Field>
                    ))}
                    <button
                      className="text-button danger"
                      onClick={() =>
                        change(
                          "certifications",
                          p.certifications.filter((v) => v.id !== entry.id),
                        )
                      }
                    >
                      Remove certification
                    </button>
                  </fieldset>
                ))}
              </div>
              <Field label="Achievements">
                <textarea
                  rows={3}
                  value={p.achievements}
                  onChange={(e) => change("achievements", e.target.value)}
                />
              </Field>
            </>
          )}
        </section>
        <aside className="profile-aside">
          <div className="eyebrow">A STRONG FOUNDATION</div>
          <h2>
            Accurate details.
            <br />
            Better decisions.
          </h2>
          <p>
            Your profile informs job matching and application preparation. Keep
            it specific, current and truthful.
          </p>
          <div className="aside-rule" />
          <Check size={20} />
          <h3>Saved on this device</h3>
          <p>
            No account or external AI service is connected. Your information
            stays in this browser.
          </p>
          <div className="aside-rule" />
          <small>
            * Required to save your profile.
            <br />
            Remember to save after making changes.
          </small>
        </aside>
      </div>
    </>
  );
}
