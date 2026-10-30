# Container security

The previous image used the full `node:20` build image as its runtime. It included
OS development packages and all npm development dependencies. Node 20 is no longer
a supported security-update line. An application source review alone does not
validate the vulnerability status of that image.

## Runtime changes

- Node 22.23.4 includes the October 2026 security fixes, including CVE-2026-111497.
- Debian 13 (`trixie-slim`) replaces Debian 12. A comparison scan of an upgraded
  Debian-12 slim image still found unpatched critical glibc findings; Debian's
  tracker provides fixed versions in Debian 13.
- Build and runtime use the same base and OpenSSL ABI. Only the Next.js standalone
  output, static/public assets, Prisma client/CLI/engines and migrations are copied
  into the runtime. No OS compiler or image/database development packages are installed. Next.js may
  still trace optional runtime dependencies such as TypeScript; these are retained
  rather than manually deleting files from the traced dependency closure.
- The existing startup migration still runs before the server. It invokes the local,
  locked Prisma CLI directly, without `npx` or downloads at startup. npm/corepack
  are removed from the runtime.
- `.env` files, host node_modules and host build output are excluded from the build
  context. Server configuration comes from runtime environment variables.
- Sentry 10.78.0 and fast-uri 3.1.9 resolve additional npm advisories without a
  major-version migration. Mythos does not configure Sentry's vulnerable tunnel
  feature; the package is updated regardless.
- Upload paths and the existing runtime user are unchanged so existing root-owned
  named upload volumes remain writable. No production volume permission changes
  are performed as part of this patch.

The release build refreshes its base and package layers and publishes an additional
`sha-<commit>` tag for traceability. Changing source files or pulling an old
`latest` image cannot patch its existing layers. A corrected image must first be
built and published, then selected by digest and rescanned by the operator.

## Verification

Local image build and runtime tests use only new, disposable containers. A Grype
scan consumes an exported OCI archive rather than a Docker/Podman socket. The full
report includes unpatched findings; no CVE suppression or `only-fixed` filter is
used. Scanner databases change, so counts are tied to the tested image and date.

The PR container job builds without publishing, verifies Node/Prisma and the absence
of `.env`, npm, Jest and ESLint in the runtime, and retains the complete scanner JSON
as an artifact. Critical vulnerabilities and high findings with an available fix fail the job.
Unfixed high findings remain visible and require assessment; a passing job does
not mean that no vulnerabilities were found.

### Migration test fixture

The existing repository's migrations do not contain an initial schema: applying
all migrations to a completely empty database fails when the first migration
expects the `User` table. This is pre-existing and is not changed by the security
patch. The startup smoke test uses a disposable database initialized with the
current schema and matching applied-migration records, representing an existing
installation. No production database is contacted, baselined or reset.

## Sources

- https://nodejs.org/en/blog/release/v22.23.4
- https://security-tracker.debian.org/tracker/CVE-2026-5450
- https://security-tracker.debian.org/tracker/CVE-2023-45853
- https://github.com/getsentry/sentry-javascript/security/advisories/GHSA-mchm-gjx6-7h55
- https://github.com/fastify/fast-uri/security/advisories/GHSA-w74x-v6f9-j3xg

## Scan snapshot: 2026-10-29

Grype 0.121.0, database built `2026-10-29T06:23:34Z`,
local image ID `sha256:4ce5a80e858aede4ca843bde39216d5c9a534e9231e449770a7142954a4187c5`.

| Severity | Package/advisory matches |
| --- | ---: |
| Critical | 0 |
| High | 54 |
| Medium | 47 |
| Low | 10 |
| Negligible | 46 |

There are **no critical matches and no npm-package matches** in this image scan.
The 54 high matches represent 14 distinct CVEs. None has a fixed package version
available in the scanned distribution feed. `wont-fix` is a distribution status,
not proof of non-exploitability. These residual findings are **not suppressed**
and remain open for reachability/risk assessment; this is not a vulnerability-free image.

| High CVE | Packages | Feed fix status |
| --- | --- | --- |
| [CVE-2025-69720](https://security-tracker.debian.org/tracker/CVE-2025-69720) | libtinfo6, ncurses-base, ncurses-bin | wont-fix |
| [CVE-2026-102010](https://security-tracker.debian.org/tracker/CVE-2026-102010) | gcc-14-base, libgcc-s1, libstdc++6 | wont-fix |
| [CVE-2026-19499](https://security-tracker.debian.org/tracker/CVE-2026-19499) | libc-bin, libc6 | wont-fix |
| [CVE-2026-5435](https://security-tracker.debian.org/tracker/CVE-2026-5435) | libc-bin, libc6 | wont-fix |
| [CVE-2026-54369](https://security-tracker.debian.org/tracker/CVE-2026-54369) | libacl1 | wont-fix |
| [CVE-2026-54370](https://security-tracker.debian.org/tracker/CVE-2026-54370) | libacl1 | wont-fix |
| [CVE-2026-76642](https://security-tracker.debian.org/tracker/CVE-2026-76642) | bsdutils, libblkid1, liblastlog2-2, libmount1, libsmartcols1, libuuid1, login, mount, util-linux | wont-fix |
| [CVE-2026-78408](https://security-tracker.debian.org/tracker/CVE-2026-78408) | bsdutils, libblkid1, liblastlog2-2, libmount1, libsmartcols1, libuuid1, login, mount, util-linux | wont-fix |
| [CVE-2026-78409](https://security-tracker.debian.org/tracker/CVE-2026-78409) | bsdutils, libblkid1, liblastlog2-2, libmount1, libsmartcols1, libuuid1, login, mount, util-linux | wont-fix |
| [CVE-2026-78410](https://security-tracker.debian.org/tracker/CVE-2026-78410) | bsdutils, libblkid1, liblastlog2-2, libmount1, libsmartcols1, libuuid1, login, mount, util-linux | wont-fix |
| [CVE-2026-82560](https://security-tracker.debian.org/tracker/CVE-2026-82560) | perl-base | wont-fix |
| [CVE-2026-85091](https://security-tracker.debian.org/tracker/CVE-2026-85091) | zlib1g | not-fixed |
| [CVE-2026-9538](https://security-tracker.debian.org/tracker/CVE-2026-9538) | perl-base | wont-fix |
| [CVE-2026-95619](https://security-tracker.debian.org/tracker/CVE-2026-95619) | gcc-14-base, libgcc-s1, libstdc++6 | wont-fix |

The npm production audit separately reports 0 critical, 0 high and 28 moderate
findings for the dependency graph; this also includes build-time parts of
production-listed SDK packages that are absent from the standalone runtime.
The final image builds successfully. Node, the migration CLI, startup against
the isolated existing-installation fixture and HTTP `/api/health` were verified.

## Follow-up security audit

See [the 2026-10-30 audit](container-security-audit.md) for registry provenance, all 14 CVE assessments, runtime hardening, regression evidence and Odin/Dockhand operator commands.
