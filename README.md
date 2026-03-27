# WME Place Harmonizer ROW Edition

WME Place Harmonizer ROW Edition is a Tampermonkey userscript for Waze Map Editor (WME). It helps editors review places against shared standards, see what looks wrong, and apply selected fixes manually.

## For Users

### What the script is

This script adds harmonization checks to WME for the ROW environment. It is designed to support place maintenance without making automatic edits on the editor's behalf.

### What it does

In the current implementation, the script:

- analyzes the selected venue in WME
- matches venues against configured chains and category standards
- shows issues and proposals in the feature editor and the script sidebar
- scans visible venues on the map and highlights them by status
- lets the editor apply supported proposals selectively

The script is data-driven. It reads manifests, config, chains, locales, and reference data from the companion repository:

- [wme-place-harmonizer-row-data](https://github.com/GigaaG/wme-place-harmonizer-row-data)

The data repository also publishes exception datasets, but the current userscript runtime does not consume them yet.

### Who it is for

This script is intended for Waze editors and maintainers who want help reviewing place data against shared standards before making manual edits.

### Main features

- venue analysis for the current selection
- chain matching
- category-based policy checks
- phone and URL formatting validation where configured
- visible-venue scan and highlight output
- local whitelist support for suppressing specific issues

### Installation and usage

You need:

- access to Waze Map Editor
- Tampermonkey in your browser
- a built `.user.js` file from this repository or a published release artifact

Install the script:

1. Obtain a built userscript file.
   - `dist/wme-place-harmonizer-row-edition.user.js` for the production build
   - `dist/wme-place-harmonizer-row-edition.dev.user.js` for the development build
2. Open the file in Tampermonkey.
3. Install or update the script.
4. Open WME and wait for the userscript to initialize.

Use the script:

1. Select a place in WME.
2. Review the analysis shown in the feature editor and sidebar.
3. Inspect the reported issues and proposed values.
4. Select only the changes you want.
5. Apply the selected fixes.

The script also supports scanning visible venues and highlighting them by severity.

### Important limitations and notes

- The script does not make automatic edits.
- Only supported proposal types can be applied from the UI.
- Some edits still require manual work in WME.
- Country-specific config and chain overlays are optional; when they fail to load, the runtime falls back to global data and logs the reason.
- The UI locale follows the WME SDK locale first, then the data-side default locale, then English.

### Stable and development channels

Production builds read data from the data repository `main` branch and default to `manifest/stable.json`.
Development builds read data from the data repository `dev` branch and default to `manifest/dev.json`.
Changing the runtime data channel switches between the stable and dev manifests inside the active branch. It does not switch branches at runtime.

## For Developers

### Repository structure

```text
src/        TypeScript source code
tests/      Source-level automated tests
docs/       Maintained implementation and workflow docs
dist/       Generated userscript output
scripts/    Build support scripts
```

### Local setup

Prerequisites:

- Node.js
- npm
- Tampermonkey
- access to WME for runtime testing

Install dependencies:

```bash
npm install
```

Common commands:

```bash
npm run dev
npm run build:dev
npm run build:prod
npm run test
```

The repository also defines `npm run lint`, but the current checkout still does not include an `eslint.config.*` file. Treat linting as a known setup gap until that configuration is added.

### Build outputs

- `npm run build:dev` writes `dist/wme-place-harmonizer-row-edition.dev.user.js`
- `npm run build:prod` writes `dist/wme-place-harmonizer-row-edition.user.js`

Development builds use `WMEPH-ROW:dev:*` storage keys. Production builds use `WMEPH-ROW:*`.

### Relationship with the data repository

This repository is the code side of a two-repository system. Runtime behavior depends on data published from:

- [wme-place-harmonizer-row-data](https://github.com/GigaaG/wme-place-harmonizer-row-data)

When behavior, contracts, or user-facing text change here, check whether the data repository also needs updates. That commonly includes locale files, locale templates, manifests, config, chains, and locale-keyed `editorNotes`.

The current runtime actively consumes:

- `config/global.json` and optional country config overlays
- `chains/global.json` and optional country chain overlays
- manifest metadata and locale file availability
- locale files
- the SDK values snapshot during local build and test workflows

Published exception datasets and data-side merge strategies are not active runtime features in the current userscript implementation.

### Contributing and verification

Recommended local workflow:

1. Install dependencies with `npm install`.
2. Build a development userscript with `npm run build:dev` or `npm run dev`.
3. Load the generated userscript into Tampermonkey.
4. Test the script in WME.
5. Run `npm run test` before opening a pull request.

### Further documentation

- [docs/architecture.md](docs/architecture.md)
- [docs/build-and-release.md](docs/build-and-release.md)
- [docs/whitelist-model.md](docs/whitelist-model.md)

## License

[GNU GPL v3](LICENSE)
