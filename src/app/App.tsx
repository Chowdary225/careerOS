import { useEffect, useRef, useState } from "react";
import {
  NavLink,
  Routes,
  Route,
  Navigate,
  useLocation,
  Link,
} from "react-router-dom";
import {
  LayoutDashboard,
  UserRound,
  FileText,
  BriefcaseBusiness,
  Send,
  Route as RouteIcon,
  Menu,
  X,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { useStore } from "./store";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { Dashboard } from "../pages/Dashboard";
import { Profile } from "../pages/Profile";
import { ResumePage } from "../pages/Resume";
import { Jobs } from "../pages/Jobs";
import { Applications } from "../pages/Applications";
import { Tracker } from "../pages/Tracker";
import { Legal } from "../pages/Legal";
const navigation = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/profile", "Career Profile", UserRound],
  ["/resume", "Resume", FileText],
  ["/jobs", "Jobs", BriefcaseBusiness],
  ["/applications", "Applications", Send],
  ["/applications/tracker", "Application Tracker", RouteIcon],
] as const;
export default function App() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const mobile = useMediaQuery("(max-width: 700px)");
  const sidebar = useRef<HTMLElement>(null);
  const menu = useRef<HTMLButtonElement>(null);
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!mobile) setOpen(false);
  }, [mobile]);
  useEffect(() => {
    if (!open || !mobile) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebar.current?.querySelector<HTMLElement>("nav a")?.focus();
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        menu.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;
      const links = Array.from(
        sidebar.current?.querySelectorAll<HTMLElement>(
          "nav a,.legal-links a,.user-block",
        ) || [],
      );
      const targets = [menu.current, ...links].filter(
        (el): el is HTMLElement => !!el,
      );
      const index = targets.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && index <= 0) {
        e.preventDefault();
        targets.at(-1)?.focus();
      } else if (!e.shiftKey && (index === targets.length - 1 || index < 0)) {
        e.preventDefault();
        targets[0]?.focus();
      }
    };
    document.addEventListener("keydown", keys);
    return () => {
      document.removeEventListener("keydown", keys);
      document.body.style.overflow = previous;
    };
  }, [open, mobile]);
  const { data, notice, notify, error } = useStore();
  const page =
    navigation.find((n) => n[0] === location.pathname)?.[1] ||
    { "/privacy": "Privacy Policy", "/terms": "Terms & Conditions" }[
      location.pathname
    ] ||
    "Page not found";
  useEffect(() => {
    setOpen(false);
    document.title = `${page} | CareerOS`;
    window.scrollTo(0, 0);
    main.current?.focus({ preventScroll: true });
  }, [location.pathname, page]);
  useEffect(() => {
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      target?.scrollIntoView?.();
    }
  }, [location.pathname, location.hash]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => notify(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [notice, notify]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="mobile-header">
        <Link className="brand" to="/dashboard">
          <img src="/favicon.svg" alt="" />
          CareerOS
        </Link>
        <button
          className="icon-button"
          ref={menu}
          aria-controls="navigation-sidebar"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <button
          className="scrim"
          aria-label="Close navigation"
          onClick={() => {
            setOpen(false);
            menu.current?.focus();
          }}
        />
      )}
      <aside
        ref={sidebar}
        id="navigation-sidebar"
        inert={mobile && !open}
        className={`sidebar ${open ? "open" : ""}`}
      >
        <Link className="brand" to="/dashboard">
          <img src="/favicon.svg" alt="" />
          CareerOS
          <span className="brand-dot" />
        </Link>
        <span className="nav-caption">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {navigation.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end>
              <Icon size={19} strokeWidth={1.6} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-note">
            <ShieldCheck size={19} />
            <div>
              <strong>Your workspace. Your data.</strong>
              <p>Saved on this device.</p>
            </div>
          </div>
          <div className="legal-links">
            <Link to="/privacy">Privacy</Link>
            <span>·</span>
            <Link to="/terms">Terms</Link>
          </div>
          <Link className="user-block" to="/profile">
            <span className="avatar">
              {data.profile.user.name
                ? data.profile.user.name
                    .split(" ")
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join("")
                : "YO"}
            </span>
            <span>
              <strong>{data.profile.user.name || "Your workspace"}</strong>
              <small>Personal workspace · Local</small>
            </span>
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </aside>
      <div className="app-main" inert={mobile && open}>
        <div className="topbar">
          <span>
            Workspace <span className="slash">/</span> <strong>{page}</strong>
          </span>
          <span className="local-indicator">
            <i />
            Local MVP <span className="desktop-only">· Demo job source</span>
          </span>
        </div>
        <main ref={main} id="main" tabIndex={-1}>
          {error && (
            <div role="alert" className="alert error">
              {error}
            </div>
          )}
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/resume" element={<ResumePage />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/applications/tracker" element={<Tracker />} />
            <Route path="/privacy" element={<Legal kind="privacy" />} />
            <Route path="/terms" element={<Legal kind="terms" />} />
            <Route
              path="*"
              element={
                <div className="empty">
                  <h1>Page not found</h1>
                  <Link className="button" to="/dashboard">
                    Return to Dashboard
                  </Link>
                </div>
              }
            />
          </Routes>
        </main>
        <footer className="workspace-footer">
          <span>
            CAREEROS <span className="slash">/</span> A focused career workspace
          </span>
          <nav aria-label="Legal">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms & Conditions</Link>
          </nav>
        </footer>
      </div>
      {notice && (
        <div role="status" className="toast">
          {notice}
          <button aria-label="Dismiss notification" onClick={() => notify("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
