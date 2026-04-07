# Streto Desktop Downloads

Public distribution repository for official Streto desktop installers and auto-update metadata.

## Purpose

This repository is intentionally public and contains only:

- Desktop installer binaries
- Release metadata used by auto-update clients
- Public download page assets

This repository does not contain application source code.

## Download Page

The public page is served with GitHub Pages and automatically reads releases from this repository.

Expected user experience:

- Clear latest release section
- Installers grouped by OS and architecture
- Full release history for manual rollback/download

## Release Asset Conventions

The page groups installer assets by filename patterns.

Examples:

- Windows x64: `.exe` without `arm64`
- Windows arm64: `.exe` with `arm64`
- macOS x64: `.dmg` or `-mac` assets without `arm64`
- macOS arm64: assets with `arm64`

If naming changes in CI, update page logic in app.js.

## Security Notes

- Never commit source code here.
- Never commit build secrets or signing keys.
- Release artifacts should be uploaded only from CI workflows in the private source repository.
- If a release is compromised, immediately delete the release and rotate relevant signing credentials.

## Maintainer Workflow

1. Build and sign installers in private source repository.
2. Publish release assets to this public repository.
3. Verify assets and checksums before announcing release.
4. Confirm page lists the new release correctly.

## GitHub Pages Setup

1. Open repository settings.
2. Under Pages, set source to Deploy from a branch.
3. Select main branch and root folder.
4. Save settings.

The root index.html will become your public downloads page.
