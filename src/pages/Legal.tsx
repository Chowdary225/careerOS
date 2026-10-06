import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/ui";
import { useStore } from "../app/store";
import { rawWorkspace } from "../services/repository";
export function Legal({ kind }: { kind: "privacy" | "terms" }) {
  const { data, reset, notify, downloadFile: download } = useStore();
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const privacy = kind === "privacy";
  const sections = privacy
    ? [
        [
          "Information collected",
          "This local MVP stores the career details, preferences, resume files, reviewed extraction text, saved demo jobs and application packages that you enter. No account registration or analytics is implemented.",
        ],
        [
          "Resume and profile information",
          "Original files are stored separately from reviewed text and tailored versions. The application reads PDF and DOCX content in your browser. Resume content is not sent to an external AI service.",
        ],
        [
          "How information is used",
          "Your data supports local profile matching, resume preparation and application tracking. Job listings are fictional demonstration data.",
        ],
        [
          "Data storage and retention",
          "Profile and application records are kept in localStorage. Original files are kept in IndexedDB on this browser and origin. They remain until you delete them or your browser clears site data. There is no server backup or cross-device synchronization.",
        ],
        [
          "Data security",
          "Local storage is not an encrypted vault. Other people using your browser profile may access your workspace. Avoid using a shared device for sensitive documents. Browser storage may be cleared or become unavailable.",
        ],
        [
          "User controls and data deletion",
          "You can edit your information in each workspace, export workspace records below, download original files from Resume, or delete all local CareerOS data. An export of workspace records does not include original file binaries.",
        ],
        [
          "Third-party services",
          "No AI provider, job board or employer integration is connected. Browser document parsing uses locally bundled PDF.js and fflate libraries. If hosted, the hosting provider may process network request information under its own policy.",
        ],
        [
          "Contact information",
          "An operator and privacy contact have not yet been configured. A verified contact channel and any required jurisdiction-specific information must be added before public launch.",
        ],
      ]
    : [
        [
          "Service description",
          "CareerOS is a browser-local MVP for organizing career information, reviewing resumes, comparing demo jobs and tracking application preparation. It is not an employment agency or a live job application service.",
        ],
        [
          "User responsibilities",
          "Provide accurate information and review all resume content, cover letters and answers before using them. Do not upload documents you are not authorized to use.",
        ],
        [
          "AI-generated content limitations",
          "This version uses local text extraction and deterministic matching. It does not connect to an external AI model. Parsing can miss information or misidentify sections. Any future generated suggestions must be reviewed for accuracy.",
        ],
        [
          "Job information limitations",
          "All included listings are clearly labeled demo data. Match percentages are rule-based comparisons, not hiring predictions, eligibility guarantees or endorsements.",
        ],
        [
          "Application limitations",
          "Approve and apply controls operate a local demonstration. They do not submit to employers or external job sites. Manual timeline updates do not verify employer decisions.",
        ],
        [
          "Account responsibilities",
          "No authenticated account is provided in this MVP. You are responsible for access to your device, browser profile and downloaded exports. Data does not synchronize between devices.",
        ],
        [
          "Intellectual property",
          "You retain your rights in your uploaded documents and entered content. Upload only content you own or are permitted to process. Final product licensing terms must be established by the operator.",
        ],
        [
          "Privacy",
          "The Privacy Policy describes this MVP’s local data handling, retention and deletion controls. Review it before entering personal information.",
        ],
        [
          "Liability limitations",
          "This development version provides no guarantee of employment, parsing accuracy, availability or preservation of browser data. Any enforceable liability provisions must be drafted for the operator and applicable jurisdiction before launch.",
        ],
        [
          "Changes to terms",
          "The operator must publish updated terms and an effective date before a public release. These draft terms do not represent a legally reviewed agreement.",
        ],
        [
          "Contact information",
          "The service operator and support contact are not yet configured. Both must be supplied and verified before launch.",
        ],
      ];
  return (
    <>
      <PageHeader
        eyebrow="WORKSPACE INFORMATION"
        title={privacy ? "Privacy Policy" : "Terms & Conditions"}
        description="Draft for final legal review. Not a legally reviewed policy."
      />
      <div className="legal-layout">
        <aside>
          <span className="eyebrow">ON THIS PAGE</span>
          {sections.map(([title], i) => (
            <a key={title} href={`#section-${i}`}>
              {title}
            </a>
          ))}
          <Link to={privacy ? "/terms" : "/privacy"}>
            {privacy ? "Terms & Conditions" : "Privacy Policy"}
          </Link>
        </aside>
        <article className="panel legal-content">
          <div className="alert">
            Local MVP disclosure · No public launch effective date has been set.
          </div>
          {sections.map(([title, body], i) => (
            <section id={`section-${i}`} key={title}>
              <h2>{title}</h2>
              <p>{body}</p>
            </section>
          ))}
          {privacy && (
            <section>
              <h2>Your local data</h2>
              <p>
                Export your records before deleting your workspace if you need a
                copy. Download original resume files separately from Resume.
              </p>
              {error && (
                <p role="alert" className="alert error">
                  {error}
                </p>
              )}
              <div className="button-row">
                <button
                  className="button secondary"
                  onClick={() => {
                    try {
                      download(
                        new Blob(
                          [rawWorkspace() || JSON.stringify(data, null, 2)],
                          { type: "application/json" },
                        ),
                        "careeros-workspace.json",
                      );
                    } catch {
                      setError(
                        "Could not export the saved workspace. Browser storage or downloads may be unavailable.",
                      );
                    }
                  }}
                >
                  Export workspace records
                </button>
                <button
                  className="button danger-button"
                  onClick={() => dialog.current?.showModal()}
                >
                  Delete local workspace
                </button>
              </div>
            </section>
          )}
        </article>
      </div>
      <dialog
        ref={dialog}
        aria-labelledby="delete-title"
        aria-describedby="delete-description"
        onCancel={(e) => {
          if (deleting) e.preventDefault();
        }}
      >
        <div className="dialog-body">
          <h2 id="delete-title">Delete all local CareerOS data?</h2>
          <p id="delete-description">
            This removes your profile, original resumes, versions and
            applications from this browser. This cannot be undone.
          </p>
          <div className="button-row">
            <button
              className="button danger-button"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                setError("");
                const success = await reset();
                setDeleting(false);
                dialog.current?.close();
                if (success) notify("Local workspace deleted.");
              }}
            >
              {deleting ? "Deleting..." : "Delete all data"}
            </button>
            <button
              className="button secondary"
              autoFocus
              disabled={deleting}
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
