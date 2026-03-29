# WME Place Harmonizer ROW Edition Whitelist Model

This document describes the whitelist behavior that exists in the current userscript runtime.

## Purpose

The whitelist is a local browser-side suppression mechanism. It lets an editor hide specific issue groups for a specific place without changing the shared data repository. It is separate from shared exception datasets, which are published in the data repository but are not consumed by the current runtime.

## Storage

Whitelist data is stored in local storage.

Storage keys:

- development builds: `WMEPH-ROW:dev:whitelist`
- production builds: `WMEPH-ROW:whitelist`

The stored object has this shape:

```json
{
  "version": 1,
  "items": []
}
```

## Entry format

Each whitelist entry contains:

- `placeId`
- `ruleId`
- `field`
- `scope`
- `createdAt`
- optional `updatedAt`
- optional `reason`
- optional `chainId`
- optional `country`
- `configId`
- `configVersion`
- `chainsId`
- `chainsVersion`

The runtime currently accepts only `scope: "place"`.

## Matching behavior

Entries are keyed by:

```text
placeId + ruleId + field
```

An entry is considered active only when its stored config and chain snapshot matches the current runtime snapshot:

- `configId`
- `configVersion`
- `chainsId`
- `chainsVersion`

This prevents old whitelist entries from suppressing issues after the active data set changes.

## Runtime effect

Whitelist filtering happens after issues and proposals are generated.

- matching issues are removed from the visible analysis result
- proposals linked to suppressed issues are removed from the visible analysis result
- scan results use the same whitelist filtering when a runtime snapshot is available

## Validation and failure behavior

The runtime validates the whitelist store structure on load. If the stored data is missing, malformed, or incompatible with version `1`, the runtime resets to an empty whitelist store instead of throwing.

## Current non-features

The current whitelist implementation does not support:

- import or export
- multiple profiles
- synchronization between browsers or machines
- expiry handling
- broad rule-only or place-only suppression
