#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

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
