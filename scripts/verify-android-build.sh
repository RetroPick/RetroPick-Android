#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if [ "$(git rev-parse --is-inside-work-tree)" != "true" ]; then
  printf '%s\n' 'verify:android must run from a Git worktree' >&2
  exit 1
fi
if git ls-files --error-unmatch out >/dev/null 2>&1; then
  printf '%s\n' 'generated out/ assets are tracked; remove them from Git before release verification' >&2
  exit 1
fi

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

printf '%s\n' 'Generated outputs remain ignored for disposable-worktree disposal; no restore or clean action is performed.'
