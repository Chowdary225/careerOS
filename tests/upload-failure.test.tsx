import { beforeEach, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { StoreProvider } from "../src/app/store";
import App from "../src/app/App";
import { extractSections } from "../src/services/resume";
import { readWorkspace } from "../src/services/repository";
const mocks = vi.hoisted(() => ({
  parse: vi.fn(),
  store: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("../src/services/resume", async (original) => ({
  ...(await original<typeof import("../src/services/resume")>()),
  parseResume: mocks.parse,
}));
vi.mock("../src/services/repository", async (original) => ({
  ...(await original<typeof import("../src/services/repository")>()),
  storeOriginal: mocks.store,
  removeOriginal: mocks.remove,
}));
const result = {
  id: "new-upload",
  name: "qa.docx",
  type: "docx",
  text: "SKILLS\nReact",
  pageCount: 1,
  created: new Date().toISOString(),
  extraction: extractSections("SKILLS\nReact"),
};
function mount() {
  return render(
    <MemoryRouter initialEntries={["/resume"]}>
      <StoreProvider>
        <App />
      </StoreProvider>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  mocks.parse.mockReset();
  mocks.store.mockReset().mockResolvedValue(undefined);
  mocks.remove.mockReset().mockResolvedValue(undefined);
});
it("removes a stored original if workspace metadata cannot be committed", async () => {
  mocks.parse.mockResolvedValue(result);
  mount();
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Full", "QuotaExceededError");
  });
  await userEvent.upload(
    screen.getByLabelText("Upload PDF or DOCX resume"),
    new File(["x"], "qa.docx"),
  );
  await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith("new-upload"));
  expect(readWorkspace().resumes).toHaveLength(0);
  expect(screen.getByRole("alert").textContent).toContain("could not be saved");
});
it("does not resurrect data when an upload finishes after leaving the page", async () => {
  let resolve!: (value: typeof result) => void;
  mocks.parse.mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const view = mount();
  await userEvent.upload(
    screen.getByLabelText("Upload PDF or DOCX resume"),
    new File(["x"], "qa.docx"),
  );
  expect(screen.getByRole("status").textContent).toContain("Extracting");
  view.unmount();
  resolve(result);
  await new Promise((r) => setTimeout(r, 0));
  expect(mocks.store).not.toHaveBeenCalled();
  expect(readWorkspace().resumes).toHaveLength(0);
});
it("shows parsing errors and restores the upload action", async () => {
  mocks.parse.mockRejectedValue(new Error("Unreadable document"));
  mount();
  await userEvent.upload(
    screen.getByLabelText("Upload PDF or DOCX resume"),
    new File(["bad"], "qa.docx"),
  );
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    "Unreadable document",
  );
  expect(
    screen
      .getByRole("button", { name: "Upload resume" })
      .hasAttribute("disabled"),
  ).toBe(false);
});
