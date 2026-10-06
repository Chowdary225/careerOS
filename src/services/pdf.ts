/** One local PDF.js configuration shared by extraction and preview. */
export async function openPdfTask(blob: Blob) {
  const pdf = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const worker = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
  pdf.GlobalWorkerOptions.workerSrc = worker.default;
  return pdf.getDocument({
    data: new Uint8Array(await blob.arrayBuffer()),
    isEvalSupported: false,
    useSystemFonts: true,
    cMapUrl: `${import.meta.env.BASE_URL}pdf-assets/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${import.meta.env.BASE_URL}pdf-assets/standard_fonts/`,
  });
}
