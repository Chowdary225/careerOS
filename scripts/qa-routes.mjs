import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const base = new URL(process.argv[2] || "http://127.0.0.1:4173");
const routes = [
  "/dashboard",
  "/profile",
  "/resume",
  "/jobs",
  "/applications",
  "/applications/tracker",
  "/privacy",
  "/terms",
  "/unknown-qa-route",
];
for (const route of routes) {
  const response = await fetch(new URL(route, base));
  const html = await response.text();
  if (
    !response.ok ||
    !response.headers.get("content-type")?.includes("text/html") ||
    !html.includes('id="root"') ||
    !html.includes("CareerOS")
  )
    throw new Error(
      `Route did not serve the application shell: ${route} (${response.status})`,
    );
}
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const dist = new URL("../dist/", import.meta.url);
let count = 0;
async function verify(directory, prefix = "") {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix + entry.name;
    const file = new URL(
      entry.name + (entry.isDirectory() ? "/" : ""),
      directory,
    );
    if (entry.isDirectory()) {
      await verify(file, name + "/");
      continue;
    }
    if (name === "index.html") continue;
    const response = await fetch(new URL("/" + name, base));
    if (!response.ok) throw new Error(`Asset failed: ${name}`);
    const actual = Buffer.from(await response.arrayBuffer());
    if (hash(actual) !== hash(await readFile(file)))
      throw new Error(`Asset mismatch or HTML fallback: ${name}`);
    count++;
  }
}
await verify(dist);
console.log(
  `PASS: ${routes.length} local shell routes and ${count} built assets match dist byte-for-byte. This is HTTP/build verification, not browser or production QA.`,
);
