import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import App from "../src/app/App";
import { StoreProvider } from "../src/app/store";
import {
  emptyWorkspace,
  writeWorkspace,
  readWorkspace,
} from "../src/services/repository";
import { extractSections } from "../src/services/resume";
function mount(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <StoreProvider>
        <App />
      </StoreProvider>
    </MemoryRouter>,
  );
}
describe("all workspace routes", () => {
  for (const [path, heading] of [
    ["/dashboard", "Make your next move."],
    ["/profile", "Career profile"],
    ["/resume", "Resume workspace"],
    ["/jobs", "Jobs, with context."],
    ["/applications", "Applications"],
    ["/applications/tracker", "Application tracker"],
    ["/privacy", "Privacy Policy"],
    ["/terms", "Terms & Conditions"],
  ])
    it(`renders ${path}`, () => {
      mount(path);
      expect(
        screen.getByRole("heading", { level: 1, name: heading }),
      ).toBeTruthy();
    });
  it("handles unknown routes", () => {
    mount("/missing");
    expect(
      screen.getByRole("heading", { name: "Page not found" }),
    ).toBeTruthy();
  });
  it("toggles mobile navigation", async () => {
    mount("/dashboard");
    await userEvent.click(
      screen.getByRole("button", { name: "Open navigation" }),
    );
    expect(
      screen.getByRole("button", { name: "Close navigation", expanded: true }),
    ).toBeTruthy();
  });
});
describe("profile, search and filtering", () => {
  it("validates required profile fields, saves and persists real edits", async () => {
    mount("/profile");
    await userEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(screen.getByRole("alert").textContent).toContain("full name");
    await userEvent.type(
      screen.getByLabelText("Full name *"),
      "Test Developer",
    );
    await userEvent.type(
      screen.getByLabelText("Email address *"),
      "test@example.com",
    );
    await userEvent.type(
      screen.getByLabelText("Target job role *"),
      "Frontend Developer",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(readWorkspace().profile.user.name).toBe("Test Developer");
    expect(screen.getByRole("button", { name: "Saved" })).toBeTruthy();
  });
  it("combines search, filters and saved jobs", async () => {
    mount("/jobs");
    await userEvent.type(
      screen.getByRole("textbox", { name: "Search jobs" }),
      "Frontend",
    );
    expect(
      screen.getAllByRole("heading", { name: "Frontend Developer" }).length,
    ).toBe(2);
    expect(
      screen.queryByRole("heading", { name: "Backend Developer" }),
    ).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: "Save job", exact: true }),
    );
    expect(readWorkspace().savedJobs).toEqual(["DEMO-001"]);
    await userEvent.click(
      screen.getByRole("button", { name: "Filters", exact: true }),
    );
    await userEvent.selectOptions(screen.getByLabelText("Work mode"), "Remote");
    expect(screen.getByText("No roles match these filters.")).toBeTruthy();
    await userEvent.click(
      screen.getByRole("button", { name: "Clear filters" }),
    );
    expect(
      screen.getByRole("heading", { name: "Backend Developer" }),
    ).toBeTruthy();
  });
  it("prevents preparation before a resume exists", async () => {
    mount("/jobs");
    await userEvent.click(
      screen.getByRole("button", { name: "Prepare application" }),
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "Upload an original resume",
    );
    expect(readWorkspace().applications).toHaveLength(0);
  });
});
describe("complete controlled application flow", () => {
  it("prepares, edits, approves, records demo apply, and tracks a status", async () => {
    const d = emptyWorkspace();
    d.profile.user = {
      name: "Test User",
      email: "test@example.com",
      phone: "",
      location: "",
    };
    d.resumes = [
      {
        id: "r1",
        name: "resume.docx",
        type: "docx",
        created: new Date().toISOString(),
        text: "SKILLS\nReact\nEXPERIENCE\nBuilt a web app.",
        pageCount: 1,
        extraction: extractSections("SKILLS\nReact"),
      },
    ];
    writeWorkspace(d);
    mount("/jobs");
    await userEvent.click(
      screen.getByRole("button", { name: "Prepare application" }),
    );
    expect(
      screen.getByRole("heading", { name: "Job-specific resume" }),
    ).toBeTruthy();
    await userEvent.click(
      screen.getByRole("button", { name: "Save and continue" }),
    );
    await userEvent.type(
      screen.getByLabelText("Cover letter"),
      "I am interested in this sample role.",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Save and continue" }),
    );
    await userEvent.type(
      screen.getByLabelText(
        "What relevant experience would you bring to this role?",
      ),
      "I built a web app.",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Save and continue" }),
    );
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(
      screen.getByRole("button", { name: "Approve application" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Record demo apply" }),
    );
    expect(readWorkspace().applications[0].status).toBe("Applied");
    await userEvent.click(screen.getByRole("link", { name: "Open tracker" }));
    await userEvent.selectOptions(
      screen.getByLabelText("New status"),
      "Interview",
    );
    await userEvent.type(
      screen.getByLabelText("Note (optional)"),
      "Practice status update",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Save status update" }),
    );
    expect(readWorkspace().applications[0].status).toBe("Interview");
    expect(readWorkspace().resumes[0].text).toBe(
      "SKILLS\nReact\nEXPERIENCE\nBuilt a web app.",
    );
  });
});
describe("resume review and storage controls", () => {
  it("uploads a DOCX, reviews extracted content and preserves original text", async () => {
    const { zipSync, strToU8 } = await import("fflate");
    const archive = zipSync({
      "word/document.xml": strToU8(
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>SKILLS</w:t></w:r></w:p><w:p><w:r><w:t>React</w:t></w:r></w:p></w:body></w:document>',
      ),
    });
    const file = new File([archive], "my-resume.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    Object.defineProperty(file, "arrayBuffer", {
      value: async () => archive.buffer,
    });
    mount("/resume");
    await userEvent.upload(
      screen.getByLabelText("Upload PDF or DOCX resume"),
      file,
    );
    await waitFor(() =>
      expect(screen.getByText("my-resume.docx")).toBeTruthy(),
    );
    expect(readWorkspace().resumes[0].text).toBe("SKILLS\nReact");
    await userEvent.click(
      screen.getByRole("button", { name: /Skills Detected/ }),
    );
    await userEvent.clear(screen.getByLabelText("Extracted details"));
    await userEvent.type(
      screen.getByLabelText("Extracted details"),
      "React, TypeScript",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Confirm details" }),
    );
    const saved = readWorkspace().resumes[0];
    expect(saved.extraction.Skills).toEqual({
      text: "React, TypeScript",
      confirmed: true,
    });
    expect(saved.text).toBe("SKILLS\nReact");
    expect(
      screen
        .getByRole("button", { name: "Download original resume" })
        .hasAttribute("disabled"),
    ).toBe(false);
  });
  it("reports storage write failures without a false saved state", async () => {
    mount("/profile");
    await userEvent.type(screen.getByLabelText("Full name *"), "Test User");
    await userEvent.type(
      screen.getByLabelText("Email address *"),
      "test@example.com",
    );
    await userEvent.type(
      screen.getByLabelText("Target job role *"),
      "Developer",
    );
    const { vi } = await import("vitest");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    await userEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(screen.getByRole("alert").textContent).toContain(
      "could not be saved",
    );
    expect(
      screen.queryByRole("button", { name: "Saved", exact: true }),
    ).toBeNull();
  });
  it("requires confirmation to clear local workspace records", async () => {
    const d = emptyWorkspace();
    d.profile.user.name = "Delete Test";
    writeWorkspace(d);
    mount("/privacy");
    await userEvent.click(
      screen.getByRole("button", { name: "Delete local workspace" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(readWorkspace().profile.user.name).toBe("Delete Test");
    await userEvent.click(
      screen.getByRole("button", { name: "Delete local workspace" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Delete all data" }),
    );
    await waitFor(() => expect(readWorkspace().profile.user.name).toBe(""));
  });
});
