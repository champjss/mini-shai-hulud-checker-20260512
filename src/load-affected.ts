import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

export type FileHashEntry = {
  sha256: string;
  sha1?: string;
  md5?: string;
};

export type AffectedData = {
  source: string;
  generatedAt: string;
  maliciousFileHashes: Record<string, FileHashEntry>;
  packages: Record<string, string[]>;
};

type FileHashesFile = {
  source?: string;
  incidentDate?: string;
  maliciousFileHashes: Record<string, FileHashEntry>;
};

export function loadAffected(): AffectedData {
  const here = path.dirname(fileURLToPath(import.meta.url));

  const csvPath = resolveFirst(here, "affected-packages.csv");
  const hashesPath = resolveFirst(here, "file-hashes.json");

  const hashesRaw = fs.readFileSync(hashesPath, "utf8");
  const hashesData = JSON.parse(hashesRaw) as FileHashesFile;

  const csvRaw = fs.readFileSync(csvPath, "utf8");
  const packages = parseAffectedPackagesCsv(csvRaw);

  return {
    source:
      hashesData.source ??
      "https://socket.dev/blog/tanstack-npm-packages-compromised-mini-shai-hulud-supply-chain-attack",
    generatedAt: hashesData.incidentDate ?? "",
    maliciousFileHashes: hashesData.maliciousFileHashes,
    packages,
  };
}

function resolveFirst(here: string, basename: string): string {
  const candidates = [
    path.join(here, "advisory", basename),
    path.join(here, "..", "resources", "advisory", basename),
    path.join(here, "..", "..", "resources", "advisory", basename),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    `Could not find advisory/${basename}. Looked in:\n  - ${candidates.join("\n  - ")}`,
  );
}

function parseAffectedPackagesCsv(text: string): Record<string, string[]> {
  const out: Record<string, Set<string>> = {};
  const lines = text.split(/\r?\n/);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(",");
    if (cols.length < 4) continue;

    const ecosystem = cols[0];
    if (ecosystem !== "npm") continue;

    const namespace = cols[1];
    const name = cols[2];
    const version = cols[3];
    if (!name || !version) continue;

    const fullName = namespace ? `${namespace}/${name}` : name;

    if (!out[fullName]) out[fullName] = new Set();
    out[fullName].add(version);
  }

  const result: Record<string, string[]> = {};
  for (const [name, versions] of Object.entries(out)) {
    result[name] = Array.from(versions).sort();
  }
  return result;
}
