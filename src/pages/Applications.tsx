import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Check,
  ArrowRight,
  FileText,
  Download,
  LockKeyhole,
} from "lucide-react";
import { useStore } from "../app/store";
import { PageHeader, Empty, RouteButton, Badge, Field } from "../components/ui";
import { jobs } from "../data/jobs";
import {
  approveApplication,
  recordDemoApply,
  saveApplicationDraft,
} from "../services/applications";
import type { Application } from "../types";
export function Applications() {
  const { data } = useStore();
  const [params, setParams] = useSearchParams();
  const requested = params.get("id");
  const selected = requested
    ? data.applications.find((a) => a.id === requested)
    : data.applications[0];
  return (
    <>
      <PageHeader
        eyebrow="PREPARE WITH INTENT"
        title="Applications"
        description="A complete package. Reviewed by you. Always."
      />
      {!selected ? (
        <section className="panel">
          <Empty
            title={
              requested
                ? "Application not found."
                : "Start with a role that fits."
            }
            action={<RouteButton to="/jobs">Find jobs</RouteButton>}
          >
            {requested
              ? "This application ID does not exist in this browser workspace."
              : "Select a demo job to prepare a resume version and application package."}
          </Empty>
        </section>
      ) : (
        <>
          {data.applications.length > 1 && (
            <Field label="Application package">
              <select
                value={selected.id}
                onChange={(e) => setParams({ id: e.target.value })}
              >
                {data.applications.map((a) => (
                  <option key={a.id} value={a.id}>
                    {jobs.find((j) => j.id === a.jobId)?.role} · {a.id}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <ApplicationEditor key={selected.id} application={selected} />
        </>
      )}
    </>
  );
}
function ApplicationEditor({ application: a }: { application: Application }) {
  const { data, update, notify, downloadFile: download } = useStore();
  const [step, setStep] = useState(0);
  const [letter, setLetter] = useState(a.coverLetter);
  const [answers, setAnswers] = useState(a.answers);
  const [verified, setVerified] = useState(a.verified);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const v = data.versions.find((v) => v.id === a.versionId);
  const [text, setText] = useState(v?.text || "");
  const job = jobs.find((j) => j.id === a.jobId);
  const locked = a.status !== "Prepared";
  function save() {
    if (!text.trim()) {
      setError("Resume content cannot be empty.");
      return false;
    }
    setError("");
    return update((d) =>
      saveApplicationDraft(d, a.id, { text, letter, answers, verified }),
    );
  }

  async function approve() {
    setError("");
    setBusy(true);
    try {
      if (
        update((d) =>
          approveApplication(d, a.id, { text, letter, answers, verified }),
        )
      )
        notify("Application approved. You can now record a demo application.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function apply() {
    try {
      if (update((d) => recordDemoApply(d, a.id)))
        notify(
          "Demo application recorded. No external application was submitted.",
        );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const applicant = a.applicant || data.profile.user;
  if (!job || !v)
    return (
      <section className="panel">
        <Empty title="Application data unavailable.">
          The associated job or resume version is missing. Your existing records
          have not been modified.
        </Empty>
      </section>
    );
  return (
    <>
      <div className="demo-banner">
        <span className="live-dot" />
        <strong>Controlled demo workflow</strong>
        <span>No external application will be submitted.</span>
      </div>
      <div className="application-layout">
        <section>
          <nav className="package-steps" aria-label="Application steps">
            {["Resume", "Cover letter", "Answers", "Review"].map(
              (label, index) => (
                <button
                  key={label}
                  className={step === index ? "active" : ""}
                  aria-current={step === index ? "step" : undefined}
                  onClick={() => setStep(index)}
                >
                  <span>{index + 1}</span>
                  {label}
                </button>
              ),
            )}
          </nav>
          <section className="panel form-panel">
            {error && (
              <div role="alert" className="alert error">
                {error}
              </div>
            )}
            {step === 0 ? (
              <>
                <div className="section-heading">
                  <h2>Job-specific resume</h2>
                  <Badge>{v?.status || "Draft"}</Badge>
                </div>
                <p className="muted">
                  Separate plain-text draft. Matching profile skills are
                  emphasized; no experience is invented. Review before
                  approving.
                </p>
                <Field label="Resume content">
                  <textarea
                    rows={19}
                    value={text}
                    readOnly={locked}
                    onChange={(e) => {
                      setText(e.target.value);
                      setVerified(false);
                    }}
                  />
                </Field>
                <div className="document-footnote">
                  <LockKeyhole size={14} />
                  Original resume unchanged · {a.versionId}
                </div>
              </>
            ) : step === 1 ? (
              <>
                <h2>Cover letter</h2>
                <p className="muted">
                  Explain your interest and relevant experience in your own
                  words.
                </p>
                <Field label="Cover letter">
                  <textarea
                    rows={16}
                    placeholder="Write a concise, factual cover letter for this role."
                    value={letter}
                    readOnly={locked}
                    onChange={(e) => {
                      setLetter(e.target.value);
                      setVerified(false);
                    }}
                  />
                </Field>
              </>
            ) : step === 2 ? (
              <>
                <h2>Application answers</h2>
                <p className="muted">
                  This sample question is part of the local demo workflow.
                </p>
                <Field label="What relevant experience would you bring to this role?">
                  <textarea
                    rows={12}
                    value={answers}
                    readOnly={locked}
                    onChange={(e) => {
                      setAnswers(e.target.value);
                      setVerified(false);
                    }}
                  />
                </Field>
              </>
            ) : (
              <>
                <h2>Review application</h2>
                <p className="muted">Check the full package before approval.</p>
                <div className="review-summary">
                  <h3>
                    {a.applicant
                      ? "Applicant snapshot at approval"
                      : "User information to verify"}
                  </h3>
                  <p>
                    {applicant.name || "Name missing"}
                    <br />
                    {applicant.email || "Email missing"}
                    <br />
                    {applicant.phone}
                  </p>
                  <Link to="/profile">
                    Edit career profile
                    <ArrowRight size={14} />
                  </Link>
                </div>
                {[
                  ["Resume", text],
                  ["Cover letter", letter],
                  ["Application answer", answers],
                ].map(([title, content]) => (
                  <details key={title}>
                    <summary>
                      {title}
                      <Badge tone={content.trim() ? "success" : "warning"}>
                        {content.trim() ? "Added" : "Missing"}
                      </Badge>
                    </summary>
                    <pre className="review-text">
                      {content || "Not completed yet."}
                    </pre>
                  </details>
                ))}
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={verified}
                    disabled={locked}
                    onChange={(e) => setVerified(e.target.checked)}
                  />
                  <span>
                    I reviewed this information and confirm it is accurate. I
                    understand this is a local demo application.
                  </span>
                </label>
                {a.status === "Prepared" && (
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => void approve()}
                  >
                    <Check size={16} />
                    Approve application
                  </button>
                )}
                {a.status === "Approved" && (
                  <button className="button" onClick={apply}>
                    Record demo apply
                    <ArrowRight size={16} />
                  </button>
                )}
                {a.appliedDate && (
                  <div className="alert success">
                    Demo application recorded. No external application was
                    submitted.
                    <Link to="/applications/tracker">Open tracker</Link>
                  </div>
                )}
              </>
            )}
            {!locked && (
              <div className="form-footer">
                <button
                  className="button secondary"
                  onClick={() => {
                    if (save()) notify("Application draft saved.");
                  }}
                >
                  Save draft
                </button>
                {step < 3 && (
                  <button
                    className="button"
                    onClick={() => {
                      if (save()) setStep(step + 1);
                    }}
                  >
                    Save and continue
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            )}
          </section>
        </section>
        <aside className="panel package-aside">
          <Badge tone="blue">{a.status}</Badge>
          <h2>{job.role}</h2>
          <p>{job.company}</p>
          <p>
            {job.location} · {job.mode}
          </p>
          <dl>
            <dt>Job ID</dt>
            <dd>{job.id}</dd>
            <dt>Application ID</dt>
            <dd className="mono">{a.id}</dd>
            <dt>Resume version</dt>
            <dd>{a.versionId}</dd>
            <dt>Source</dt>
            <dd>Local demo repository</dd>
          </dl>
          <div className="aside-rule" />
          <FileText size={23} />
          <h3>Your application package</h3>
          <p>
            Resume, cover letter and answers remain associated with this
            application.
          </p>
          <button
            className="button secondary"
            onClick={() =>
              download(
                new Blob(
                  [
                    JSON.stringify(
                      { ...a, coverLetter: letter, answers, resume: text, job },
                      null,
                      2,
                    ),
                  ],
                  { type: "application/json" },
                ),
                `${a.id}.json`,
              )
            }
          >
            <Download size={16} />
            Export package
          </button>
          <Link className="text-button" to="/applications/tracker">
            View timeline
            <ArrowRight size={15} />
          </Link>
        </aside>
      </div>
    </>
  );
}
