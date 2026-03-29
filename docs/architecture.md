# WME Place Harmonizer ROW Edition Architecture

This document describes the current implementation. It is intentionally limited to the architecture that exists in the checked-in code.

## System overview

The workspace consists of two repositories:

- `wme-place-harmonizer-row-edition`: userscript code, runtime behavior, tests, and code-side docs
- `wme-place-harmonizer-row-data`: manifests, config, chains, locales, validation tooling, and data-side docs

The userscript is loaded into Waze Map Editor and uses the public WME SDK as its primary integration surface.

## Startup flow

At startup the userscript:

1. boots through [`src/bootstrap/init.ts`](../src/bootstrap/init.ts)
2. checks that the environment is supported
3. loads persisted user settings from local storage
4. loads a manifest for the active data channel
5. resolves an initial country from the current selection, visible map context, runtime state, or fallback setting
6. loads runtime config and chain data for that country
7. loads the best available locale file
8. mounts the sidebar placeholder and registers WME event listeners

The main runtime orchestration lives in [`src/app/start.ts`](../src/app/start.ts).

## Runtime data loading

The runtime loads data from the companion data repository through fixed paths plus a manifest:

- required core files:
  - `manifest/<channel>.json`
  - `config/global.json`
  - `chains/global.json`
- optional overlays:
  - `config/countries/<country>.json`
  - `chains/countries/<country>.json`
- locale files listed in the manifest

Current behavior:

- the manifest is validated and cached
- `config/global.json` and `chains/global.json` are strict core dependencies
- country-specific config and chain datasets are optional overlays
- invalid or missing country overlays fall back to global data with warning logs
- config inheritance through `extends` is supported by the loader

The manifest is not yet the full authoritative loader for config and chain file discovery. Core config and chain paths are still selected in code.

## Country resolution

Country selection is runtime-driven. The script tries, in order:

1. the selected venue
2. visible map context
3. the previous runtime country
4. the saved fallback country

This affects which country overlay the userscript attempts to load before analyzing a venue or scanning visible venues.

## Analysis pipeline

When a venue is selected, the runtime:

1. maps the SDK venue into the internal place-like model
2. resolves the effective country
3. reloads runtime config and chains if the country changed
4. matches the venue against chain data
5. resolves category standards and the effective policy
6. evaluates the place and produces issues
7. turns issues into proposals
8. applies the local whitelist filter
9. renders results in the feature editor and sidebar

Current rule inputs come from:

- `rules.cityInVenueName`
- `formatting.phone`
- `formatting.url`
- category standards
- chain policy

Published exception datasets are not part of this pipeline yet.

## UI surfaces

The current implementation has two main UI surfaces:

- a feature-editor block that shows venue analysis, issues, proposals, apply actions, and whitelist actions
- a sidebar panel that shows runtime/debug state and scan controls

The runtime also supports scanning visible venues and rendering highlight output on the map.

## Persistence

The script persists small amounts of client-side state:

- user settings in local storage
- whitelist entries in local storage
- cached manifest data through the cache manager

Whitelist entries are local to the browser profile and tied to a runtime snapshot of the active config and chain dataset versions.

## Logging and safety

The runtime uses structured loader validation and logger output to make failures visible without silently masking core data problems.

Current safety behavior:

- invalid manifests fail unless a valid cached manifest is available
- invalid global config or global chains fail startup
- invalid country overlays fall back to global data with explicit warnings
- invalid whitelist storage resets to an empty whitelist store

## Active non-features

The following items are intentionally not documented as active runtime features because they are not implemented in the current code:

- shared exception datasets
- manifest-driven dynamic loading of config and chain files
- data-side merge strategy execution
- whitelist import/export
- state-level runtime config resolution as a first-class loading step
