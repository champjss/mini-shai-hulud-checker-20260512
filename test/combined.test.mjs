import assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";
import { FIXTURE_BASE, runCli } from "./helpers.mjs";

test("check-project combined mode flags a compromised project", () => {
  const r = runCli(["check-project", path.join(FIXTURE_BASE, "packages/npm-compromised")]);
  assert.equal(r.exitCode, 1);
  assert.match(r.combined, /--- Packages \(lockfile\) ---/);
  assert.match(r.combined, /--- Files \(router_init\.js hashes\) ---/);
  assert.match(r.combined, /@tanstack\/react-router@1\.169\.5/);
  assert.match(r.combined, /Result: COMPROMISED/);
});

test("check-project combined mode reports a clean project as OK", () => {
  const r = runCli(["check-project", path.join(FIXTURE_BASE, "packages/npm-clean")]);
  assert.equal(r.exitCode, 0);
  assert.match(r.combined, /--- Packages \(lockfile\) ---/);
  assert.match(r.combined, /--- Files \(router_init\.js hashes\) ---/);
  assert.match(r.combined, /Result: OK \(project clean\)/);
});
