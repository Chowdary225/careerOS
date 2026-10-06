import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "fake-indexeddb/auto";
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
Object.defineProperty(window, "scrollTo", { value: () => {}, writable: true });
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute("open");
  this.dispatchEvent(new Event("close"));
};
URL.createObjectURL = () => "blob:test-document";
URL.revokeObjectURL = () => {};
