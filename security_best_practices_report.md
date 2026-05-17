# Security Best Practices Report

Reviewed project: `/home/ak2000/CascadeProjects/interval-timer`
Date: 2026-05-13

## Executive Summary

No critical or high severity application-code vulnerabilities were found in the current app. The project is a static Next.js/React interval timer with no API routes, no Server Actions, no authentication/session layer, and no obvious raw HTML or dynamic-code execution sinks.

Fix status update:

- SBP-001 is fixed with an npm `postcss` override to `8.5.14`; `npm audit` now reports zero vulnerabilities.
- SBP-002 is fixed with baseline response headers and `poweredByHeader: false`.
- SBP-003 is accepted risk per project owner decision on 2026-05-13.

Remaining security hardening items:

- The Docker base image is a floating tag rather than a digest-pinned image.
- The service worker caches broad same-origin GET responses, which is safe for the current static app but risky if authenticated or private routes are added later.

## Scope and Method

Guidance used:

- `security-best-practices` skill references for JavaScript/TypeScript frontend, React, and Next.js.
- Local Next.js 16 docs under `node_modules/next/dist/docs/`, including `headers`, `poweredByHeader`, `productionBrowserSourceMaps`, and `production-checklist`.

Checks run:

- `npm audit --json`
- `npm ls postcss next --all`
- `npm outdated --long`
- targeted searches for secrets, unsafe DOM sinks, dynamic code execution, Server Actions, Route Handlers, cookies, headers, redirects, CORS, and service worker/cache usage
- `npm run build`
- `npm run lint`
- local runtime header checks against `next start` and `.next/standalone/server.js`

Relevant verification results:

- `npm run build` passed. Routes are static: `/` and `/_not-found`.
- `npm run lint` failed on React compiler/hooks rules. These are not security findings, but they should be fixed separately.
- No `.env*`, PEM/private-key, token, password, or API-key files were found outside ignored dependencies.
- No `dangerouslySetInnerHTML`, `innerHTML`, `document.write`, `eval`, `new Function`, `postMessage`, unsafe redirect, API route, Server Action, cookie, or CORS code was found in the app source.
- `.gitignore` excludes `.env*` and `*.pem` at lines 24-34.
- `.dockerignore` excludes `.env` and `.env.*` at lines 36-39.
- Docker runtime uses an unprivileged user at `Dockerfile` lines 49-61.

## Medium Severity

### SBP-001: Vulnerable transitive PostCSS bundled by Next.js

Rule ID: `NEXT-SUPPLY-001`, dependency advisory hygiene

Severity: Medium

Status: Fixed on 2026-05-13. `package.json` now overrides `postcss` to `8.5.14`, `package-lock.json` no longer installs `node_modules/next/node_modules/postcss@8.4.31`, and `npm audit --json` reports zero vulnerabilities.

Location:

- `package.json` lines 11-14
- `package-lock.json` lines 5084-5094
- `package-lock.json` lines 5137-5139

Evidence:

```json
"next": "16.2.6"
```

`npm ls postcss next --all` reports:

```text
next@16.2.6
└── postcss@8.4.31
```

`npm audit --json` reports `GHSA-qx2v-qp2m-jg93`: `PostCSS has XSS via Unescaped </style> in its CSS Stringify Output`, affecting `postcss <8.5.10`.

Impact:

An attacker-controlled CSS string that reaches vulnerable PostCSS stringification can produce XSS in generated CSS/HTML contexts. In this repo, PostCSS appears to be build tooling rather than a runtime parser for user CSS, so exploitability is limited by current app behavior.

Fix:

Upgrade Next.js as soon as a release bundles `postcss >= 8.5.10`. As of the local npm metadata check on 2026-05-13, `npm view next version` returned `16.2.6`, and `npm view next@16.2.6 dependencies.postcss` returned `8.4.31`, so there was no newer Next release available from npm at review time.

Mitigation:

Add `npm audit --audit-level=moderate` to CI so this does not regress unnoticed. If an immediate clean audit is required, test an npm `overrides` entry for Next's nested `postcss` after confirming `next build` and production runtime behavior still work.

False positive notes:

The advisory is real in the dependency tree. It is not evidence of an exploitable user path in this app because the app does not accept user-supplied CSS.

### SBP-002: Missing baseline security headers and exposed framework fingerprint

Rule ID: `NEXT-CONFIG-HEADERS-001`, `REACT-CONFIG-001` defense-in-depth

Severity: Medium

Status: Fixed on 2026-05-13. `next.config.ts` now disables `X-Powered-By` and applies CSP, referrer, permissions, content-type, and frame-denial headers globally.

Location:

- `next.config.ts` lines 3-7
- runtime response for `/` checked locally on 2026-05-13

Evidence:

`next.config.ts` only configures standalone output:

```ts
const nextConfig: NextConfig = {
  output: "standalone",
};
```

Runtime response for `/` included:

```text
X-Powered-By: Next.js
Content-Type: text/html; charset=utf-8
```

The response did not include visible `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy` headers.

Impact:

Missing headers reduce browser-side defense in depth. The app has no current raw-HTML sink, so this is not a direct XSS finding. However, absent CSP/frame-ancestor policy makes future XSS or clickjacking mistakes more damaging, and `X-Powered-By` reveals implementation details useful for fingerprinting.

