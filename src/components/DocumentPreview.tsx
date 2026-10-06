import { useEffect, useRef, useState } from "react";
import { openPdfTask } from "../services/pdf";
import type {
  PDFDocumentProxy,
  PDFDocumentLoadingTask,
  RenderTask,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import { ChevronLeft, ChevronRight, Minus, Plus, FileText } from "lucide-react";
export function DocumentPreview({
  blob,
  text,
  pageCount,
}: {
  blob?: Blob;
  text: string;
  pageCount: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isPdf = blob?.type === "application/pdf";
  const [loaded, setLoaded] = useState<{
    blob: Blob;
    document: PDFDocumentProxy;
  } | null>(null);
  useEffect(() => {
    setPage(1);
    setZoom(100);
    setLoaded(null);
    setError("");
    setLoading(!!blob && isPdf);
    if (!blob || !isPdf) return;
    let cancelled = false;
    let task: PDFDocumentLoadingTask | undefined;
    (async () => {
      task = await openPdfTask(blob);
      if (cancelled) {
        void task.promise.catch(() => {});
        await task.destroy();
        return;
      }
      const document = await task.promise;
      if (!cancelled) setLoaded({ blob, document });
    })().catch((error) => {
      if (!cancelled) {
        setError(
          error instanceof Error
            ? `Preview unavailable: ${error.message}. Download the original to view it.`
            : "Preview unavailable. Download the original to view it.",
        );
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
      if (task)
        void task
          .destroy()
          .catch((error) => console.error("PDF cleanup failed", error));
    };
  }, [blob, isPdf]);
  useEffect(() => {
    if (!loaded || loaded.blob !== blob) return;
    let cancelled = false;
    let renderTask: RenderTask | undefined;
    setError("");
    setLoading(true);
    (async () => {
      const p = await loaded.document.getPage(
        Math.min(page, loaded.document.numPages),
      );
      if (cancelled) return;
      const base = p.getViewport({ scale: 1 });
      const scale = Math.min(
        1.7,
        Math.sqrt(16000000 / (base.width * base.height)),
      );
      const viewport = p.getViewport({ scale });
      const target = canvas.current;
      if (!target) throw new Error("Preview canvas is unavailable");
      const context = target.getContext("2d");
      if (!context)
        throw new Error("Canvas rendering is unavailable in this browser");
      target.height = viewport.height;
      target.width = viewport.width;
      renderTask = p.render({ canvasContext: context, viewport });
      await renderTask.promise;
      if (!cancelled) setLoading(false);
    })().catch((error) => {
      if (!cancelled) {
        setError(
          error instanceof Error
            ? `Preview unavailable: ${error.message}. Download the original to view it.`
            : "Preview unavailable. Download the original to view it.",
        );
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [loaded, blob, page]);
  return (
    <>
      <div className="document-stage" aria-busy={loading}>
        {loading && (
          <div role="status" className="preview-loading">
            Rendering document...
          </div>
        )}
        {error ? <p role="alert">{error}</p> : null}
        {isPdf ? (
          <canvas
            key={page}
            ref={canvas}
            role="img"
            hidden={!!error}
            className="pdf-canvas"
            style={{
              width: zoom + "%",
              maxWidth: "none",
              alignSelf: zoom > 100 ? "flex-start" : "center",
            }}
            aria-label={`Resume preview, page ${page}`}
          />
        ) : text ? (
          <article
            className="paper text-paper"
            style={{ fontSize: (13 * zoom) / 100 }}
          >
            <pre>{text}</pre>
          </article>
        ) : (
          <div className="blank-document">
            <div className="blank-doc-icon">
              <FileText size={40} strokeWidth={1} />
            </div>
            <h2>Your experience belongs here.</h2>
            <p>
              Upload your resume to preview the original
              <br />
              and review its extracted details.
            </p>
            <div className="document-outline">
              <span />
              <i />
              <i />
              <hr />
              <i />
              <i />
              <i />
              <hr />
              <i />
              <i />
            </div>
          </div>
        )}
      </div>
      {isPdf && text && (
        <div className="sr-only" aria-label="Extracted resume text">
          {text}
        </div>
      )}
      <div className="document-controls">
        <div>
          <button
            className="icon-button"
            aria-label="Previous page"
            disabled={!loaded || page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft size={15} />
          </button>
          <span>
            {blob
              ? `Page ${page} of ${isPdf ? pageCount : 1}`
              : "No document selected"}
          </span>
          <button
            className="icon-button"
            aria-label="Next page"
            disabled={!loaded || page >= pageCount}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight size={15} />
          </button>
        </div>
        <div>
          <button
            className="icon-button"
            aria-label="Zoom out"
            disabled={!blob || zoom <= 60}
            onClick={() => setZoom(zoom - 10)}
          >
            <Minus size={15} />
          </button>
          <span>{zoom}%</span>
          <button
            className="icon-button"
            aria-label="Zoom in"
            disabled={!blob || zoom >= 160}
            onClick={() => setZoom(zoom + 10)}
          >
            <Plus size={15} />
          </button>
        </div>
      </div>
    </>
  );
}
