import assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";
import { FIXTURE_BASE, runCli } from "./helpers.mjs";

test("check-project:packages flags compromised versions in npm lockfile", () => {
  const r = runCli(["check-project:packages", path.join(FIXTURE_BASE, "packages/npm-compromised")]);
  assert.equal(r.exitCode, 1);
  assert.match(r.combined, /@tanstack\/react-router@1\.169\.5/);
  assert.match(r.combined, /@tanstack\/router-core@1\.169\.5/);
});

test("check-project:packages reports clean npm lockfile as OK", () => {
  const r = runCli(["check-project:packages", path.join(FIXTURE_BASE, "packages/npm-clean")]);
  assert.equal(r.exitCode, 0);
  assert.match(r.combined, /no compromised/);
});

test("check-project:packages flags compromised versions in pnpm lockfile", () => {
  const r = runCli([
    "check-project:packages",
    path.join(FIXTURE_BASE, "packages/pnpm-compromised"),
  ]);
  assert.equal(r.exitCode, 1);
  assert.match(r.combined, /@tanstack\/react-router@1\.169\.5/);
  assert.match(r.combined, /@tanstack\/router-core@1\.169\.8/);
});

test("check-project:packages flags compromised versions in yarn v1 lockfile", () => {
  const r = runCli([
    "check-project:packages",
    path.join(FIXTURE_BASE, "packages/yarn-v1-compromised"),
  ]);
  assert.equal(r.exitCode, 1);
  assert.match(r.combined, /@tanstack\/react-router@1\.169\.5/);
  assert.match(r.combined, /@tanstack\/router-core@1\.169\.8/);
});

test("check-project:packages flags compromised versions in yarn v2 lockfile", () => {
  const r = runCli([
    "check-project:packages",
    path.join(FIXTURE_BASE, "packages/yarn-v2-compromised"),
  ]);
  assert.equal(r.exitCode, 1);
  assert.match(r.combined, /@tanstack\/react-router@1\.169\.5/);
  assert.match(r.combined, /@tanstack\/router-core@1\.169\.8/);
});
