import {
  ArrowRight,
  Check,
  FileText,
  Target,
  Send,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "../app/store";
import { PageHeader, RouteButton, Badge, formatDate } from "../components/ui";
import { profileCompletion, matchJob } from "../services/matching";
import { jobs } from "../data/jobs";
export function Dashboard() {
  const { data } = useStore();
  const completion = profileCompletion(data.profile);
  const active = data.applications.filter(
    (a) =>
      !["Rejected", "Withdrawn", "Expired", "Skipped", "Offer"].includes(
        a.status,
      ),
  );
  const matching = jobs.filter(
    (j) => matchJob(data.profile, j).percentage >= 60,
  );
  const events = data.applications
    .flatMap((a) => a.events.map((e) => ({ ...e, application: a.id })))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);
  const steps = [
    {
      name: "Career profile",
      detail: "Define what comes next",
      to: "/profile",
      done: completion === 100,
    },
    {
      name: "Original resume",
      detail: "Build from your experience",
      to: "/resume",
      done: !!data.resumes.length,
    },
    {
      name: "Find your fit",
      detail: "Discover and compare roles",
      to: "/jobs",
      done: !!data.savedJobs.length,
    },
    {
      name: "Apply with clarity",
      detail: "Prepare, review, then apply",
      to: "/applications",
      done: data.applications.some((a) => a.appliedDate),
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="YOUR CAREER, IN FOCUS"
        title={
          data.profile.user.name
            ? `Welcome back, ${data.profile.user.name.split(" ")[0]}.`
            : "Make your next move."
        }
        description="A clear view of where you are, and what comes next."
        action={<RouteButton to="/jobs">Find jobs</RouteButton>}
      />
      <div className="overview-strip">
        <div>
          <span className="stat-label">
            <Target size={16} />
            Profile completion
          </span>
          <strong>
            {completion}
            <small>%</small>
          </strong>
          <div className="progress-track">
            <i style={{ width: completion + "%" }} />
          </div>
          <Link to="/profile">
            {completion === 100
              ? "Review your profile"
              : "Complete your profile"}
            <ArrowUpRight size={14} />
          </Link>
        </div>
        <div>
          <span className="stat-label">
            <FileText size={16} />
            Original resume
          </span>
          <strong className="stat-word">
            {data.resumes.length ? "Uploaded" : "Not added"}
          </strong>
          <span className="stat-note">
            {data.resumes.length
              ? "Original files are preserved"
              : "Your experience is the starting point"}
          </span>
          <Link to="/resume">
            {data.resumes.length
              ? "Open resume workspace"
              : "Upload your resume"}
            <ArrowUpRight size={14} />
          </Link>
        </div>
        <div>
          <span className="stat-label">
            <Target size={16} />
            Matching demo jobs
          </span>
          <strong>{matching.length.toString().padStart(2, "0")}</strong>
          <span className="stat-note">At least 60% of defined criteria</span>
          <Link to="/jobs">
            Explore demo matches
            <ArrowUpRight size={14} />
          </Link>
        </div>
        <div>
          <span className="stat-label">
            <Send size={16} />
            Active applications
          </span>
          <strong>{active.length.toString().padStart(2, "0")}</strong>
          <span className="stat-note">Prepared and in-progress packages</span>
          <Link to="/applications/tracker">
            View your tracker
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
      <section className="journey panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">A SIMPLE PATH FORWARD</span>
            <h2>Your career workspace</h2>
          </div>
          <Badge>{steps.filter((s) => s.done).length} of 4 steps started</Badge>
        </div>
        <div className="journey-steps">
          {steps.map((step, i) => (
            <Link
              key={step.name}
              to={step.to}
              className={step.done ? "done" : ""}
            >
              <span className="step-index">
                {step.done ? (
                  <Check size={19} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              <h3>{step.name}</h3>
              <p>{step.detail}</p>
              <ArrowUpRight size={18} className="step-arrow" />
            </Link>
          ))}
        </div>
      </section>
      <div className="dashboard-lower">
        <section className="panel">
          <div className="section-heading">
            <h2>Next actions</h2>
            <span className="muted">Start with the essentials</span>
          </div>
          <Link
            className="action-row"
            to={completion < 100 ? "/profile" : "/resume"}
          >
            <span className="action-icon">
              <Plus size={20} />
            </span>
            <div>
              <h3>
                {completion < 100
                  ? "Tell us what you are looking for"
                  : "Review your original resume"}
              </h3>
              <p>
                {completion < 100
                  ? "Add your target role, skills and work preferences."
                  : "Keep your experience accurate before preparing an application."}
              </p>
            </div>
            <ArrowRight size={18} />
          </Link>
          <Link className="action-row" to="/jobs">
            <span className="action-icon">
              <Target size={20} />
            </span>
            <div>
              <h3>Find a role worth preparing for</h3>
              <p>Explore sample jobs and understand the match.</p>
            </div>
            <ArrowRight size={18} />
          </Link>
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>Recent activity</h2>
            <span className="live-dot" />
          </div>
          {events.length ? (
            events.map((e) => (
              <div className="activity-row" key={e.id}>
                <i />
                <div>
                  <strong>{e.status}</strong>
                  <p>{e.application}</p>
                </div>
                <small>{formatDate(e.date)}</small>
              </div>
            ))
          ) : (
            <div className="quiet-empty">
              <span className="tiny-rule" />
              <h3>A clean starting point.</h3>
              <p>
                Your application activity will appear here as you prepare and
                track your next move.
              </p>
            </div>
          )}
        </section>
      </div>
      <div className="bottom-callout">
        <span>
          <span className="live-dot" /> Built around your information, never
          invented experience.
        </span>
        <Link to="/profile">
          Update profile <ArrowRight size={15} />
        </Link>
      </div>
    </>
  );
}
