# Android build gates

RetroPick Android is a Capacitor wrapper over the web app and uses the same Go BFF boundary. It does not use a separate Android backend.

## Required local gate

Run the reproducible gate only from a clean source worktree. The script creates and removes its own fresh detached disposable worktree, so generated ignored output cannot touch your source worktree:

```bash
pnpm run verify:android
```

The command performs, in order:

1. `pnpm install --frozen-lockfile`
2. `pnpm exec tsc --noEmit`
3. `pnpm lint`
4. `pnpm run test:bff-boundary`
5. `pnpm build` to regenerate the static web export in ignored `out/`
6. `pnpm exec cap sync android` to copy the current export and regenerate ignored Capacitor files
7. `:app:lintDebug`, `:app:testDebugUnitTest`, and `:app:assembleDebug` through `bash android/gradlew --no-daemon`

`android/gradlew` is intentionally invoked through `bash` because the tracked wrapper is not executable in this repository.

## Generated outputs

`out/` is Next's generated static export and was removed from Git because it contained stale shipping assets. Capacitor-owned copied web assets, generated plugin/config files (including `android/capacitor.settings.gradle`), and Gradle build directories are also ignored. The gate regenerates these outputs reproducibly; do not commit them. Dispose of the dedicated worktree after verification rather than using any repository-wide restore or clean command, so unrelated work is never deleted.

Do not copy a root-level `android/` directory into this repository. Release BFF URLs remain explicit build inputs (`RETROPICK_BFF_HTTP_URL` and `RETROPICK_BFF_WS_URL`); the tracked default is empty and `DEMO_SIMULATION` is false for both debug and release.
