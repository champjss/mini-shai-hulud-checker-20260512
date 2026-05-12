import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";
import { repoRoot, runCli } from "./helpers.mjs";

const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));

// Claim 1 — Zero runtime dependencies
test("trust: package.json declares no runtime dependencies", () => {
  assert.equal(pkg.dependencies, undefined, "expected no `dependencies` block in package.json");
});

// Claim 2 — Plain, readable compiled output. No bundler, no minification, no inlined third-party code.
test("trust: dist/*.js imports only node: builtins or relative paths", () => {
  const distDir = path.join(repoRoot, "dist");
  const offenders = [];
  for (const file of walkJs(distDir)) {
    const text = fs.readFileSync(file, "utf8");
    const re = /^\s*import\s+[^"']*from\s+["']([^"']+)["']/gm;
    let m = re.exec(text);
    while (m !== null) {
      const source = m[1];
      const ok = source.startsWith("node:") || source.startsWith("./") || source.startsWith("../");
      if (!ok) {
        offenders.push(`${path.relative(repoRoot, file)} imports "${source}"`);
      }
      m = re.exec(text);
    }
  }
  assert.deepEqual(offenders, [], "dist/ should not import any non-builtin, non-relative module");
});

// Claim 3 — You don't need `npm install` to run it.
test("trust: `node dist/cli.js --help` exits 0 and prints usage", () => {
  const r = runCli(["--help"]);
  assert.equal(r.exitCode, 0);
  assert.match(r.combined, /Usage:/);
  assert.match(r.combined, /check-project/);
  assert.match(r.combined, /check-global/);
});

// Claim 4 — Dev-time dependencies are only typescript, @types/node, and @biomejs/biome.
test("trust: devDependencies are exactly the three documented packages", () => {
  assert.deepEqual(Object.keys(pkg.devDependencies ?? {}).sort(), [
    "@biomejs/biome",
    "@types/node",
    "typescript",
  ]);
});

// Claim 5a — The advisory data is committed in plain text (CSV from Socket.dev).
test("trust: affected-packages.csv has the expected Socket.dev header", () => {
  const csvPath = path.join(repoRoot, "resources", "advisory", "affected-packages.csv");
  const head = fs.readFileSync(csvPath, "utf8").slice(0, 200);
  assert.match(head, /^Ecosystem,Namespace,Name,Version,Published,Detected/);
});

// Claim 5b — and a small JSON for malicious file hashes.
test("trust: file-hashes.json parses and lists the known router_init.js SHA-256", () => {
  const jsonPath = path.join(repoRoot, "resources", "advisory", "file-hashes.json");
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  assert.equal(
    data.maliciousFileHashes["router_init.js"].sha256,
    "ab4fcadaec49c03278063dd269ea5eef82d24f2124a8e15d7b90f2fa8601266c",
  );
});

function* walkJs(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkJs(full);
    else if (entry.isFile() && entry.name.endsWith(".js")) yield full;
  }
}
