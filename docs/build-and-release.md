# WME Place Harmonizer ROW Edition Build and Release

This document describes the current local build and release workflow for the userscript repository.

## Tooling and outputs

The repository is a TypeScript project built with Vite.

Current build outputs:

```text
dist/wme-place-harmonizer-row-edition.user.js
dist/wme-place-harmonizer-row-edition.dev.user.js
```

These are the userscript files installed in Tampermonkey.

## Available npm scripts

```bash
npm run dev
npm run build
npm run build:dev
npm run build:prod
npm run test
npm run release:dev
npm run release:stable
```

`npm run lint` is defined in `package.json`, but the repository still does not contain an `eslint.config.*` file. Treat linting as unavailable until that configuration is added.

## Build modes

The repository supports two build modes:

- development
- production

Production builds write `dist/wme-place-harmonizer-row-edition.user.js`.
Development builds write `dist/wme-place-harmonizer-row-edition.dev.user.js`.

Development builds use `WMEPH-ROW:dev:*` local storage keys.
Production builds use `WMEPH-ROW:*`.

## Data channel behavior

Build type also determines the default data source:

- production builds read from the data repository `main` branch and default to `manifest/stable.json`
- development builds read from the data repository `dev` branch and default to `manifest/dev.json`

Switching the runtime channel changes the manifest within the active branch. It does not switch branches at runtime.

## Recommended local workflow

1. Run `npm install`.
2. Build a development userscript with `npm run build:dev` or `npm run dev`.
3. Load the generated userscript into Tampermonkey.
4. Test in WME.
5. Run `npm run test`.
6. Build a production userscript only when you want a release candidate.

## Manual release checklist

1. Ensure the working tree is in the intended release state.
2. Run `npm run test`.
3. Run `npm run build:prod`.
4. Install and test the production userscript in WME.
5. Create the release commit and tag.
6. Publish the generated `.user.js` artifact through the chosen release channel.

## Current repository gaps

- There is no active code-side CI workflow in the repository at the moment.
- Linting is not wired up yet because the ESLint configuration file is missing.
- Runtime verification in WME is still an important release gate.
