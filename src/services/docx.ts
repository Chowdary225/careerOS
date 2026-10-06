/** Extract plain text only. No uploaded markup is inserted into the DOM. */
export async function extractDocx(buffer: ArrayBuffer): Promise<string> {
  const { unzipSync, strFromU8 } = await import("fflate");
  const files = unzipSync(new Uint8Array(buffer), {
    filter: (file) => {
      if (file.name !== "word/document.xml") return false;
      if (file.originalSize > 8 * 1024 * 1024)
        throw new Error(
          "This document contains too much uncompressed text. Choose a smaller DOCX.",
        );
      return true;
    },
  });
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
  const paragraphs = Array.from(
    document.getElementsByTagNameNS(namespace, "p"),
  );
  return paragraphs
    .map((p) =>
      Array.from(p.getElementsByTagNameNS(namespace, "*"))
        .map((node) =>
          node.localName === "t"
            ? node.textContent || ""
            : ["tab"].includes(node.localName)
              ? "\t"
              : ["br", "cr"].includes(node.localName)
                ? "\n"
                : "",
        )
        .join(""),
    )
    .join("\n");
}
