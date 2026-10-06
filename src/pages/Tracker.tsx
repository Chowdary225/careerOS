import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Check, Clock3 } from "lucide-react";
import { useStore } from "../app/store";
import {
  PageHeader,
  Badge,
  Empty,
  RouteButton,
  Field,
  formatDate,
} from "../components/ui";
import { stages, type Status } from "../types";
import { jobs } from "../data/jobs";
import { isStatus } from "../services/validation";
import { updateApplicationStatus } from "../services/applications";
export function Tracker() {
  const { data, update, notify } = useStore();
  const [selected, setSelected] = useState(data.applications[0]?.id || "");
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState<Status>("In Review");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const filtered = data.applications.filter(
    (a) => !filter || a.status === filter,
  );
  const application = filtered.find((a) => a.id === selected) || filtered[0];
  const job = jobs.find((j) => j.id === application?.jobId);
  function changeStatus() {
    if (!application) return;
    setError("");
    try {
      if (
        update((d) => updateApplicationStatus(d, application.id, status, note))
      ) {
        setNote("");
        notify("Application timeline updated.");
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="EVERY APPLICATION, ACCOUNTED FOR"
        title="Application tracker"
        description="Keep the full story of each application in one place."
      />
      <div className="tracker-stages" aria-label="Filter by status">
        <button
          aria-pressed={!filter}
          className={!filter ? "active" : ""}
          onClick={() => setFilter("")}
        >
          All applications<span>{data.applications.length}</span>
        </button>
        {stages.slice(0, 7).map((s) => (
          <button
            key={s}
            aria-pressed={filter === s}
            className={filter === s ? "active" : ""}
            onClick={() => setFilter(filter === s ? "" : s)}
          >
            {s}
            <span>
              {data.applications.filter((a) => a.status === s).length}
            </span>
          </button>
        ))}
      </div>
      <div className="alternate-filter">
        <label>
          Other states
          <select
            aria-label="Filter alternative status"
            value={
              stages.slice(7).some((stage) => stage === filter) ? filter : ""
            }
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">Select status</option>
            {stages.slice(7).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      {!filtered.length ? (
        <section className="panel">
          <Empty
            title={
              data.applications.length
                ? "No applications at this stage."
                : "Your timeline starts with an application."
            }
            action={<RouteButton to="/jobs">Explore jobs</RouteButton>}
          >
            Prepared applications and their status history will appear here.
          </Empty>
        </section>
      ) : (
        <div className="tracker-layout">
          <section className="tracker-list">
            {filtered.map((a) => {
              const j = jobs.find((j) => j.id === a.jobId);
              return (
                <button
                  key={a.id}
                  aria-pressed={application?.id === a.id}
                  className={`tracker-item ${application?.id === a.id ? "selected" : ""}`}
                  onClick={() => {
                    setSelected(a.id);
                    setNote("");
                    setError("");
                  }}
                >
                  <Badge tone={a.status === "Applied" ? "success" : "neutral"}>
                    {a.status}
                  </Badge>
                  <h3>{j?.role || "Unavailable demo role"}</h3>
                  <p>{j?.company || a.jobId}</p>
                  <small>{a.id}</small>
                  <span className="tracker-date">
                    <Clock3 size={13} />
                    {a.appliedDate
                      ? `Applied ${formatDate(a.appliedDate)}`
                      : "Not applied yet"}
                  </span>
                </button>
              );
            })}
          </section>
          {application && job && (
            <section className="panel timeline-panel">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">APPLICATION TIMELINE</span>
                  <h2>{job.role}</h2>
                  <p>
                    {job.company} · {job.location}
                  </p>
                </div>
                <Link
                  className="icon-button"
                  aria-label="Open application package"
                  to={`/applications?id=${application.id}`}
                >
                  <ArrowUpRight size={20} />
                </Link>
              </div>
              <div className="tracker-details">
                <span>
                  Application ID<strong>{application.id}</strong>
                </span>
                <span>
                  Resume version<strong>{application.versionId}</strong>
                </span>
                <span>
                  Source<strong>{job.source}</strong>
                </span>
                <span>
                  Applied date
                  <strong>
                    {application.appliedDate
                      ? formatDate(application.appliedDate)
                      : "Not applied"}
                  </strong>
                </span>
              </div>
              <ol className="timeline">
                {application.events.map((e, index) => (
                  <li key={e.id}>
                    <span
                      className={`timeline-marker ${index === application.events.length - 1 ? "current" : ""}`}
                    >
                      <Check size={13} />
                    </span>
                    <div>
                      <div className="section-heading">
                        <h3>{e.status}</h3>
                        <time dateTime={e.date}>
                          {new Date(e.date).toLocaleString("en-GB", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </time>
                      </div>
                      <p>{e.note}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="next-action">
                <span className="eyebrow">NEXT ACTION</span>
                <p>
                  {application.status === "Prepared"
                    ? "Review and approve your application package."
                    : application.status === "Approved"
                      ? "Record your demo application in the Applications workspace."
                      : [
                            "Rejected",
                            "Withdrawn",
                            "Expired",
                            "Skipped",
                            "Offer",
                          ].includes(application.status)
                        ? "Review the outcome or explore another role."
                        : "Record a status update when you have new information."}
                </p>
              </div>
              <div className="subsection">
                <h3>Update status</h3>
                <p className="muted small">
                  Manual tracking only. No employer status is fetched.
                </p>
                {error && (
                  <div className="alert error" role="alert">
                    {error}
                  </div>
                )}
                <div className="form-grid">
                  <Field label="New status">
                    <select
                      value={status}
                      onChange={(e) => {
                        if (isStatus(e.target.value)) setStatus(e.target.value);
                      }}
                    >
                      {stages.slice(3).map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Note (optional)">
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add context to this update"
                    />
                  </Field>
                </div>
                <button className="button secondary" onClick={changeStatus}>
                  Save status update
                </button>
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
