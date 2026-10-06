import { describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  act,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { StoreProvider, useStore } from "../src/app/store";
import App from "../src/app/App";
import {
  emptyWorkspace,
  readWorkspace,
  writeWorkspace,
  rawWorkspace,
  clearOriginals,
  storeOriginal,
  getOriginal,
  download,
} from "../src/services/repository";
import { extractSections, parseResume } from "../src/services/resume";
import { extractDocx } from "../src/services/docx";
import { matchJob } from "../src/services/matching";
import {
  createPackage,
  approveApplication,
  recordDemoApply,
  updateApplicationStatus,
  reviewResumeVersion,
  saveApplicationDraft,
} from "../src/services/applications";
import { jobs } from "../src/data/jobs";
import { zipSync, strToU8 } from "fflate";
import type { Status } from "../src/types";
function prepared() {
  const data = emptyWorkspace();
  data.profile.user = {
    name: "QA Person",
    email: "qa@example.com",
    phone: "",
    location: "",
  };
  data.resumes = [
    {
      id: "qa-original",
      name: "fixture.docx",
      type: "docx",
      created: new Date().toISOString(),
      text: "SKILLS\nReact\nEXPERIENCE\nA factual project",
      pageCount: 1,
      extraction: extractSections(
        "SKILLS\nReact\nEXPERIENCE\nA factual project",
      ),
    },
  ];
  const result = createPackage(data.profile, jobs[0], data.resumes[0]);
  data.versions = [result.version];
  data.applications = [result.application];
  return data;
}
const approval = {
  text: "My factual resume",
  letter: "My own letter",
  answers: "My project",
  verified: true,
};
function mount(path: string, extra?: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <StoreProvider>
        <App />
        {extra}
      </StoreProvider>
    </MemoryRouter>,
  );
}
describe("persisted data integrity", () => {
  it("rejects nested corruption and preserves the original stored bytes", () => {
    localStorage.setItem(
      "careeros.workspace.v1",
      JSON.stringify({ profile: {}, resumes: [], applications: [] }),
    );
    const before = rawWorkspace();
    expect(() => readWorkspace()).toThrow("invalid");
    expect(rawWorkspace()).toBe(before);
  });
  it("rejects missing application associations", () => {
    const data = prepared();
    data.versions = [];
    localStorage.setItem("careeros.workspace.v1", JSON.stringify(data));
    expect(() => readWorkspace()).toThrow("invalid");
  });
  it("does not replace unreadable records with a blank workspace on save", async () => {
    localStorage.setItem("careeros.workspace.v1", "corrupt original bytes");
    mount("/profile");
    await userEvent.type(screen.getByLabelText("Full name *"), "QA Person");
    await userEvent.type(
      screen.getByLabelText("Email address *"),
      "qa@example.com",
    );
    await userEvent.type(
      screen.getByLabelText("Target job role *"),
      "Developer",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(rawWorkspace()).toBe("corrupt original bytes");
    expect(screen.getByRole("alert").textContent).toContain(
      "avoid overwriting",
    );
  });
  it("applies stale async callbacks to the latest workspace", () => {
    let store: ReturnType<typeof useStore>;
    function Harness() {
      store = useStore();
      return null;
    }
    render(
      <StoreProvider>
        <Harness />
      </StoreProvider>,
    );
    const oldCallback = store!.update;
    act(() => {
      store!.update((d) => ({ ...d, savedJobs: ["DEMO-001"] }));
    });
    act(() => {
      oldCallback((d) => ({
        ...d,
        profile: { ...d.profile, targetRole: "New role" },
      }));
    });
    expect(readWorkspace().savedJobs).toEqual(["DEMO-001"]);
    expect(readWorkspace().profile.targetRole).toBe("New role");
  });
  it("blocks stale writes after another tab changed or deleted records", () => {
    let store: ReturnType<typeof useStore>;
    function Harness() {
      store = useStore();
      return null;
    }
    render(
      <StoreProvider>
        <Harness />
      </StoreProvider>,
    );
    const other = emptyWorkspace();
    other.profile.user.name = "Another tab";
    writeWorkspace(other);
    act(() => {
      expect(store!.update((d) => ({ ...d, savedJobs: ["DEMO-001"] }))).toBe(
        false,
      );
    });
    expect(readWorkspace().profile.user.name).toBe("Another tab");
    expect(store!.error).toContain("another tab");
  });
  it("deletes records even when new localStorage writes fail", async () => {
    writeWorkspace(prepared());
    mount("/privacy");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Full", "QuotaExceededError");
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Delete local workspace" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Delete all data" }),
    );
    await waitFor(() => expect(rawWorkspace()).toBeNull());
    expect(readWorkspace().applications).toHaveLength(0);
  });
  it("deletes stored originals as well as workspace records", async () => {
    const d = prepared();
    await clearOriginals();
    await storeOriginal(d.resumes[0], new File(["bytes"], "fixture.docx"));
    writeWorkspace(d);
    mount("/privacy");
    await userEvent.click(
      screen.getByRole("button", { name: "Delete local workspace" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Delete all data" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("deleted"),
    );
    expect(await getOriginal("qa-original")).toBeUndefined();
    expect(rawWorkspace()).toBeNull();
  });
});
describe("application and resume associations", () => {
  it("rejects approval with a missing resume version", () => {
    const d = prepared();
    d.versions = [];
    expect(() => approveApplication(d, d.applications[0].id, approval)).toThrow(
      "associated resume",
    );
  });
  it("does not allow editing approved or closed versions through the service", () => {
    let d = prepared();
    const app = d.applications[0];
    d = approveApplication(d, app.id, approval);
    expect(() => reviewResumeVersion(d, app.versionId, "changed")).toThrow(
      "read-only",
    );
    expect(() => saveApplicationDraft(d, app.id, approval)).toThrow(
      "read-only",
    );
  });
  it("keeps saved drafts unreviewed until explicitly confirmed", () => {
    const d = prepared();
    const next = saveApplicationDraft(d, d.applications[0].id, approval);
    expect(next.versions[0].status).toBe("Draft");
    expect(d.resumes[0].text).toBe(next.resumes[0].text);
  });
  it("requires renewed confirmation after a resume version changes", () => {
    const d = prepared();
    d.applications[0].verified = true;
    const result = reviewResumeVersion(
      d,
      d.versions[0].id,
      "Updated factual resume",
    );
    expect(result.applications[0].verified).toBe(false);
  });
  it("preserves the approved applicant snapshot after profile edits", () => {
    let d = prepared();
    d = approveApplication(d, d.applications[0].id, approval);
    d.profile.user.name = "Changed profile";
    expect(d.applications[0].applicant?.name).toBe("QA Person");
  });
  for (const status of [
    "In Review",
    "Shortlisted",
    "Interview",
    "Offer",
    "Rejected",
    "Withdrawn",
    "Expired",
    "Skipped",
  ] as const)
    it(`records ${status} without losing previous events`, () => {
      let d = prepared();
      const id = d.applications[0].id;
      d = approveApplication(d, id, approval);
      d = recordDemoApply(d, id);
      const before = d.applications[0].events;
      d = updateApplicationStatus(d, id, status, "QA status");
      expect(d.applications[0].events.slice(0, -1)).toEqual(before);
      expect(d.applications[0].status).toBe(status);
      writeWorkspace(d);
      expect(readWorkspace().applications[0].status).toBe(status);
    });
  it("rejects unknown status values from runtime input", () => {
    const d = prepared();
    expect(() =>
      updateApplicationStatus(
        d,
        d.applications[0].id,
        "Invented" as Status,
        "",
      ),
    ).toThrow("valid application status");
  });
  it("does not silently open a different application for an unknown ID", () => {
    writeWorkspace(prepared());
    mount("/applications?id=missing-id");
    expect(
      screen.getByRole("heading", { name: "Application not found." }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Job-specific resume" }),
    ).toBeNull();
  });
  it("does not award bachelor-level education for an associate degree", () => {
    const d = emptyWorkspace();
    d.profile.education = [
      {
        id: "a",
        degree: "Associate Degree",
        institution: "QA College",
        dates: "",
      },
    ];
    expect(matchJob(d.profile, jobs[0]).education).toBe(false);
  });
});
describe("document and download failure handling", () => {
  it("rejects zero-byte resumes", async () => {
    await expect(parseResume(new File([], "empty.pdf"))).rejects.toThrow(
      "empty",
    );
  });
  it("rejects XML that is not a Word document", async () => {
    const zip = zipSync({
      "word/document.xml": strToU8(
        "<document><p><t>Not a Word file</t></p></document>",
      ),
    });
    await expect(extractDocx(zip.buffer as ArrayBuffer)).rejects.toThrow(
      "valid Word document",
    );
  });
  it("preserves DOCX tabs and manual line breaks", async () => {
    const xml =
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>A</w:t><w:tab/><w:t>B</w:t><w:br/><w:t>C</w:t></w:r></w:p></w:body></w:document>';
    const zip = zipSync({ "word/document.xml": strToU8(xml) });
    expect(await extractDocx(zip.buffer as ArrayBuffer)).toBe("A\tB\nC");
  });
  it("initiates a named download via an attached anchor and releases the object URL", () => {
    vi.useFakeTimers();
    try {
      const blob = new Blob(["content"]);
      const revoke = vi.spyOn(URL, "revokeObjectURL");
      let name = "";
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
        function (this: HTMLAnchorElement) {
          expect(this.isConnected).toBe(true);
          name = this.download;
        },
      );
      download(blob, "original.pdf");
      expect(name).toBe("original.pdf");
      vi.runAllTimers();
      expect(revoke).toHaveBeenCalledWith("blob:test-document");
      expect(document.querySelector("a[download]")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
describe("keyboard, semantics and navigation regressions", () => {
  it("uses roving focus and arrow/Home/End keys for profile tabs", async () => {
    mount("/profile");
    const first = screen.getByRole("tab", { name: "Requirements" });
    first.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(
      screen
        .getByRole("tab", { name: "Professional profile" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(
      document.activeElement?.id,
    );
    await userEvent.keyboard("{End}");
    expect(document.activeElement?.textContent).toBe("Target roles");
    await userEvent.keyboard("{Home}");
    expect(document.activeElement?.textContent).toBe("Requirements");
  });
  it("connects required-field errors to their inputs", async () => {
    mount("/profile");
    await userEvent.click(screen.getByRole("button", { name: "Save profile" }));
    const name = screen.getByLabelText("Full name *");
    expect(name.getAttribute("aria-invalid")).toBe("true");
    expect(name.getAttribute("aria-required")).toBe("true");
    expect(
      document.getElementById(name.getAttribute("aria-describedby")!)
        ?.textContent,
    ).toContain("full name");
    expect(document.activeElement).toBe(name);
  });
  it("names the destructive confirmation dialog", async () => {
    mount("/privacy");
    await userEvent.click(
      screen.getByRole("button", { name: "Delete local workspace" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Delete all local CareerOS data?" }),
    ).toBeTruthy();
  });
  it("retains footer legal links across navigation and sets legal page titles", async () => {
    mount("/dashboard");
    const footer = screen.getByRole("navigation", { name: "Legal" });
    await userEvent.click(
      within(footer).getByRole("link", { name: "Privacy Policy" }),
    );
    expect(document.title).toBe("Privacy Policy | CareerOS");
    await userEvent.click(
      within(footer).getByRole("link", { name: "Terms & Conditions" }),
    );
    expect(document.title).toBe("Terms & Conditions | CareerOS");
  });
  it("supports router back and forward navigation", async () => {
    function History() {
      const navigate = useNavigate();
      return (
        <>
          <button onClick={() => navigate(-1)}>QA back</button>
          <button onClick={() => navigate(1)}>QA forward</button>
        </>
      );
    }
    mount("/dashboard", <History />);
    await userEvent.click(
      within(
        screen.getByRole("navigation", { name: "Main navigation" }),
      ).getByRole("link", { name: "Jobs" }),
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Jobs, with context.",
    );
    await userEvent.click(screen.getByRole("button", { name: "QA back" }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Make your next move.",
    );
    await userEvent.click(screen.getByRole("button", { name: "QA forward" }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Jobs, with context.",
    );
  });
  it("makes closed mobile navigation inert and closes it with Escape", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    try {
      mount("/dashboard");
      const aside = document.getElementById("navigation-sidebar")!;
      expect(aside.hasAttribute("inert")).toBe(true);
      const toggle = screen.getByRole("button", { name: "Open navigation" });
      await userEvent.click(toggle);
      expect(aside.hasAttribute("inert")).toBe(false);
      fireEvent.keyDown(document, { key: "Escape" });
      expect(aside.hasAttribute("inert")).toBe(true);
      expect(document.activeElement).toBe(toggle);
    } finally {
      delete (window as Partial<Window>).matchMedia;
    }
  });
});
