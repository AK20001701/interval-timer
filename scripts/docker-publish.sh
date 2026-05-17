#!/usr/bin/env bash
#
# Build the Pulse — Interval Timer Docker image and push it to Docker Hub.
#
# Usage:
#   scripts/docker-publish.sh [TAG]
#
# Examples:
#   scripts/docker-publish.sh                       # tag = <git-sha>, plus :latest
#   scripts/docker-publish.sh v1.2.0                # tag = v1.2.0, plus :latest
#   PLATFORMS=linux/amd64,linux/arm64 \
#     scripts/docker-publish.sh v1.2.0              # multi-arch via buildx
#   IMAGE=ak20001701/interval-timer \
#     scripts/docker-publish.sh                     # override image name
#
# Pre-requisites:
#   - docker installed and the daemon running
#   - `docker login` already executed against Docker Hub
#   - for multi-arch builds: `docker buildx` available and a builder created

set -euo pipefail

# ─── Configurable defaults ──────────────────────────────────────────────────
IMAGE="${IMAGE:-ak20001701/interval-timer}"
LATEST_TAG="${LATEST_TAG:-latest}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ─── Resolve tag ────────────────────────────────────────────────────────────
if [[ $# -ge 1 ]]; then
  TAG="$1"
else
  if GIT_SHA="$(git -C "${PROJECT_ROOT}" rev-parse --short HEAD 2>/dev/null)"; then
    # If the working tree is dirty, mark the tag accordingly so we never
    # overwrite a clean-commit image with an uncommitted build.
    if ! git -C "${PROJECT_ROOT}" diff --quiet --ignore-submodules HEAD 2>/dev/null; then
      TAG="${GIT_SHA}-dirty"
    else
      TAG="${GIT_SHA}"
    fi
  else
    TAG="dev"
  fi
fi

# ─── Pretty logger ──────────────────────────────────────────────────────────
log() { printf '\033[1;36m▸\033[0m %s\n' "$*"; }
ok()  { printf '\033[1;32m✓\033[0m %s\n' "$*"; }

cd "${PROJECT_ROOT}"

log "Image       : ${IMAGE}"
log "Primary tag : ${TAG}"
log "Latest tag  : ${LATEST_TAG}"

# ─── Multi-arch path (buildx) ───────────────────────────────────────────────
if [[ -n "${PLATFORMS:-}" ]]; then
  log "Building & pushing multi-arch image for: ${PLATFORMS}"
  docker buildx build \
    --platform "${PLATFORMS}" \
    --tag "${IMAGE}:${TAG}" \
    --tag "${IMAGE}:${LATEST_TAG}" \
    --push \
    .
  ok "Pushed ${IMAGE}:${TAG} (${PLATFORMS})"
  ok "Pushed ${IMAGE}:${LATEST_TAG} (${PLATFORMS})"
  exit 0
fi

# ─── Single-arch path ───────────────────────────────────────────────────────
log "Building ${IMAGE}:${TAG}"
docker build \
  --tag "${IMAGE}:${TAG}" \
  --tag "${IMAGE}:${LATEST_TAG}" \
  .

log "Pushing to Docker Hub"
docker push "${IMAGE}:${TAG}"
docker push "${IMAGE}:${LATEST_TAG}"

ok "Pushed ${IMAGE}:${TAG}"
ok "Pushed ${IMAGE}:${LATEST_TAG}"
