import type { CareerProfile, Workspace, Resume } from "../types";
import { isWorkspace } from "./validation";
export const emptyProfile: CareerProfile = {
  user: { name: "", email: "", phone: "", location: "", linkedin: "", portfolio: "" },
  targetRole: "",
  category: "Engineering",
  location: "",
  years: "",
  salary: "",
  mode: "Any",
  employment: "Full-time",
  targetRoles: [],
  education: [],
  experience: [],
  skills: [],
  projects: [],
  certifications: [],
  achievements: "",
  summary: "",
};
export const emptyWorkspace = (): Workspace => ({
  profile: structuredClone(emptyProfile),
  resumes: [],
  versions: [],
  applications: [],
  savedJobs: [],
});
const KEY = "careeros.workspace.v1";
export function readWorkspace(): Workspace {
  const raw = localStorage.getItem(KEY);
  if (!raw) return emptyWorkspace();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(
      "Saved workspace could not be read. Existing records have been preserved. Export them from Privacy before clearing local data.",
    );
  }
  if (!isWorkspace(data))
    throw new Error(
      "Saved workspace is incomplete or invalid. Existing records have been preserved. Export them from Privacy before clearing local data.",
    );
  return data;
}
export function writeWorkspace(data: Workspace) {
  localStorage.setItem(KEY, JSON.stringify(data));
}
export function clearWorkspace() {
  localStorage.removeItem(KEY);
}
export const id = () => crypto.randomUUID();
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("careeros-files", 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("originals"))
        request.result.createObjectStore("originals");
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(
        new Error(
          "Resume storage is blocked by another tab. Close other CareerOS tabs and retry.",
        ),
      );
  });
}
async function mutateOriginals(action: (store: IDBObjectStore) => void) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("originals", "readwrite");
      tx.oncomplete = () => resolve();
      tx.onabort = () =>
        reject(
          tx.error || new Error("Resume storage transaction was cancelled."),
        );
      tx.onerror = () =>
        reject(tx.error || new Error("Resume storage could not be updated."));
      action(tx.objectStore("originals"));
    });
  } finally {
    db.close();
  }
}
export function storeOriginal(resume: Resume, file: File) {
  return mutateOriginals((store) => {
    store.add(file, resume.id);
  });
}
export function removeOriginal(key: string) {
  return mutateOriginals((store) => {
    store.delete(key);
  });
}
export function clearOriginals() {
  return mutateOriginals((store) => {
    store.clear();
  });
}
export async function getOriginal(key: string): Promise<Blob | undefined> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("originals");
      const request = tx.objectStore("originals").get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.onabort = () =>
        reject(tx.error || new Error("Resume storage could not be read."));
    });
  } finally {
    db.close();
  }
}
export function rawWorkspace() {
  return localStorage.getItem(KEY);
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
