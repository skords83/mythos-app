# Bundled fonts

Google Fonts files compressed to WOFF2 with fontTools, preserving all glyphs and variable font axes. `sources.json` records the pinned upstream commit, source URLs, input/output SHA-256 checksums and conversion version.

SIL Open Font Licenses are included under `frontend/public/licenses/fonts/`, so they also ship with the standalone container and are served at `/licenses/fonts/`.

`next/font/local` bundles these fonts without fetching Google CSS or font files during a build. Keep the licenses and provenance when updating a font. The existing display/body/mono CSS variables and configured weights remain available. The Docker compilation step runs with networking disabled to prevent regressions.
