import * as fs from "node:fs";
import type { InstalledPackage } from "./index.js";

export function parsePnpmLock(filePath: string): InstalledPackage[] {
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/);

  const out: InstalledPackage[] = [];
  const seen = new Set<string>();

  let inPackagesBlock = false;

  for (const line of lines) {
    if (line.trim() === "") continue;

    const indent = countLeadingSpaces(line);

    if (indent === 0) {
      inPackagesBlock = /^packages\s*:\s*$/.test(line);
      continue;
    }

    if (!inPackagesBlock) continue;

    const m =
      /^\s+(['"]?)(\/?)((?:@[^/'"@\s]+\/)?[^'"@\s]+@[^'":\s()]+)(?:\([^)]*\))*\1?\s*:\s*$/.exec(
        line,
      );
    if (!m) continue;

    const spec = m[3];
    const parsed = splitNameAtLastAt(spec);
    if (!parsed) continue;

    const key = `${parsed.name}@${parsed.version}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: parsed.name, version: parsed.version, lockfile: "pnpm" });
  }

  return out;
}

function countLeadingSpaces(s: string): number {
  let n = 0;
  while (n < s.length && s[n] === " ") n++;
  return n;
}

function splitNameAtLastAt(spec: string): { name: string; version: string } | null {
  const at = spec.lastIndexOf("@");
  if (at <= 0) return null;
  const name = spec.slice(0, at);
  const version = spec.slice(at + 1);
  if (!name || !version) return null;
  return { name, version };
}
