/** Extract plain text only. No uploaded markup is inserted into the DOM. */
export async function extractDocx(buffer: ArrayBuffer): Promise<string> {
  const { unzipSync, strFromU8 } = await import("fflate");
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(buffer), {
      filter: (file) => {
        if (file.name !== "word/document.xml") return false;
        if (file.originalSize > 8 * 1024 * 1024)
          throw new Error(
            "This document contains too much uncompressed text. Choose a smaller DOCX.",
          );
        return true;
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("too much uncompressed text"))
      throw error;
    throw new Error("This file is not a valid or readable DOCX document.");
  }
  const xml = files["word/document.xml"];
  if (!xml) throw new Error("This file is not a valid DOCX document.");
  const document = new DOMParser().parseFromString(
    strFromU8(xml),
    "application/xml",
  );
  if (document.querySelector("parsererror"))
    throw new Error("The DOCX document contains invalid XML.");
  const namespace =
    "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  if (
    document.documentElement.localName !== "document" ||
    document.documentElement.namespaceURI !== namespace
  )
    throw new Error("This file does not contain a valid Word document.");
  const textOfParagraph = (paragraph: Element) => {
    const text = Array.from(paragraph.getElementsByTagNameNS(namespace, "*"))
      .map((node) =>
        node.localName === "t"
          ? node.textContent || ""
          : node.localName === "tab"
            ? "\t"
            : ["br", "cr"].includes(node.localName)
              ? "\n"
              : "",
      )
      .join("");
    return paragraph.getElementsByTagNameNS(namespace, "numPr").length
      ? `• ${text}`
      : text;
  };
  const body = document.getElementsByTagNameNS(namespace, "body")[0];
  if (!body) throw new Error("This DOCX document has no readable document body.");
  const blocks: string[] = [];
  for (const child of Array.from(body.children)) {
    if (child.localName === "p") {
      blocks.push(textOfParagraph(child));
    } else if (child.localName === "tbl") {
      const rows = Array.from(child.getElementsByTagNameNS(namespace, "tr"));
      blocks.push(rows.map((row) => Array.from(row.children)
        .filter((cell) => cell.localName === "tc")
        .map((cell) => Array.from(cell.getElementsByTagNameNS(namespace, "p"))
          .map(textOfParagraph).filter(Boolean).join("\n"))
        .join(" | ")).filter(Boolean).join("\n"));
    }
  }
  return blocks.join("\n");
}
