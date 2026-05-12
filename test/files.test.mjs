import assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";
import { FIXTURE_BASE, runCli, stubHashOfFixtureFile } from "./helpers.mjs";

test("check-project:files reports OK for a clean router_init.js", () => {
  const r = runCli(["check-project:files", path.join(FIXTURE_BASE, "files/clean")]);
  assert.equal(r.exitCode, 0);
  assert.match(r.combined, /0 match the malicious hash/);
});

test("check-project:files flags a router_init.js whose hash matches the advisory", () => {
  const restore = stubHashOfFixtureFile("files/compromised/router_init.js");
  try {
    const r = runCli(["check-project:files", path.join(FIXTURE_BASE, "files/compromised")]);
    assert.equal(r.exitCode, 1);
    assert.match(r.combined, /1 match the malicious hash/);
  } finally {
    restore();
  }
});
