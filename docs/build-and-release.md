# WME Place Harmonizer ROW Edition Build and Release

This document describes the current local build and release workflow for the userscript repository.

## Tooling and outputs

The repository is a TypeScript project built with Vite.

```text
dist/wme-place-harmonizer-row-edition.user.js
dist/wme-place-harmonizer-row-edition.beta.user.js
dist/wme-place-harmonizer-row-edition.dev.user.js
```

## Available npm scripts

```bash
npm run dev
npm run build
npm run build:dev
npm run build:beta
npm run build:prod
npm run lint
npm run check
npm run test
```

## Continuous Integration

A GitHub Actions workflow verifies pull requests and branch pushes by running `npm run check`, `npm run build:dev`, `npm run build:beta`, and `npm run build:prod`, then uploads the generated userscript artifacts. Publication is a separate post-merge step: on pushes to `beta`, CI republishes the verified beta userscript to the `beta-dist` artifact branch so Tampermonkey users can auto-update from a stable GitHub URL. On pushes to `main`, CI republishes the verified stable userscript to the `stable-dist` artifact branch so Greasy Fork can sync from a fixed stable artifact URL. Source branches stay free of committed generated userscript files, which avoids repeated merge conflicts during `dev -> beta -> main` promotion.

## Build modes

The repository supports three build modes:

- development
- beta
- production

Production builds write `dist/wme-place-harmonizer-row-edition.user.js`.
Beta builds write `dist/wme-place-harmonizer-row-edition.beta.user.js`.
Development builds write `dist/wme-place-harmonizer-row-edition.dev.user.js`.

Development builds use `WMEPH-ROW:dev:*` local storage keys.
Beta builds use `WMEPH-ROW:beta:*` local storage keys.
Production builds use `WMEPH-ROW:*`.

Beta builds generate beta-specific userscript metadata, including a beta name suffix, a beta version suffix, and `@downloadURL` / `@updateURL` entries that point at the `beta-dist` artifact branch on GitHub. Production builds stay clean for the Greasy Fork release path.

`npm run build:beta` and `npm run build:prod` stamp beta and stable artifacts from the current development build output, so run `npm run build:dev` first. Beta versions use the current `package.json` version plus a `-beta.<build>` suffix. Production versions use the plain `package.json` version.

## Data channel behavior

Build type also determines the default data source:

- production builds read from the data repository `main` branch and default to `manifest/stable.json`
- beta builds read from the data repository `beta` branch and default to `manifest/dev.json`
- development builds read from the data repository `dev` branch and default to `manifest/dev.json`

Switching the runtime channel changes the manifest within the active branch. It does not switch branches at runtime.

## Recommended local workflow

1. Run `npm install`.
2. Build a development userscript with `npm run build:dev` or `npm run dev`.
3. Load the generated userscript into Tampermonkey.
4. Test in WME.
5. Run `npm run check`.
6. Bump `package.json` to the version you intend to release before you start a beta cycle.
7. When you want a beta release, merge `dev` into `beta`. CI will verify the branch and republish the beta artifact that testers track to `beta-dist`. Run `npm run build:dev` and `npm run build:beta` locally if you want to inspect the generated beta file before or after the push.
8. After beta approval, merge `beta` into `main`, run `npm run build:dev` and `npm run build:prod`, and let Greasy Fork sync the stable artifact from `stable-dist`.

## Release checklist

Use the dedicated release checklist when promoting `beta` to `main` and syncing the stable release through Greasy Fork:

- [docs/release-checklist.md](release-checklist.md)
