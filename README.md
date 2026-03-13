# WME Place Harmonizer ROW Edition

WME Place Harmonizer ROW Edition is a Tampermonkey userscript for Waze Map Editor (WME) focused on harmonizing and validating Places / POIs on the ROW (Rest of World) server.

The script is designed to be:

- config-first
- community-configurable
- GitHub-managed
- SDK-first
- safe by default

It analyzes selected venues, applies community and chain standards, highlights visible venues on the map, and proposes fixes that can be applied selectively.

---

## Project status

This repository currently contains the **code MVP**.

The code MVP includes:

- WME SDK integration
- selected venue analysis
- chain matching
- category-based standards
- issue detection
- config-driven phone format validation
- proposal generation
- selective apply flow for supported fields
- feature editor integration
- script sidebar tab
- visible venue scanning
- map highlights
- auto scan on pan / zoom with toggle

The separate data repository is still in progress and will receive its own MVP milestone later.

---

## Repository structure

```text
src/        TypeScript source code
docs/       Project design and architecture documents
dist/       Built userscript output
```

### Important files

- package.json
- tsconfig.json
- vite.config.ts

## Related repository

This project uses a separate public data repository for configuration, chains, exceptions and locales:

[wme-place-harmonizer-row-data](https://github.com/GigaaG/wme-place-harmonizer-row-data)

The code and data are intentionally separated.

## Requirements

To build or work on this repository you need:

- Node.js
- npm
- Tampermonkey
- access to Waze Map Editor

### Install dependencies

```bash
npm install
```

### Development build

```bash
npm run build:dev
```

or watch mode:

```bash
npm run dev
```

### Production build

```bash
npm run build:prod
```

The built userscript is written to:

- dev build: `dist/wme-place-harmonizer-row-edition.dev.user.js`
- production build: `dist/wme-place-harmonizer-row-edition.user.js`

Development builds store settings and cache under `WMEPH-ROW:dev:*` in `localStorage`.
Production builds continue to use `WMEPH-ROW:*`.

## Load into Tampermonkey

1. Build the project
2. Open the generated file in `dist/`
3. Install or update it in Tampermonkey
4. Open Waze Map Editor

## Current MVP features

### Feature editor

- selected venue analysis
- issue cards
- lock level recommendation issues
- suggestions / proposals
- apply selected fixes for supported fields
- venue-only rendering

### Script tab

- runtime status
- manifest/config/chains info
- reload data
- auto scan toggle
- visible venue scan summary

### Map tools

- scan visible venues
- highlight visible venues
- severity-based colors
- auto scan on pan and zoom

## Supported apply fields in MVP

The MVP currently supports selective apply for a limited set of fields.

### Examples include

- name
- lock level
- phone
- url
- services
- opening hours

### Some fields are intentionally not automatically applied yet, such as

- certain geometry transitions
- external provider ids
- fields requiring manual editor interaction

## Design principles

- no automatic changes without explicit user action
- community-driven standards via GitHub data files
- global defaults with local overrides
- chains and non-chain venues both supported
- safe fallbacks and runtime resilience

## Key design documents

See the `docs/` folder for the functional and technical design.

Recommended starting points:

- [docs/v1-scope.md](docs/v1-scope.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/ui-flow.md](docs/ui-flow.md)
- [docs/build-and-release.md](docs/build-and-release.md)

## Release process for the code repository

### Before a release

- Make sure all intended code changes are committed
- Run a production build
- Test the built userscript in WME
- Confirm the README and docs are up to date

### Build for release

```bash
npm run build:prod
```

### Commit release-ready state

```bash
git add .
git commit -m "Prepare MVP release"
```

### Create a tag

Example:

```bash
git tag v0.1.0-mvp
git push origin main
git push origin v0.1.0-mvp
```

### Optional GitHub release

After pushing the tag, create a GitHub Release from that tag and attach release notes if desired.

## Notes about data

The code repository is ready for an MVP tag.

The data repository is intentionally versioned separately and should only receive its MVP tag when representative configuration data has been added and validated.

## License / usage

Add the intended license for the project here when you decide on it.
