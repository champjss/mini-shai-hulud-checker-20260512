import * as fs from "node:fs";
import type { InstalledPackage } from "./index.js";

type NpmLockEntry = {
  version?: string;
  resolved?: string;
  link?: boolean;
};

type NpmLockfileV2 = {
  lockfileVersion?: number;
  packages?: Record<string, NpmLockEntry>;
  dependencies?: Record<string, NpmLegacyDep>;
};

type NpmLegacyDep = {
  version?: string;
  dependencies?: Record<string, NpmLegacyDep>;
};

export function parseNpmLock(filePath: string): InstalledPackage[] {
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw) as NpmLockfileV2;
  const results: InstalledPackage[] = [];
  const seen = new Set<string>();

  if (data.packages) {
    for (const [key, entry] of Object.entries(data.packages)) {
      if (entry.link) continue;
      if (!entry.version) continue;

      const name = extractPackageName(key);
      if (!name) continue;

      const dedupeKey = `${name}@${entry.version}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      results.push({ name, version: entry.version, lockfile: "npm" });
    }
  } else if (data.dependencies) {
    walkLegacy(data.dependencies, results, seen);
  }

  return results;
}

function extractPackageName(key: string): string | null {
  if (!key) return null;
  const marker = "node_modules/";
  const idx = key.lastIndexOf(marker);
  const sub = idx >= 0 ? key.slice(idx + marker.length) : key;
  if (!sub) return null;
  return sub;
}

function walkLegacy(
  deps: Record<string, NpmLegacyDep>,
  out: InstalledPackage[],
  seen: Set<string>,
): void {
  for (const [name, entry] of Object.entries(deps)) {
    if (entry.version) {
      const key = `${name}@${entry.version}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ name, version: entry.version, lockfile: "npm" });
      }
    }
    if (entry.dependencies) {
      walkLegacy(entry.dependencies, out, seen);
    }
  }
}
