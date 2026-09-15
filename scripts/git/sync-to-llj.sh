#!/usr/bin/env bash

set -euo pipefail

# Sync specific source commits into target repo without overwriting
# repo-specific changes. Uses git am --3way so divergences are merged
# via patch application rather than file replacement.

SOURCE_REPO="/Users/itsmevizz/Work/actifyr-client-platform"
TARGET_REPO="/Users/itsmevizz/Work/llj-client-platform"
TARGET_BRANCH="feat/vizz-dev"
SCRIPT_TAG="[sync-to-llj]"
TMP_DIR=""

cleanup() {
  if [[ -n "${TMP_DIR}" && -d "${TMP_DIR}" ]]; then
    rm -rf "${TMP_DIR}"
  fi
}
trap cleanup EXIT

usage() {
  cat <<EOF
Usage:
  $(basename "$0") [<sha> ...]
  $(basename "$0") --range <from_sha>..<to_sha>
  $(basename "$0") --help

Examples:
  $(basename "$0") 2c6a31a 2e054da
  $(basename "$0") --range 2c6a31a..2e054da

Behavior:
  - Applies commits from ${SOURCE_REPO} into ${TARGET_REPO}:${TARGET_BRANCH}
  - Uses git am --3way to avoid hard overwrites of target-specific changes
  - Never pushes; creates local commits only
EOF
}

if ! command -v git >/dev/null 2>&1; then
  echo "${SCRIPT_TAG} git is required but not found."
  exit 1
fi

CURRENT_REPO="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ "${CURRENT_REPO}" != "${SOURCE_REPO}" ]]; then
  # Protect against accidental execution from copied hook in other repos.
  exit 0
fi

if [[ ! -d "${TARGET_REPO}/.git" ]]; then
  echo "${SCRIPT_TAG} target repo not found: ${TARGET_REPO}"
  exit 1
fi

COMMITS=()
RANGE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h)
      usage
      exit 0
      ;;
    --range)
      if [[ $# -lt 2 ]]; then
        echo "${SCRIPT_TAG} --range requires a value like A..B"
        exit 1
      fi
      RANGE="$2"
      shift 2
      ;;
    *)
      COMMITS+=("$1")
      shift
      ;;
  esac
done

if [[ -n "${RANGE}" && ${#COMMITS[@]} -gt 0 ]]; then
  echo "${SCRIPT_TAG} use either explicit SHAs or --range, not both."
  exit 1
fi

# Keep target history safe by integrating remote updates first.
git -C "${TARGET_REPO}" fetch origin "${TARGET_BRANCH}" >/dev/null
git -C "${TARGET_REPO}" checkout "${TARGET_BRANCH}" >/dev/null
git -C "${TARGET_REPO}" pull --rebase origin "${TARGET_BRANCH}" >/dev/null

# Do not overwrite uncommitted user work in target repo.
if [[ -n "$(git -C "${TARGET_REPO}" status --porcelain)" ]]; then
  echo "${SCRIPT_TAG} target repo has uncommitted changes, skipping sync."
  exit 0
fi

if [[ -n "${RANGE}" ]]; then
  mapfile -t COMMITS < <(git -C "${SOURCE_REPO}" rev-list --reverse "${RANGE}")
elif [[ ${#COMMITS[@]} -eq 0 ]]; then
  COMMITS=("HEAD")
fi

if [[ ${#COMMITS[@]} -eq 0 ]]; then
  echo "${SCRIPT_TAG} no commits resolved from input."
  exit 0
fi

for commit_ref in "${COMMITS[@]}"; do
  if ! git -C "${SOURCE_REPO}" cat-file -e "${commit_ref}^{commit}" 2>/dev/null; then
    echo "${SCRIPT_TAG} commit not found in source repo: ${commit_ref}"
    exit 1
  fi
done

TMP_DIR="$(mktemp -d /tmp/sync-to-llj.XXXXXX)"
applied_count=0

for commit_ref in "${COMMITS[@]}"; do
  full_sha="$(git -C "${SOURCE_REPO}" rev-parse "${commit_ref}^{commit}")"
  short_sha="$(git -C "${SOURCE_REPO}" rev-parse --short "${full_sha}")"
  subject="$(git -C "${SOURCE_REPO}" log -1 --pretty=%s "${full_sha}")"
  patch_file="${TMP_DIR}/${short_sha}.patch"

  existing_sync_commit="$(git -C "${TARGET_REPO}" log --grep="${full_sha}" --fixed-strings --all -n 1 --pretty=format:%H)"
  if [[ -n "${existing_sync_commit}" ]]; then
    echo "${SCRIPT_TAG} skipping ${short_sha}; appears already synced."
    continue
  fi

  git -C "${SOURCE_REPO}" format-patch -k -1 "${full_sha}" --stdout > "${patch_file}"
  if git -C "${TARGET_REPO}" am --3way "${patch_file}"; then
    applied_count=$((applied_count + 1))
    echo "${SCRIPT_TAG} applied ${short_sha}: ${subject}"
  else
    echo "${SCRIPT_TAG} conflict while applying ${short_sha}. Running git am --abort."
    git -C "${TARGET_REPO}" am --abort || true
    echo "${SCRIPT_TAG} stopped with no partial sync commit for this patch."
    exit 1
  fi
done

if [[ "${applied_count}" -eq 0 ]]; then
  echo "${SCRIPT_TAG} nothing new to sync."
  exit 0
fi

echo "${SCRIPT_TAG} synced ${applied_count} commit(s) locally to ${TARGET_BRANCH}."
