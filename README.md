# mini-shai-hulud-checker

A small, zero-dependency CLI to detect packages and files compromised by the **2026-05-11 "Mini Shai-Hulud"** npm supply-chain attack.

The worm hit hundreds of npm packages across many namespaces — `@tanstack`, `@squawk`, `@uipath`, `@tallyui`, `@mistralai`, and others — and a few pypi/composer packages besides. Within the TanStack pipeline specifically, the payload was dropped to a file named `router_init.js` (or `router_runtime.js`) whose SHA-256 is `ab4fcadaec49c03278063dd269ea5eef82d24f2124a8e15d7b90f2fa8601266c`. This tool scans your project's lockfile against the full Socket.dev affected-versions feed (npm-only by default) and hashes any `router_init.js` it finds against the known TanStack-payload hash.

References:
- [Socket.dev advisory](https://socket.dev/blog/tanstack-npm-packages-compromised-mini-shai-hulud-supply-chain-attack)
- [StepSecurity advisory](https://www.stepsecurity.io/blog/mini-shai-hulud-is-back-a-self-spreading-supply-chain-attack-hits-the-npm-ecosystem)

---

## Installation and usages

### Prerequisites

- **Node.js 20+** — required to run the CLI
- **Git** — to clone this repo
- Any of `npm` / `pnpm` / `yarn` (optional) — only needed if you want `check-global` to autodetect their respective global locations

No external dependency (`npm install`) is needed.

### Installation

```bash
git clone https://github.com/champjss/mini-shai-hulud-checker-20260512.git
cd mini-shai-hulud-checker-20260512
```

Every command below is run from inside that directory.

### Step 1 — Scan each of your projects

For every JS/TS project you have on disk (one with a `package.json`), run:

```bash
node dist/cli.js check-project /path/to/my-project
```

The output has two sections:

- `--- Packages (lockfile) ---` parses the project's `package-lock.json` / `pnpm-lock.yaml` / `yarn.lock` and reports any installed package whose name + resolved version matches a row in the Socket.dev CSV (across `@tanstack`, `@squawk`, `@uipath`, etc. — not just TanStack).
- `--- Files (router_init.js hashes) ---` walks the directory for any file named `router_init.js` and compares its SHA-256 to the known malicious hash.

**Clean output:**

```
--- Packages (lockfile) ---
Lockfile: npm (/path/.../package-lock.json)
Packages scanned: 1

Result: OK — no compromised package versions detected.

--- Files (router_init.js hashes) ---
Scanned 0 router_init.js file(s); 0 match the malicious hash.

Result: OK (project clean)
```

Exit code `0`.

**Compromised output:**

```
--- Packages (lockfile) ---
Packages scanned: 2

Result: COMPROMISED — 2 package version(s) match the advisory:
  - @tanstack/react-router@1.169.5
  - @tanstack/router-core@1.169.5

Advisory: https://www.stepsecurity.io/blog/...
Remediate by upgrading or pinning to a known-good version and rotating any CI credentials exposed during install.

--- Files (router_init.js hashes) ---
Scanned 0 router_init.js file(s); 0 match the malicious hash.

Result: COMPROMISED
```

Exit code `1`.

### Step 2 — Scan global installs and the pnpm store

```bash
node dist/cli.js check-global
```

Auto-detects `npm root -g`, `pnpm root -g`, `pnpm store path`, and `yarn global dir`. Package managers that aren't installed on your machine are skipped silently. For each discovered location it runs **both** the package-metadata scan **and** the `router_init.js` hash scan (necessary because the pnpm content-addressed store doesn't expose package paths — only the hash check works there).

```
Discovered 3 global location(s):
  - npm-global:  /usr/local/lib/node_modules
  - pnpm-global: /Users/you/Library/pnpm/global/5/node_modules
  - pnpm-store:  /Users/you/Library/pnpm/store/v10

=== npm-global (...) ===
  OK — no compromised packages or files found.
...
Summary: 0 compromised package(s), 0 compromised file(s) across 3 location(s).
Result: OK
```

### Step 3 — If anything is flagged

**Compromised package version found:**
1. **Uninstall or upgrade.** The advisory pages list the safe ranges per package. For most packages, the listed compromised versions are two adjacent point releases — pin to the patch above them.
2. **Wipe and reinstall:** `rm -rf node_modules <your-lockfile> && <pm> install` to make sure no cached malicious tarball is reused.
3. **Rotate CI/CD credentials.** This is the important one. The payload's job is to exfiltrate secrets that were in the environment when `install` ran. Rotate npm tokens, GitHub tokens, AWS keys, and anything else CI exposed via env vars during builds since the date of installation.

**Malicious `router_init.js` file found:**
1. **Delete the file** — its bytes are byte-for-byte the published payload.
2. **Clear the relevant cache.** If the hit was in the pnpm CAS: `pnpm store prune`. For npm: `npm cache clean --force`.
3. **Re-run the scan** to confirm the location is now clean.

After remediation, re-run `check-project` (and `check-global` if applicable) and confirm exit code `0`.

---

## Why you can trust this

Running an unfamiliar tool against your machine in the middle of a supply-chain incident is itself a risk. This project is built to be auditable in under five minutes. Each claim below has a one-line verification you can run yourself before you trust the output.

**1. Zero runtime dependencies.** There is no `dependencies` block in `package.json`. Nothing is fetched from npm to run the CLI.

```bash
node -e "console.log(require('./package.json').dependencies ?? '(absent)')"
# → (absent)
```

**2. Plain, readable compiled output. No bundler, no minification, no inlined third-party code.**

```bash
grep -E '^import ' dist/cli.js
# → only relative imports (./args.js, ./commands/...)
```

Every file in `dist/` imports either a `node:` built-in or a relative file in `dist/`. There is no library code hiding inside the artifact. Read any file — they're each well under 100 lines:

```bash
cat dist/cli.js
cat dist/lockfiles/npm.js
```

**3. You don't need `npm install` to run it.** The compiled `dist/` ships in the repo. Clone it and run:

```bash
node dist/cli.js --help
```

**4. Dev-time dependencies are only `typescript`, `@types/node`, and `@biomejs/biome`.** None reach `dist/` (the build is just `tsc` emitting `.js`; Biome runs only for `npm run format` / `npm run lint`). Skip this step entirely if you just want to run the checker.

```bash
node -e "console.log(Object.keys(require('./package.json').devDependencies))"
# → [ '@biomejs/biome', '@types/node', 'typescript' ]
```

**5. The advisory data is committed in plain text — a CSV (from Socket.dev) and a small JSON for malicious file hashes.** Update history is tracked in git.

```bash
head resources/advisory/affected-packages.csv
cat  resources/advisory/file-hashes.json
```

---

## Commands

| Command | What it does | Exit codes |
|---|---|---|
| `check-project <dir>` | Run both the packages and files checks against `<dir>`. Lenient: if no lockfile is found, skips packages with a note and still runs the file scan. | `0` clean / `1` compromised |
| `check-project:packages <dir>` | Lockfile check only. Strict: errors if no lockfile is found. | `0` / `1` / `2` (no lockfile) |
| `check-project:files <dir>` | Recursive `router_init.js` hash check only. | `0` / `1` |
| `check-global` | Auto-detects npm/pnpm/yarn globals + pnpm CAS store and scans each. | `0` / `1` / `2` (no PM found) |

Exit code summary: `0` clean, `1` compromised, `2` usage or IO error.

---

## Repo layout

```
mini-shai-hulud-checker/
├── README.md                      this file
├── dist/                          committed compiled output (run from here)
│   ├── cli.js
│   ├── advisory/                  advisory data, mirrored from resources/
│   │   ├── affected-packages.csv
│   │   └── file-hashes.json
│   ├── commands/                  check-project, check-files, check-global, ...
│   └── lockfiles/                 npm / pnpm / yarn lockfile parsers
├── src/                           TypeScript source (mirror of dist/)
├── resources/
│   ├── advisory/                  source of truth for the advisory data
│   │   ├── affected-packages.csv  Socket.dev CSV: all compromised npm rows
│   │   └── file-hashes.json       known malicious file SHA-256 / SHA-1 / MD5
│   └── test-fixtures/             hand-written lockfile + file fixtures
├── test/                          node:test suite (18 cases, run via `npm test`)
├── scripts/                       maintainer-only update + postbuild scripts
├── package.json                   no `dependencies`; only `typescript`, `@types/node`, `@biomejs/biome` as devDeps
├── tsconfig.json
└── .vscode/                       Test Explorer config (optional)
```

---

## Maintainer notes

- `npm run build` — type-check + emit `dist/`, then copy `resources/advisory/affected-packages.csv` and `file-hashes.json` to `dist/advisory/`.
- `npm test` — run the Node `--test` suite under `test/`. Concurrency is pinned to 1 because two tests mutate `dist/advisory/file-hashes.json` via stub-and-restore.
- `npm run update:affected` — re-downloads the affected-packages CSV from the Socket.dev article and overwrites `resources/advisory/affected-packages.csv`. Logs row-count diff vs the previous file. Falls back to printing manual-download instructions if the CSV link can't be auto-discovered. Maintainer-only; not part of `dist/`.
- `npm run format` — run Biome to auto-fix formatting + organize imports across `src/`, `scripts/`, `test/`. Skips `dist/`, `node_modules/`, and `resources/test-fixtures/`.
- `npm run lint` — run Biome in check-only mode (no writes). Suitable for CI.
- `dist/` is **committed** — after editing `src/`, rebuild and commit both together so end users can `git clone` and run without `npm install`.
