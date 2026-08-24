# Android build gates

RetroPick Android is a Capacitor wrapper over the web app and uses the same Go BFF boundary. It does not use a separate Android backend.

## Required local gate

Run the reproducible gate from a clean checkout:

```bash
pnpm run verify:android
```

The command performs, in order:

1. `pnpm install --frozen-lockfile`
2. `pnpm exec tsc --noEmit`
3. `pnpm lint`
4. `pnpm run test:bff-boundary`
5. `pnpm build` to regenerate the static web export in `out/`
6. `pnpm exec cap sync android` to copy the current export and regenerate Capacitor plugin/config files
7. `:app:lintDebug`, `:app:testDebugUnitTest`, and `:app:assembleDebug` through `bash android/gradlew --no-daemon`

`android/gradlew` is intentionally invoked through `bash` because the tracked wrapper is not executable in this repository.

## Generated outputs

Capacitor owns `android/capacitor-cordova-android-plugins`, copied web assets under `android/app/src/main/assets/public`, and generated Capacitor config/plugin files. They are ignored and must not be committed. The gate may create them; retain an APK only when needed outside Git, then clean the checkout before committing:

```bash
git restore --worktree --staged .
git clean -fdX android
```

Do not copy a root-level `android/` directory into this repository. Release BFF URLs remain explicit build inputs (`RETROPICK_BFF_HTTP_URL` and `RETROPICK_BFF_WS_URL`); the tracked default is empty and `DEMO_SIMULATION` is false for both debug and release.
