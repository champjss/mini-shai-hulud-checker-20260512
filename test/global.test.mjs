import assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";
import { FIXTURE_BASE, runCli, stubHashOfFixtureFile } from "./helpers.mjs";

test("check-global exits 2 when no global locations are found", () => {
  const r = runCli(["check-global"], {
    env: { MSH_GLOBAL_ROOTS: "/this/path/does/not/exist/msh-test" },
  });
  assert.equal(r.exitCode, 2);
  assert.match(r.combined, /no global locations found/);
});

test("check-global flags compromised packages in a synthetic global root", () => {
  const r = runCli(["check-global"], {
    env: { MSH_GLOBAL_ROOTS: path.join(FIXTURE_BASE, "global/npm-like") },
  });
  assert.equal(r.exitCode, 1);
  assert.match(r.combined, /@tanstack\/react-router@1\.169\.5/);
  assert.match(r.combined, /npm-like/);
  assert.doesNotMatch(r.combined, /@tanstack\/router-core@1\.170\.0/);
});

test("check-global flags a malicious router_init.js in a synthetic store path", () => {
  const restore = stubHashOfFixtureFile("global/with-malicious-file/router_init.js");
  try {
    const r = runCli(["check-global"], {
      env: { MSH_GLOBAL_ROOTS: path.join(FIXTURE_BASE, "global/with-malicious-file") },
    });
    assert.equal(r.exitCode, 1);
    assert.match(r.combined, /router_init\.js/);
    assert.match(r.combined, /COMPROMISED files/);
  } finally {
    restore();
  }
});
