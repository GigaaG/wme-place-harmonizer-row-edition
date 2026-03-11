import { defineConfig, Plugin } from "vite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function buildUserscriptBanner(): string {
  const packageJsonPath = resolve(process.cwd(), "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    version: string;
    description?: string;
  };

  return `// ==UserScript==
// @name         WME Place Harmonizer ROW Edition
// @namespace    https://github.com/
// @version      ${packageJson.version}
// @description  ${packageJson.description ?? "WME Place Harmonizer ROW Edition"}
// @author       Contributors
// @match        https://www.waze.com/*editor*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      raw.githubusercontent.com
// @run-at       document-end
// ==/UserScript==

`;
}

function userscriptHeaderPlugin(): Plugin {
  return {
    name: "userscript-header",
    generateBundle(_, bundle) {
      const header = buildUserscriptBanner();

      for (const fileName of Object.keys(bundle)) {
        const chunk = bundle[fileName];

        if (chunk.type === "chunk" && fileName.endsWith(".user.js")) {
          chunk.code = header + chunk.code;
        }
      }
    }
  };
}

export default defineConfig({
  plugins: [userscriptHeaderPlugin()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    target: "es2020",
    lib: {
      entry: resolve(__dirname, "src/main.ts"),
      formats: ["iife"],
      name: "WMEPlaceHarmonizerROWEdition"
    },
    rollupOptions: {
      output: {
        format: "iife",
        entryFileNames: "wme-place-harmonizer-row-edition.user.js"
      }
    }
  }
});