Fix:

Add `poweredByHeader: false` and a global `headers()` baseline in `next.config.ts`. At minimum, set:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin` or `origin-when-cross-origin`
- `Permissions-Policy` denying unused sensitive APIs such as camera, microphone, geolocation, and browsing-topics
- clickjacking defense using CSP `frame-ancestors 'none'` or `X-Frame-Options: DENY`

Add CSP carefully using the Next.js 16 CSP guide. Avoid adding a policy that breaks Next's inline runtime scripts; use nonces/hashes or a report-only rollout first.

Mitigation:

If headers are supplied by a CDN/reverse proxy in production, verify them with a real production `curl -I` check and document that in deployment docs.

False positive notes:

The absence was confirmed only against the local Next server and standalone server. Production edge/CDN config could add headers not visible in the repository.

### SBP-003: Dirty working-tree images can still be pushed as `latest`

Rule ID: supply-chain release integrity

Severity: Medium

Status: Accepted risk per project owner decision on 2026-05-13.

Location:

- `scripts/docker-publish.sh` lines 34-39
- `scripts/docker-publish.sh` lines 72-80

Evidence:

The script detects dirty trees and adds `-dirty` to the primary tag:

```bash
if ! git -C "${PROJECT_ROOT}" diff --quiet --ignore-submodules HEAD 2>/dev/null; then
  TAG="${GIT_SHA}-dirty"
fi
```

But it still tags and pushes `${LATEST_TAG}` unconditionally:

```bash
docker build \
  --tag "${IMAGE}:${TAG}" \
  --tag "${IMAGE}:${LATEST_TAG}" \
  .

docker push "${IMAGE}:${TAG}"
docker push "${IMAGE}:${LATEST_TAG}"
```

Impact:

Uncommitted local code can become the public `latest` image. That weakens release auditability, makes rollback and provenance harder, and can publish unreviewed changes under the tag most users are likely to run.

Fix:

Fail closed when the working tree is dirty unless an explicit override is set, or skip the `latest` tag for dirty builds. For example: require `ALLOW_DIRTY=1` for dirty pushes and never publish dirty builds to `${LATEST_TAG}`.

Mitigation:

Prefer publishing from CI on signed, protected branches or tags. Emit image labels with `org.opencontainers.image.revision` and source URL.

False positive notes:

This is not a runtime exploit by itself. It is a release-process integrity issue.

## Low Severity

### SBP-004: Docker base image uses a floating tag

Rule ID: container supply-chain reproducibility

Severity: Low

Location:

- `Dockerfile` line 13
- `Dockerfile` lines 16, 28, and 41

Evidence:

```dockerfile
ARG NODE_VERSION=22-alpine
FROM node:${NODE_VERSION} AS deps
FROM node:${NODE_VERSION} AS builder
FROM node:${NODE_VERSION} AS runner
```

Impact:

`node:22-alpine` can resolve to different image contents over time. That improves automatic patch uptake but weakens reproducibility and makes it harder to prove what exact base image was used for a release.

Fix:

Pin to a full patch/minor Alpine tag plus digest, for example `node:22.x-alpine3.x@sha256:<digest>`, and update intentionally through dependency automation.

Mitigation:

Generate and store an SBOM for release images. Scan built images in CI with a container vulnerability scanner.

False positive notes:

Using a floating tag is common in small projects. The risk increases when images are published for others to run.

### SBP-005: Service worker caches broad same-origin GET responses

Rule ID: `REACT-PWA-001`, service worker cache scope hygiene

Severity: Low

Location:

- `public/sw.js` lines 21-25
- `public/sw.js` lines 27-37
- `public/sw.js` lines 41-49

Evidence:

```js
if (req.method !== "GET") return;
const url = new URL(req.url);
if (url.origin !== self.location.origin) return;
```

The worker then caches navigations and all same-origin successful basic responses.

Impact:

The current app is static and has no private API routes, so this is not currently exposing sensitive data. If authenticated pages, personalized responses, or API GETs are added later, the service worker could persist private responses beyond their intended lifetime.

Fix:

Restrict service worker caching to explicit static paths such as `/_next/static/`, `/manifest.webmanifest`, and `/icons/`. Bypass `/api/`, auth routes, and any response with `Cache-Control: no-store` or `private`.

Mitigation:

Document the service worker cache policy and require review before adding authenticated routes or API endpoints under the same origin and scope.

False positive notes:

No current authenticated or sensitive route was found.

## Positive Observations

- No critical or high application-code vulnerabilities were found.
- No API routes, Route Handlers, middleware/proxy files, or Server Actions were present.
- No committed secret files were found outside dependencies.
- User-provided preset names and phase labels are rendered through JSX text nodes, not HTML injection sinks.
- Local storage currently holds non-sensitive timer preferences and custom interval data.
- The Docker runtime stage runs as the unprivileged `nextjs` user.
- Production browser source maps were not emitted under `.next/static`.

## Recommended Fix Order

1. Add CI checks for `npm audit --audit-level=moderate`, `npm run build`, and lint once the current lint errors are addressed.
2. Pin the Docker base image by digest and add image scanning/SBOM generation.
3. Tighten `public/sw.js` cache allowlisting before adding any private routes.
