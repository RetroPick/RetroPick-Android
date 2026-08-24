#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if [ "$(git rev-parse --is-inside-work-tree)" != "true" ]; then
  printf '%s\n' 'verify:android must run from a Git worktree' >&2
  exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  printf '%s\n' 'verify:android requires a clean source worktree; use a disposable worktree for verification' >&2
  exit 1
fi
if [ -n "$(git ls-files out android/app/src/main/assets/public android/app/build android/build android/capacitor.settings.gradle)" ]; then
  printf '%s\n' 'generated release assets are tracked; remove them from Git before release verification' >&2
  exit 1
fi

verify_dir="$(mktemp -d "${TMPDIR:-/tmp}/retropick-android-verify.XXXXXX")"
rmdir "$verify_dir"
git worktree add --detach "$verify_dir" HEAD >/dev/null
cleanup() {
  git -C "$repo_root" worktree remove --force "$verify_dir" >/dev/null 2>&1 || true
}
trap cleanup EXIT

cd "$verify_dir"
sdk_root="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-/opt/android-sdk}}"
if [ ! -d "$sdk_root" ]; then
  printf '%s\n' 'verify:android requires ANDROID_HOME/ANDROID_SDK_ROOT or /opt/android-sdk' >&2
  exit 1
fi
export ANDROID_HOME="$sdk_root"
export ANDROID_SDK_ROOT="$sdk_root"
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm lint
pnpm run test:bff-boundary
pnpm build
pnpm exec cap sync android
(
  cd android
  bash gradlew --no-daemon :app:lintDebug
  bash gradlew --no-daemon :app:testDebugUnitTest
  bash gradlew --no-daemon :app:assembleDebug
)
if [ -n "$(git status --porcelain)" ]; then
  printf '%s\n' 'verify:android generated tracked dirt in its disposable worktree' >&2
  git status --short >&2
  exit 1
fi
printf '%s\n' 'verify:android passed in a fresh disposable worktree; generated ignored outputs will be disposed with it.'
