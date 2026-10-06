import { beforeEach, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocumentPreview } from "../src/components/DocumentPreview";
const mock = vi.hoisted(() => ({
  open: vi.fn(),
  page: vi.fn(),
  render: vi.fn(),
  cancel: vi.fn(),
  destroy: vi.fn(),
}));
vi.mock("../src/services/pdf", () => ({ openPdfTask: mock.open }));
beforeEach(() => {
  mock.open.mockReset();
  mock.page.mockReset();
  mock.render.mockReset();
  mock.cancel.mockReset();
  mock.destroy.mockReset().mockResolvedValue(undefined);
  mock.render.mockReturnValue({
    promise: Promise.resolve(),
    cancel: mock.cancel,
  });
  mock.page.mockResolvedValue({
    getViewport: ({ scale }: { scale: number }) => ({
      width: 612 * scale,
      height: 792 * scale,
    }),
    render: mock.render,
  });
  mock.open.mockResolvedValue({
    promise: Promise.resolve({ numPages: 2, getPage: mock.page }),
    destroy: mock.destroy,
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    {} as CanvasRenderingContext2D,
  );
});
it("reuses one document while navigating pages and bounds zoom", async () => {
  const blob = new Blob(["test"], { type: "application/pdf" });
  const view = render(
    <DocumentPreview blob={blob} text="Readable PDF text" pageCount={2} />,
  );
  await waitFor(() => expect(mock.render).toHaveBeenCalledTimes(1));
  await userEvent.click(screen.getByRole("button", { name: "Next page" }));
  await waitFor(() => expect(mock.page).toHaveBeenLastCalledWith(2));
  expect(mock.open).toHaveBeenCalledTimes(1);
  expect(
    screen.getByRole("button", { name: "Next page" }).hasAttribute("disabled"),
  ).toBe(true);
  for (let i = 0; i < 6; i++)
    await userEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  expect(screen.getByText("160%")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Zoom in" }).hasAttribute("disabled"),
  ).toBe(true);
  await userEvent.click(screen.getByRole("button", { name: "Previous page" }));
  await waitFor(() => expect(mock.page).toHaveBeenLastCalledWith(1));
  view.unmount();
  expect(mock.destroy).toHaveBeenCalledOnce();
  expect(mock.cancel).toHaveBeenCalled();
});
it("shows a real canvas failure rather than an indefinite spinner", async () => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  render(
    <DocumentPreview
      blob={new Blob(["x"], { type: "application/pdf" })}
      text="Text"
      pageCount={1}
    />,
  );
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain(
      "Canvas rendering is unavailable",
    ),
  );
  expect(screen.queryByRole("status")).toBeNull();
});
it("clears PDF failures when switching to a DOCX text preview", async () => {
  mock.open.mockRejectedValueOnce(new Error("Bad PDF"));
  const view = render(
    <DocumentPreview
      blob={new Blob(["x"], { type: "application/pdf" })}
      text=""
      pageCount={1}
    />,
  );
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain("Bad PDF"),
  );
  view.rerender(
    <DocumentPreview
      blob={
        new Blob(["docx"], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        })
      }
      text="Actual DOCX text"
      pageCount={1}
    />,
  );
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  expect(screen.getByText("Actual DOCX text")).toBeTruthy();
});
it("destroys a PDF that finishes loading after unmount", async () => {
  let resolve!: (value: unknown) => void;
  mock.open.mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const view = render(
    <DocumentPreview
      blob={new Blob(["x"], { type: "application/pdf" })}
      text=""
      pageCount={1}
    />,
  );
  view.unmount();
  resolve({ promise: Promise.resolve({ numPages: 1 }), destroy: mock.destroy });
  await waitFor(() => expect(mock.destroy).toHaveBeenCalledOnce());
  expect(mock.render).not.toHaveBeenCalled();
});
