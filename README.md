# WME Place Harmonizer ROW Edition

WME Place Harmonizer ROW Edition is a Tampermonkey userscript for Waze Map Editor (WME). It helps ROW editors review Places/POIs against shared standards, highlight issues, and apply selected fixes without making automatic edits on their behalf.

## For Users

### What the script does

- analyzes the currently selected place
- matches places against configured chains and category standards
- shows issues and proposed fixes in a WME sidebar tab
- scans visible venues on the map and highlights them by status
- lets you apply supported changes selectively

The script is config-driven and uses a separate public data repository for manifests, chains, config, exceptions, and locales:

- [wme-place-harmonizer-row-data](https://github.com/GigaaG/wme-place-harmonizer-row-data)

The UI language follows the user's WME locale via the WME SDK and falls back to the data-side default locale, then to English if no matching locale file exists.

### What you need

- access to Waze Map Editor
- Tampermonkey in your browser
- a built `.user.js` file from this repository or a published release artifact

### Install the script

1. Get a built userscript file:
   - `dist/wme-place-harmonizer-row-edition.user.js` for the stable build
   - `dist/wme-place-harmonizer-row-edition.dev.user.js` for the dev build
2. Open that file in Tampermonkey.
3. Install or update the script.
4. Open Waze Map Editor.

If you are working from source instead of a release artifact, follow the developer setup below to generate the `dist/` files first.

### Use the script

1. Open WME and wait for the userscript to initialize.
2. Select a place.
3. Review the Harmonization tab in the WME sidebar.
4. Inspect the detected issues and proposed values.
5. Select only the changes you want.
6. Apply the selected fixes.

You can also use the Highlighter / Scan tools to analyze visible venues on the map and color them by severity.

### Current MVP behavior

- no automatic edits are made without explicit user action
- supported proposals can be applied selectively
- some fields still require manual editor interaction
- geometry transitions and some advanced editing flows are intentionally limited

### Stable and dev channels

The production build defaults to the `stable` data channel. The development build defaults to the `dev` data channel.
The active UI locale is independent from the data channel and is resolved from the WME locale first.

## For Developers

### Prerequisites

- Node.js
- npm
- Tampermonkey
- access to Waze Map Editor for runtime testing

### Setup

```bash
npm install
```

### Common commands

```bash
npm run dev
npm run build:dev
npm run build:prod
npm run test
```

The repository also defines `npm run lint`, but the current checkout does not include an `eslint.config.*` file yet, so ESLint will not run successfully until that configuration is added.

### Build outputs

- `npm run build:dev` writes `dist/wme-place-harmonizer-row-edition.dev.user.js`
- `npm run build:prod` writes `dist/wme-place-harmonizer-row-edition.user.js`

Dev builds use `WMEPH-ROW:dev:*` local storage keys. Production builds use `WMEPH-ROW:*`.

### Recommended local workflow

1. Install dependencies with `npm install`.
2. Run `npm run build:dev` or `npm run dev`.
3. Load the generated dev userscript into Tampermonkey.
4. Test the script in WME.
5. Run `npm run test` before opening a pull request.
6. Run `npm run lint` as soon as the repository ESLint config is present.

### Repository layout

```text
src/        TypeScript source code
tests/      Automated tests
docs/       Architecture, scope, UI, and release docs
dist/       Generated userscript output
scripts/    Build and support scripts
```

### Architecture and reference docs

Useful starting points:

- [docs/architecture.md](docs/architecture.md)
- [docs/v1-scope.md](docs/v1-scope.md)
- [docs/ui-flow.md](docs/ui-flow.md)
- [docs/build-and-release.md](docs/build-and-release.md)

### Cross-repository note

This repository is the code side of a two-repository system. When behavior, contracts, or runtime data expectations change here, check whether the related data repository also needs updates:

- [wme-place-harmonizer-row-data](https://github.com/GigaaG/wme-place-harmonizer-row-data)

That includes locale keys, translated locale files, the locale template, and locale-keyed `editorNotes` data when user-facing text changes.

### Release basics

1. Run `npm run lint`.
2. Run `npm run test`.
3. Run `npm run build:prod`.
4. Test the production userscript in WME.
5. Commit the release-ready state and create a tag.

If the repository still has no `eslint.config.*` file, treat linting as a known setup gap and rely on tests plus runtime verification in WME until linting is wired up.

## License

[GNU GPL v3](LICENSE)
