import type { Dirent } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const SKIP_DIR_NAMES = new Set([".git", ".hg", ".svn"]);

export async function* findFilesNamed(root: string, basename: string): AsyncGenerator<string> {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = path.join(root, entry.name);

    if (entry.isSymbolicLink()) continue;

    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) continue;
      yield* findFilesNamed(full, basename);
      continue;
    }

    if (entry.isFile() && entry.name === basename) {
      yield full;
    }
  }
}
