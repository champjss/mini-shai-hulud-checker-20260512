import { spawnSync } from "node:child_process";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = path.resolve(here, "..");
export const cli = path.join(repoRoot, "dist", "cli.js");
export const distAdvisory = path.join(repoRoot, "dist", "advisory", "file-hashes.json");
export const FIXTURE_BASE = path.join(repoRoot, "resources", "test-fixtures");

export function runCli(args, options = {}) {
  const env = { ...process.env, ...(options.env ?? {}) };
  const result = spawnSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    env,
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  return {
    exitCode: result.status,
    stdout,
    stderr,
    combined: stdout + stderr,
  };
}

export function stubHashOfFixtureFile(relPath) {
  const target = path.join(FIXTURE_BASE, relPath);
  const hash = crypto.createHash("sha256").update(fs.readFileSync(target)).digest("hex");

  const original = fs.readFileSync(distAdvisory, "utf8");
  const parsed = JSON.parse(original);
  parsed.maliciousFileHashes["router_init.js"].sha256 = hash;
  fs.writeFileSync(distAdvisory, JSON.stringify(parsed, null, 2));

  return () => {
    fs.writeFileSync(distAdvisory, original);
  };
}
