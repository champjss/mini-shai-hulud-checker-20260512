#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

const srcDir = path.join(repoRoot, "resources", "advisory");
const destDir = path.join(repoRoot, "dist", "advisory");

fs.mkdirSync(destDir, { recursive: true });

const FILES = ["affected-packages.csv", "file-hashes.json"];

for (const basename of FILES) {
  const src = path.join(srcDir, basename);
  const dest = path.join(destDir, basename);
  fs.copyFileSync(src, dest);
  console.log(`Copied ${path.relative(repoRoot, src)} -> ${path.relative(repoRoot, dest)}`);
}
