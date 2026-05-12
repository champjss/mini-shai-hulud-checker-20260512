import * as fs from "node:fs/promises";
import { findFilesNamed } from "./walk.js";

export type ScannedPackage = {
  name: string;
  version: string;
  manifestPath: string;
};

export async function scanForInstalledPackages(root: string): Promise<ScannedPackage[]> {
  const out: ScannedPackage[] = [];
  const seen = new Set<string>();

  for await (const manifestPath of findFilesNamed(root, "package.json")) {
    let json: unknown;
    try {
      const raw = await fs.readFile(manifestPath, "utf8");
      json = JSON.parse(raw);
    } catch {
      continue;
    }

    const obj = json as { name?: unknown; version?: unknown };
    if (typeof obj?.name !== "string" || typeof obj?.version !== "string") {
      continue;
    }

    const dedupeKey = `${obj.name}@${obj.version}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    out.push({ name: obj.name, version: obj.version, manifestPath });
  }

  return out;
}
