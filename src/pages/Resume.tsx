import { useEffect, useRef, useState } from "react";
import {
  Upload,
  LockKeyhole,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ChevronRight,
  ScanText,
  BriefcaseBusiness,
  GraduationCap,
  Shapes,
  Folder,
  Medal,
  Trophy,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "../app/store";
import {
  PageHeader,
  Badge,
  Empty,
  RouteButton,
  Field,
  formatDate,
} from "../components/ui";
import { DocumentPreview } from "../components/DocumentPreview";
import { Tabs } from "../components/Tabs";
import {
  parseResume,
  extractSections,
  extractStructuredResume,
  replaceSectionText,
} from "../services/resume";
import { applyStructuredResume } from "../services/profileImport";
import {
  storeOriginal,
  getOriginal,
  removeOriginal,
} from "../services/repository";
import { sections, type Section, type StructuredResume } from "../types";
import { reviewResumeVersion } from "../services/applications";
import { jobs } from "../data/jobs";
const icons = [BriefcaseBusiness, GraduationCap, Shapes, Folder, Medal, Trophy];
export function ResumePage() {
  const {
    data,
    update,
    notify,
    downloadFile: download,
    error: storageError,
  } = useStore();
  const [tab, setTab] = useState("Original resume");
  const [selected, setSelected] = useState(data.resumes[0]?.id || "");
  const [blob, setBlob] = useState<Blob>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState<Section | null>(null);
  const [draft, setDraft] = useState("");
  const [showStructuredReview, setShowStructuredReview] = useState(false);
  const [structuredDraft, setStructuredDraft] = useState<StructuredResume | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const resume = data.resumes.find((r) => r.id === selected);
  const sourceSections = resume ? extractSections(resume.text) : null;
  const structured = resume?.structuredExtraction;
  useEffect(() => setStructuredDraft(structured || null), [resume?.id, structured]);
  const reviewedStructured = structuredDraft || structured;
  const [versionEdit, setVersionEdit] = useState("");
  const [versionText, setVersionText] = useState("");
  const versionLocked = data.applications.some(
    (a) => a.versionId === versionEdit && a.status !== "Prepared",
  );
  useEffect(() => {
    let active = true;
    setBlob(undefined);
    setError("");
    if (selected)
      getOriginal(selected)
        .then((b) => {
          if (active) {
            setBlob(b);
            if (!b)
              setError(
                "The original file is unavailable in browser storage. Upload another copy to restore preview.",
              );
          }
        })
        .catch(() => {
          if (active) setError("Could not read the saved original file.");
        });
    return () => {
      active = false;
    };
  }, [selected]);
  async function upload(file?: File) {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await parseResume(file);
      if (!mounted.current) return;
      await storeOriginal(
        result,
        new File([file], file.name, {
          type:
            result.type === "pdf"
              ? "application/pdf"
              : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
      );
      if (!mounted.current) {
        await removeOriginal(result.id);
        return;
      }
      if (update((d) => ({ ...d, resumes: [result, ...d.resumes] }))) {
        setSelected(result.id);
        setTab("Original resume");
        notify("Original saved. Review the locally extracted details.");
      } else {
        await removeOriginal(result.id);
      }
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error
            ? e.message
            : "The file could not be read. Try a valid, unencrypted PDF or DOCX.",
        );
    } finally {
      if (mounted.current) setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  const openReview = (section: Section) => {
    setReview(section);
    setDraft(resume?.extraction[section].text || "");
    dialog.current?.showModal();
  };
  const confirmStructuredResume = () => {
    if (!resume || !reviewedStructured) return;
    const source = { resumeId: resume.id, resumeName: resume.name };
    if (update((workspace) => ({
      ...workspace,
      profile: applyStructuredResume(workspace.profile, reviewedStructured, source),
      resumes: workspace.resumes.map((item) => item.id === resume.id
        ? {
            ...item,
            structuredExtraction: reviewedStructured,
            structuredConfirmed: true,
            extraction: Object.fromEntries(sections.map((section) => [
              section,
              { ...item.extraction[section], confirmed: true },
            ])) as typeof item.extraction,
          }
        : item),
    }))) {
      setShowStructuredReview(false);
      notify("Reviewed structured details merged into your Professional Profile. Existing values were preserved.");
    }
  };
  const updateStructured = (change: (current: StructuredResume) => StructuredResume) =>
    setStructuredDraft((current) => current ? change(current) : current);
  return (
    <>
      <PageHeader
        eyebrow="YOUR EXPERIENCE, PRESERVED"
        title="Resume workspace"
        description="One original. Separate versions for every opportunity."
        action={
          <button
            className="button"
            onClick={() => input.current?.click()}
            disabled={busy}
          >
            <Upload size={16} />
            {busy ? "Reading resume..." : "Upload resume"}
          </button>
        }
      />
      <input
        ref={input}
        type="file"
        className="sr-only"
        tabIndex={-1}
        disabled={busy}
        accept=".pdf,.docx"
        aria-label="Upload PDF or DOCX resume"
        onChange={(e) => void upload(e.target.files?.[0])}
      />
      <div className="workspace-tabs">
        <Tabs
          id="resume"
          label="Resume views"
          value={tab}
          onChange={(value) => {
            setTab(value);
            setVersionEdit("");
          }}
          options={[
            { value: "Original resume", label: "Original resume" },
            {
              value: "Tailored versions",
              label: (
                <>
                  Tailored versions
                  <span className="tab-count">{data.versions.length}</span>
                </>
              ),
            },
          ]}
        />
        <span className="muted small desktop-only">
          <LockKeyhole size={13} /> Originals are never overwritten
        </span>
      </div>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {busy && (
        <div className="alert" role="status">
          Extracting document text locally. Your file is not sent to a server.
        </div>
      )}
      <div
        id="resume-panel"
        role="tabpanel"
        aria-labelledby={`resume-tab-${tab === "Original resume" ? 0 : 1}`}
        tabIndex={0}
      >
        {tab === "Original resume" ? (
          <div className="resume-layout">
            <section className="document-panel panel">
              <div className="document-header">
                <div className="file-icon">
                  <FileText size={22} />
                </div>
                <div className="file-info">
                  <strong>{resume?.name || "Your original resume"}</strong>
                  <small>
                    {resume
                      ? `${resume.type.toUpperCase()} · Added ${formatDate(resume.created)}`
                      : "PDF or DOCX · Up to 10 MB"}
                  </small>
                </div>
                <button
                  className="icon-button"
                  aria-label="Download original resume"
                  disabled={!blob}
                  onClick={() =>
                    blob && download(blob, resume?.name || "resume.pdf")
                  }
                >
                  <Download size={18} />
                </button>
              </div>
              <div className="original-bar">
                <span>
                  <LockKeyhole size={12} /> ORIGINAL RESUME
                </span>
                <Badge tone="success">UNCHANGED</Badge>
              </div>
              {data.resumes.length > 1 && (
                <label className="original-select">
                  Saved originals
                  <select
                    value={selected}
                    onChange={(e) => {
                      setSelected(e.target.value);
                      setError("");
                    }}
                  >
                    {data.resumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} · {formatDate(r.created)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <DocumentPreview
                key={resume?.id || "empty"}
                blob={blob}
                text={resume?.text || ""}
                pageCount={resume?.pageCount || 1}
              />
              <div className="document-footnote">
                <LockKeyhole size={13} /> Your original file stays intact. Every
                tailored resume is a separate version.
              </div>
            </section>
            <aside className="analysis-column">
              <section className="panel analysis-panel">
                <div className="section-heading">
                  <h2>
                    <ScanText size={19} />
                    Resume analysis
                  </h2>
                  <span className="live-dot" />
                </div>
                <div className="analysis-status">
                  <Badge tone={resume ? "success" : "neutral"}>
                    {resume ? "Local extraction complete" : "Awaiting a resume"}
                  </Badge>
                  <p>
                    Local text extraction, not external AI. Review every detail
                    before using it.
                  </p>
                </div>
                <div className="extraction-list">
                  {sections.map((section, index) => {
                    const Icon = icons[index];
                    const entry = resume?.extraction[section];
                    return (
                      <button
                        key={section}
                        disabled={!resume}
                        onClick={() => openReview(section)}
                      >
                        <Icon size={17} />
                        <span>
                          {section}
                          <small>
                            {entry?.confirmed
                              ? "Confirmed"
                              : entry?.text.trim()
                                ? structured && Object.entries(structured.confidence).some(([path, level]) =>
                                    path.toLowerCase().startsWith(`${section.toLowerCase()}.`) && level === "review")
                                  ? "Please review this information"
                                  : "Detected · Ready to review"
                                : "Not detected"}
                          </small>
                        </span>
                        {entry?.confirmed ? (
                          <CheckCircle2 size={16} className="cyan" />
                        ) : (
                          <ChevronRight size={15} />
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="subsection structured-extraction">
                  <h3>Structured profile extraction</h3>
                  <p className="muted small">
                    Local parser output. Values marked “Please review this information” need comparison with the original resume.
                  </p>
                  <button
                    className="button secondary"
                    disabled={!structured}
                    onClick={() => setShowStructuredReview((visible) => !visible)}
                  >
                    {showStructuredReview ? "Hide extracted information" : "Review extracted information"}
                  </button>
                  {structured && showStructuredReview && reviewedStructured && (
                    <div className="structured-review-content" aria-live="polite">
                      <p>Check and edit every field before confirming. Blank values stay blank.</p>
                      <h4>Personal information</h4>
                      {(["name", "email", "phone", "location", "linkedin", "portfolio"] as const).map((key) => {
                        const value = reviewedStructured.personalInfo[key] || "";
                        const id = `resume-review-personal-${key}`;
                        return <Field key={key} label={key}>
                          <input id={id} name={id} value={value} onChange={(event) => updateStructured((current) => ({
                            ...current,
                            personalInfo: { ...current.personalInfo, [key]: event.target.value.trim() ? event.target.value : null },
                          }))} />
                          {value && structured.confidence[`personalInfo.${key}`] !== "high" && <small>Please review this information against the original.</small>}
                        </Field>;
                      })}
                      <Field label="Professional summary">
                        <textarea id="resume-review-summary" name="resume-review-summary" rows={4}
                          value={reviewedStructured.professionalSummary || ""}
                          onChange={(event) => updateStructured((current) => ({ ...current, professionalSummary: event.target.value.trim() ? event.target.value : null }))} />
                      </Field>
                      <h4>Experience</h4>
                      {reviewedStructured.experience.length ? reviewedStructured.experience.map((entry, index) => (
                        <fieldset key={`experience-${index}`}>
                          <legend>Experience {index + 1}</legend>
                          {(["jobTitle", "company", "location", "startDate", "endDate"] as const).map((key) => {
                            const id = `resume-review-experience-${index}-${key}`;
                            return <Field key={key} label={key}>
                              <input id={id} name={id} value={entry[key] || ""} onChange={(event) => updateStructured((current) => ({
                                ...current,
                                experience: current.experience.map((item, itemIndex) => itemIndex === index
                                  ? { ...item, [key]: event.target.value.trim() ? event.target.value : null }
                                  : item),
                              }))} />
                            </Field>;
                          })}
                          {(["responsibilities", "achievements"] as const).map((key) => {
                            const id = `resume-review-experience-${index}-${key}`;
                            return <Field key={key} label={`${key} (one per line)`}>
                              <textarea id={id} name={id} rows={3} value={entry[key].join("\n")} onChange={(event) => updateStructured((current) => ({
                                ...current,
                                experience: current.experience.map((item, itemIndex) => itemIndex === index
                                  ? { ...item, [key]: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean) }
                                  : item),
                              }))} />
                            </Field>;
                          })}
                        </fieldset>
                      )) : <p>Not detected</p>}
                      <h4>Education</h4>
                      {reviewedStructured.education.length ? reviewedStructured.education.map((entry, index) => (
                        <fieldset key={`education-${index}`}>
                          <legend>Education {index + 1}</legend>
                          {(["institution", "degree", "field", "location", "startDate", "endDate", "grade"] as const).map((key) => {
                            const id = `resume-review-education-${index}-${key}`;
                            return <Field key={key} label={key}>
                              <input id={id} name={id} value={entry[key] || ""} onChange={(event) => updateStructured((current) => ({
                                ...current,
                                education: current.education.map((item, itemIndex) => itemIndex === index
                                  ? { ...item, [key]: event.target.value.trim() ? event.target.value : null }
                                  : item),
                              }))} />
                            </Field>;
                          })}
                        </fieldset>
                      )) : <p>Not detected</p>}
                      <Field label="Skills (one per line)">
                        <textarea id="resume-review-skills" name="resume-review-skills" rows={4}
                          value={reviewedStructured.skills.join("\n")}
                          onChange={(event) => updateStructured((current) => ({ ...current, skills: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean) }))} />
                      </Field>
                      <h4>Projects</h4>
                      {reviewedStructured.projects.length ? reviewedStructured.projects.map((entry, index) => (
                        <fieldset key={`project-${index}`}>
                          <legend>Project {index + 1}</legend>
                          {(["name", "description"] as const).map((key) => {
                            const id = `resume-review-project-${index}-${key}`;
                            return <Field key={key} label={key}>
                              <textarea id={id} name={id} rows={key === "description" ? 3 : 1} value={entry[key]} onChange={(event) => updateStructured((current) => ({
                                ...current,
                                projects: current.projects.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: event.target.value } : item),
                              }))} />
                            </Field>;
                          })}
                          <Field label="Technologies (one per line)">
                            <textarea id={`resume-review-project-${index}-technologies`} name={`resume-review-project-${index}-technologies`} rows={2}
                              value={entry.technologies.join("\n")} onChange={(event) => updateStructured((current) => ({
                                ...current,
                                projects: current.projects.map((item, itemIndex) => itemIndex === index
                                  ? { ...item, technologies: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean) }
                                  : item),
                              }))} />
                          </Field>
                          <Field label="Project URL (optional)">
                            <input id={`resume-review-project-${index}-url`} name={`resume-review-project-${index}-url`}
                              value={entry.url || ""} onChange={(event) => updateStructured((current) => ({
                                ...current,
                                projects: current.projects.map((item, itemIndex) => itemIndex === index
                                  ? { ...item, url: event.target.value.trim() ? event.target.value : null }
                                  : item),
                              }))} />
                          </Field>
                        </fieldset>
                      )) : <p>Not detected</p>}
                      <h4>Certifications</h4>
                      {reviewedStructured.certifications.length ? reviewedStructured.certifications.map((entry, index) => (
                        <fieldset key={`certification-${index}`}>
                          <legend>Certification {index + 1}</legend>
                          {(["name", "issuer", "date"] as const).map((key) => {
                            const id = `resume-review-certification-${index}-${key}`;
                            return <Field key={key} label={key}>
                              <input id={id} name={id} value={entry[key] || ""} onChange={(event) => updateStructured((current) => ({
                                ...current,
                                certifications: current.certifications.map((item, itemIndex) => itemIndex === index
                                  ? { ...item, [key]: event.target.value.trim() ? event.target.value : null }
                                  : item),
                              }))} />
                            </Field>;
                          })}
                        </fieldset>
                      )) : <p>Not detected</p>}
                      <Field label="Achievements (one per line)">
                        <textarea id="resume-review-achievements" name="resume-review-achievements" rows={3}
                          value={reviewedStructured.achievements.join("\n")}
                          onChange={(event) => updateStructured((current) => ({ ...current, achievements: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean) }))} />
                      </Field>
                      {structured.warnings.map((warning) => <p className="alert" key={warning}>{warning}</p>)}
                      <button className="button" onClick={confirmStructuredResume}>
                        Confirm details
                      </button>
                    </div>
                  )}
                </div>
                <button
                  className="button review-button"
                  disabled={!resume}
                  onClick={() => openReview("Experience")}
                >
                  Review extracted details
                  <ArrowUpRight size={15} />
                </button>
              </section>
              <section className="panel readability">
                <h2>ATS readability</h2>
                <p className="muted small">Content checks, not an ATS score.</p>
                <div className="check-row">
                  {resume?.text ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <AlertCircle size={16} />
                  )}
                  <span>
                    {resume
                      ? resume.text
                        ? "Selectable text extracted"
                        : resume.type === "pdf"
                          ? "No text found. A scanned PDF needs OCR."
                          : "No readable text found in this DOCX."
                      : "Upload a file to check its text"}
                  </span>
                </div>
                <div className="check-row">
                  {resume &&
                  sections.some((s) => sourceSections?.[s].text.trim()) ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <AlertCircle size={16} />
                  )}
                  <span>
                    {resume &&
                    sections.some((s) => sourceSections?.[s].text.trim())
                      ? "Recognized section headings"
                      : resume
                        ? "No recognized section headings found"
                        : "Section headings not checked yet"}
                  </span>
                </div>
                <div className="check-row warning">
                  <AlertCircle size={16} />
                  <span>
                    {resume?.type === "docx"
                      ? "DOCX preview shows text, not original formatting."
                      : "Confirm dates and contact details."}
                  </span>
                </div>
              </section>
              <section className="versions-note">
                <div className="section-heading">
                  <h3>Tailored versions</h3>
                  <span>
                    {data.versions.length.toString().padStart(2, "0")}
                  </span>
                </div>
                <p>
                  {data.versions.length
                    ? "Separate copies, prepared for specific roles."
                    : "No tailored versions yet. Choose a job to create a separate resume version."}
                </p>
                <Link to="/jobs">
                  Browse jobs
                  <ArrowRightIcon />
                </Link>
              </section>
            </aside>
          </div>
        ) : (
          <section className="panel">
            {!data.versions.length ? (
              <Empty
                title="A version for the right opportunity."
                action={<RouteButton to="/jobs">Browse jobs</RouteButton>}
              >
                Choose a job to create a separate resume version. Your original
                remains unchanged.
              </Empty>
            ) : (
              data.versions.map((v) => (
                <div className="version-row" key={v.id}>
                  <FileText size={23} />
                  <div>
                    <h3>{jobs.find((j) => j.id === v.jobId)?.role}</h3>
                    <p>
                      {v.id} · {formatDate(v.created)}
                    </p>
                    <small>
                      Original:{" "}
                      {data.resumes.find((r) => r.id === v.resumeId)?.name}
                    </small>
                  </div>
                  <Badge>{v.status}</Badge>
                  <button
                    className="button secondary"
                    onClick={() => {
                      setVersionEdit(v.id);
                      setVersionText(v.text);
                    }}
                  >
                    Review version
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Download ${v.id}`}
                    onClick={() =>
                      download(
                        new Blob([v.text], { type: "text/plain" }),
                        `${v.id}.txt`,
                      )
                    }
                  >
                    <Download size={18} />
                  </button>
                </div>
              ))
            )}
          </section>
        )}
        {versionEdit && (
          <section className="panel form-panel">
            <h2>Review tailored resume</h2>
            {versionLocked && (
              <div className="alert">
                This version is attached to an approved or closed application
                and is read-only.
              </div>
            )}
            <p className="muted">
              Plain-text resume. Keep only factual experience. Exported as .txt.
            </p>
            <label className="field">
              <span>Resume content</span>
              <textarea
                rows={20}
                readOnly={versionLocked}
                value={versionText}
                onChange={(e) => setVersionText(e.target.value)}
              />
            </label>
            <div className="button-row">
              <button
                className="button"
                disabled={versionLocked || !versionText.trim()}
                onClick={() => {
                  if (
                    update((d) =>
                      reviewResumeVersion(d, versionEdit, versionText),
                    )
                  ) {
                    setVersionEdit("");
                    notify("Resume version reviewed and saved.");
                  }
                }}
              >
                Confirm and save version
              </button>
              <button
                className="button secondary"
                onClick={() => setVersionEdit("")}
              >
                Cancel
              </button>
            </div>
          </section>
        )}
      </div>
      <dialog
        ref={dialog}
        onClose={() => setReview(null)}
        aria-labelledby="review-title"
      >
        <div className="dialog-body">
          <span className="eyebrow">LOCAL EXTRACTION REVIEW</span>
          <h2 id="review-title">{review}</h2>
          {review && storageError && (
            <div role="alert" className="alert error">
              {storageError}
            </div>
          )}
          <p>
            Edit the extracted text. Confirmation saves this reviewed section
            separately from the original file.
          </p>
          <label className="field">
            <span>Extracted details</span>
            <textarea
              id="resume-extraction-review"
              name="resume-extraction-review"
              rows={12}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="No details detected. Add accurate information or confirm this section is empty."
            />
          </label>
          <div className="button-row">
            <button
              className="button"
              onClick={() => {
                if (!resume || !review) return;
                const editedText = replaceSectionText(resume.text, review, draft);
                const editedSections = extractSections(editedText);
                editedSections[review].confirmed = true;
                if (
                  update((d) => ({
                    ...d,
                    resumes: d.resumes.map((r) => r.id === resume.id
                      ? {
                          ...r,
                          text: editedText,
                          extraction: editedSections,
                          structuredExtraction: extractStructuredResume(editedText),
                          structuredConfirmed: false,
                        }
                      : r),
                  }))
                ) {
                  dialog.current?.close();
                  setShowStructuredReview(false);
                  notify(`${review} text saved for review. Original resume file unchanged.`);
                }
              }}
            >
              Save reviewed section
            </button>
            <button
              className="button secondary"
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
function ArrowRightIcon() {
  return <ArrowUpRight size={15} />;
}
