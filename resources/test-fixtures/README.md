# Test fixtures

Static test inputs for `mini-shai-hulud-checker`. Exercised by `test/*.test.mjs` via the Node.js built-in test runner (`npm test`).

> **Do NOT run `npm install` / `yarn` / `pnpm install` inside any subdirectory below.** The `package.json` files intentionally list known-compromised `@tanstack/*` versions. A `preinstall` hook will refuse to run before any registry traffic, but the safer rule is: don't try.

## `packages/`

Hand-written lockfiles + matching `package.json`. Each is consumed by `mini-shai-hulud check-project:packages <dir>` (or by `check-project <dir>` for the combined check).

| Fixture | Lockfile | Expected exit | Notes |
|---|---|---|---|
| `npm-compromised` | `package-lock.json` (v3) | 1 | Pins `@tanstack/react-router@1.169.5` + `@tanstack/router-core@1.169.5` |
| `npm-clean` | `package-lock.json` (v3) | 0 | Pins `@tanstack/react-router@1.169.9` (not on the advisory) |
| `pnpm-compromised` | `pnpm-lock.yaml` (v9) | 1 | Pins `@tanstack/react-router@1.169.5` + `@tanstack/router-core@1.169.8` |
| `yarn-v1-compromised` | `yarn.lock` (v1) | 1 | Same versions as pnpm fixture |
| `yarn-v2-compromised` | `yarn.lock` (Berry, has `__metadata:`) | 1 | Same versions as pnpm fixture |

## `files/`

| Fixture | Expected exit | Notes |
|---|---|---|
| `clean/router_init.js` | 0 | Harmless placeholder — exercises the OK path |
| `compromised/router_init.js` | 1 (when test runner is active) | Harmless placeholder. The runner computes its SHA-256, temporarily patches `dist/advisory/file-hashes.json` to make that hash "the malicious one", runs `check-project:files`, then restores. **No real malware bytes are committed.** Running `mini-shai-hulud check-project:files resources/test-fixtures/files/compromised` directly (outside the runner) reports OK — that's expected. |

## `global/`

Synthetic global-install layouts for the `check-global` subcommand. The test runner passes `MSH_GLOBAL_ROOTS=<path>` to make discovery hermetic (no dependency on what's actually installed on the test machine).

| Fixture | Notes |
|---|---|
| `npm-like/@tanstack/react-router/package.json` | Lists `@tanstack/react-router@1.169.5` (compromised). Detected by the package-metadata scanner. |
| `npm-like/@tanstack/router-core/package.json` | Lists `@tanstack/router-core@1.170.0` (clean / not on the advisory). Used to confirm no false positives. |
| `with-malicious-file/router_init.js` | Harmless placeholder. The runner uses the same stub-and-restore trick as `files/compromised/` to drive the file-hash branch of `check-global`. |
