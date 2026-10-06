import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cpSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "local-pdf-resources",
      buildStart() {
        const output = fileURLToPath(
          new URL("./public/pdf-assets/", import.meta.url),
        );
        mkdirSync(output, { recursive: true });
        for (const folder of ["cmaps", "standard_fonts"])
          cpSync(
            fileURLToPath(
              new URL(`./node_modules/pdfjs-dist/${folder}`, import.meta.url),
            ),
            `${output}${folder}`,
            { recursive: true },
          );
      },
    },
  ],
  build: { chunkSizeWarningLimit: 1200 },
});
