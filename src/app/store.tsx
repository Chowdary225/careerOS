import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import type { Workspace } from "../types";
import {
  emptyWorkspace,
  readWorkspace,
  writeWorkspace,
  rawWorkspace,
  clearWorkspace,
  clearOriginals,
  download,
} from "../services/repository";
import { messageFor } from "../services/validation";
type Store = {
  data: Workspace;
  update: (fn: (data: Workspace) => Workspace) => boolean;
  reset: () => Promise<boolean>;
  downloadFile: (blob: Blob, name: string) => boolean;
  notice: string;
  notify: (s: string) => void;
  error: string;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => {
    try {
      return { data: readWorkspace(), raw: rawWorkspace(), error: "" };
    } catch (e) {
      return {
        data: emptyWorkspace(),
        raw: null,
        error: messageFor(e, "Local workspace could not be read."),
      };
    }
  });
  const [data, setData] = useState(initial.data);
  const current = useRef(initial.data);
  const expectedRaw = useRef(initial.raw);
  const readBlocked = useRef(!!initial.error);
  const resetting = useRef(false);
  const [error, setError] = useState(initial.error);
  const [notice, notify] = useState("");
  const update = useCallback((fn: (data: Workspace) => Workspace) => {
    if (readBlocked.current) {
      setError(
        "Saved records could not be read. To avoid overwriting them, export or delete the existing records from Privacy first.",
      );
      return false;
    }
    if (resetting.current) {
      setError("Workspace deletion is in progress. Please wait.");
      return false;
    }
    let next: Workspace;
    try {
      next = fn(current.current);
    } catch (e) {
      setError(messageFor(e, "This change could not be applied."));
      return false;
    }
    try {
      if (rawWorkspace() !== expectedRaw.current) {
        setError(
          "This workspace changed in another tab. Reload before saving to avoid overwriting newer changes.",
        );
        return false;
      }
      writeWorkspace(next);
      expectedRaw.current = rawWorkspace();
      current.current = next;
      setData(next);
      setError("");
      return true;
    } catch {
      setError(
        "Changes could not be saved. Browser storage may be full or unavailable.",
      );
      return false;
    }
  }, []);
  const downloadFile = useCallback((blob: Blob, name: string) => {
    try {
      download(blob, name);
      return true;
    } catch {
      setError(
        "Download could not be started. Check browser download permissions and try again.",
      );
      return false;
    }
  }, []);
  const reset = useCallback(async () => {
    if (resetting.current) return false;
    resetting.current = true;
    try {
      // Removing the record works even when the storage quota prevents a new write.
      clearWorkspace();
      expectedRaw.current = null;
      readBlocked.current = false;
      current.current = emptyWorkspace();
      setData(current.current);
      try {
        await clearOriginals();
      } catch (e) {
        setError(
          "Workspace records were deleted, but some original files may remain. Retry deletion or clear browser site data. " +
            messageFor(e, ""),
        );
        return false;
      }
      notify("");
      setError("");
      return true;
    } catch {
      setError(
        "Local data could not be deleted. Clear CareerOS site data in your browser settings.",
      );
      return false;
    } finally {
      resetting.current = false;
    }
  }, []);
  return (
    <Context.Provider
      value={{ data, update, reset, downloadFile, notice, notify, error }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const context = useContext(Context);
  if (!context) throw new Error("Store provider missing");
  return context;
}
