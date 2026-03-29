import { defineConfig, Plugin } from "vite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function getUserscriptFileName(isDevBuild: boolean): string {
  return isDevBuild
    ? "wme-place-harmonizer-row-edition.dev.user.js"
    : "wme-place-harmonizer-row-edition.user.js";
}

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
// @include      https://www.waze.com/editor*
// @include      https://www.waze.com/*/editor*
// @include      https://beta.waze.com/editor*
// @include      https://beta.waze.com/*/editor*
// @exclude      https://www.waze.com/user*
// @exclude      https://www.waze.com/*/user*
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

export default defineConfig(({ mode }) => {
  const isDevBuild = mode === "development";

  return {
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
          entryFileNames: getUserscriptFileName(isDevBuild)
        }
      }
    }
  };
});
