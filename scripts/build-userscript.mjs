import { build } from "vite";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const channel = process.argv[2];
const extraArgs = process.argv.slice(3);
const isWatch = extraArgs.includes("--watch");

if (!["dev", "beta", "stable"].includes(channel)) {
  console.error(
    "Usage: node scripts/build-userscript.mjs <dev|beta|stable> [--watch]"
  );
  process.exit(1);
}

const packageJson = JSON.parse(
  readFileSync(resolve("package.json"), "utf8")
);
const REPOSITORY_OWNER = "GigaaG";
const REPOSITORY_NAME = "wme-place-harmonizer-row-edition";
const PUBLISHED_USERSCRIPT_FILE_NAME = "wme-place-harmonizer-row-edition.user.js";
const BETA_PUBLISH_BRANCH = "beta-dist";

function getBuildSequence() {
  return (
    process.env.GITHUB_RUN_NUMBER ??
    process.env.BUILD_NUMBER ??
    String(Date.now())
  );
}

function getUserscriptFileName(buildChannel) {
  if (buildChannel === "beta") {
    return "wme-place-harmonizer-row-edition.beta.user.js";
  }

  if (buildChannel === "stable") {
    return "wme-place-harmonizer-row-edition.user.js";
  }

  return "wme-place-harmonizer-row-edition.dev.user.js";
}

function buildUserscriptHeader(params) {
  const { version, nameSuffix = "", updateUrl = null } = params;

  const lines = [
    "// ==UserScript==",
    `// @name         WME Place Harmonizer ROW Edition${nameSuffix}`,
    "// @namespace    https://github.com/",
    `// @version      ${version}`,
    `// @description  ${
      packageJson.description ?? "WME Place Harmonizer ROW Edition"
    }`,
    "// @author       Contributors",
    "// @include      https://www.waze.com/editor*",
    "// @include      https://www.waze.com/*/editor*",
    "// @include      https://beta.waze.com/editor*",
    "// @include      https://beta.waze.com/*/editor*",
    "// @exclude      https://www.waze.com/user*",
    "// @exclude      https://www.waze.com/*/user*"
  ];

  if (updateUrl) {
    lines.push(`// @downloadURL  ${updateUrl}`);
    lines.push(`// @updateURL    ${updateUrl}`);
  }

  lines.push(
    "// @grant        GM_xmlhttpRequest",
    "// @grant        unsafeWindow",
    "// @connect      raw.githubusercontent.com",
    "// @run-at       document-end",
    "// ==/UserScript=="
  );

  return lines.join("\n");
}

function userscriptHeaderPlugin() {
  return {
    name: "userscript-header",
    generateBundle(_, bundle) {
      const header = buildUserscriptHeader({
        version: `${packageJson.version}-dev.${getBuildSequence()}`,
        nameSuffix: " (Dev)"
      });

      for (const fileName of Object.keys(bundle)) {
        const chunk = bundle[fileName];

        if (chunk.type === "chunk" && fileName.endsWith(".user.js")) {
          chunk.code = `${header}\n\n${chunk.code}`;
        }
      }
    }
  };
}

function stripSourceMappingUrl(source) {
  return source.replace(/\n?\/\/# sourceMappingURL=.*$/u, "");
}

function splitBundle(source) {
  const headerEndMarker = "// ==/UserScript==";
  const headerEnd = source.indexOf(headerEndMarker);

  if (headerEnd === -1) {
    throw new Error("Could not find userscript header end marker");
  }

  const bodyStart = source.indexOf("\n\n", headerEnd);

  if (bodyStart === -1) {
    throw new Error("Could not find userscript body start");
  }

  return {
    body: source.slice(bodyStart + 2)
  };
}

async function buildDevArtifact() {
  await build({
    configFile: false,
    mode: "development",
    plugins: [userscriptHeaderPlugin()],
    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: true,
      minify: false,
      target: "es2020",
      lib: {
        entry: resolve(process.cwd(), "src/main.ts"),
        formats: ["iife"],
        name: "WMEPlaceHarmonizerROWEdition"
      },
      rollupOptions: {
        output: {
          format: "iife",
          entryFileNames: getUserscriptFileName("dev")
        }
      },
      watch: isWatch ? {} : undefined
    }
  });
}

if (channel === "dev") {
  await buildDevArtifact();
} else {
  const devArtifactPath = resolve("dist", getUserscriptFileName("dev"));
  try {
    readFileSync(devArtifactPath, "utf8");
  } catch {
    console.error(
      "Missing dev build artifact. Run `npm run build:dev` before `npm run build:beta` or `npm run build:prod`."
    );
    process.exit(1);
  }

  const targetFileName = getUserscriptFileName(channel);
  const targetPath = resolve("dist", targetFileName);
  const version =
    channel === "beta"
      ? `${packageJson.version}-beta.${getBuildSequence()}`
      : packageJson.version;
  const updateUrl =
    channel === "beta"
      ? `https://raw.githubusercontent.com/${REPOSITORY_OWNER}/${REPOSITORY_NAME}/${BETA_PUBLISH_BRANCH}/dist/${PUBLISHED_USERSCRIPT_FILE_NAME}`
      : null;
  const runtimeChannelLine =
    `globalThis.__WMEPH_ROW_BUILD_CHANNEL__ = "${channel}";`;
  const nameSuffix = channel === "beta" ? " (Beta)" : "";
  const source = readFileSync(devArtifactPath, "utf8").replace(/\r\n/g, "\n");
  const { body } = splitBundle(source);
  const header = buildUserscriptHeader({
    version,
    nameSuffix,
    updateUrl
  });
  const output = `${header}\n\n${runtimeChannelLine}\n${body}`;

  writeFileSync(targetPath, stripSourceMappingUrl(output), "utf8");
}
