# WME Place Harmonizer ROW Edition Release Checklist

This checklist is the release gate for promoting a tested beta to `main` and releasing the stable userscript through Greasy Fork.

## Scope

Use this checklist when:

- `beta` contains the version you want to release
- beta testing has finished
- you are preparing a `beta -> main` pull request

Do not use this checklist for:

- normal feature work into `dev`
- beta promotion from `dev -> beta`
- emergency hotfixes that have not been tested on `beta`

## Release inputs

Before opening the release PR, confirm all of the following:

- [ ] `package.json` already contains the intended stable version
- [ ] `beta` CI is green
- [ ] the beta userscript has been published to the `beta-dist` artifact branch
- [ ] beta testers have accepted the current beta build
- [ ] there are no known release-blocking issues left open

## Release PR checklist

Open a pull request from `beta` to `main` and confirm:

- [ ] the PR title is release-focused, for example `Release 0.1.1`
- [ ] the PR description summarizes the release scope and notable changes
- [ ] the PR description mentions any matching data-repo changes if the release depends on them
- [ ] the PR description notes any exceptional post-merge follow-up if the release needs it
- [ ] required PR verification checks are configured and passing before merge

## Pre-merge verification

Run these checks from the code repository before merging:

```bash
npm run check
npm run build:dev
npm run build:prod
```

Confirm the stable artifact is correct:

- [ ] `dist/wme-place-harmonizer-row-edition.user.js` was generated successfully
- [ ] the userscript name is the stable name, without `Beta` or `Dev`
- [ ] the userscript version matches `package.json`
- [ ] the stable userscript header does not contain beta GitHub `@downloadURL` or `@updateURL` values
- [ ] the build is using the stable runtime channel

## Merge to main

When the PR is approved:

- [ ] merge `beta` into `main`
- [ ] confirm the `main` branch CI workflow passes
- [ ] confirm the production userscript artifact is available from the workflow run
- [ ] confirm CI published `dist/wme-place-harmonizer-row-edition.user.js` to `stable-dist`

## Greasy Fork verification

After `main` is green:

- [ ] confirm Greasy Fork picked up the new stable build from `stable-dist`
- [ ] confirm the Greasy Fork version matches `package.json`
- [ ] confirm the Greasy Fork script page shows the expected release text and metadata

## Post-release verification

After publishing to Greasy Fork:

- [ ] install or update the stable script from Greasy Fork in Tampermonkey
- [ ] open WME and confirm the script initializes without runtime errors
- [ ] confirm the stable script no longer shows beta naming or beta update URLs
- [ ] confirm the script is using the stable release path and expected stable data behavior
- [ ] announce the release or record release notes in the PR, release log, or discussion thread

## Release notes minimum standard

Every stable release should capture at least:

- released version
- merge PR number
- summary of major fixes or additions
- any user-visible caveats
- any matching data-repo dependency or rollout notes

## Hotfix rule

If you must fix something after merging to `main`:

- [ ] apply the fix in the appropriate source branch, not only on `main`
- [ ] back-merge or forward-merge so `dev`, `beta`, and `main` do not drift
- [ ] rerun this checklist before the corrected stable publish
