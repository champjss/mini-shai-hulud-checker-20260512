import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

export type GlobalLocation = {
  source: string;
  path: string;
};

type Probe = { source: string; cmd: string; args: string[] };

const PROBES: Probe[] = [
  { source: "npm-global", cmd: "npm", args: ["root", "-g"] },
  { source: "pnpm-global", cmd: "pnpm", args: ["root", "-g"] },
  { source: "pnpm-store", cmd: "pnpm", args: ["store", "path"] },
  { source: "yarn-global", cmd: "yarn", args: ["global", "dir"] },
];

export function discoverGlobalPaths(): GlobalLocation[] {
  const envOverride = process.env.MSH_GLOBAL_ROOTS;
  if (envOverride !== undefined) {
    return fromEnv(envOverride);
  }

  const found: GlobalLocation[] = [];
  for (const probe of PROBES) {
    const loc = runProbe(probe);
    if (loc) found.push(loc);
  }
  return dedupeByPath(found);
}

function fromEnv(raw: string): GlobalLocation[] {
  const out: GlobalLocation[] = [];
  for (const part of raw.split(":")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (!isExistingDir(trimmed)) continue;
    out.push({ source: `env:${trimmed}`, path: path.resolve(trimmed) });
  }
  return dedupeByPath(out);
}

function runProbe(probe: Probe): GlobalLocation | null {
  let result: SpawnSyncReturns<string>;
  try {
    result = spawnSync(probe.cmd, probe.args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
  if (result.error) return null;
  if (result.status !== 0) return null;
  const out = (result.stdout ?? "").trim();
  if (!out) return null;
  if (!isExistingDir(out)) return null;
  return { source: probe.source, path: path.resolve(out) };
}

function isExistingDir(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function dedupeByPath(locs: GlobalLocation[]): GlobalLocation[] {
  const seen = new Set<string>();
  const out: GlobalLocation[] = [];
  for (const loc of locs) {
    if (seen.has(loc.path)) continue;
    seen.add(loc.path);
    out.push(loc);
  }
  return out;
}
