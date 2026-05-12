import * as fs from "node:fs";
import * as path from "node:path";

export type ParsedArgs = {
  subcommand: string;
  dir: string | undefined;
};

const USAGE = `mini-shai-hulud — checker for the 2026-05 TanStack Mini Shai-Hulud supply-chain attack

Usage:
  mini-shai-hulud check-project <dir>           Run both project checks (packages + files)
  mini-shai-hulud check-project:packages <dir>  Lockfile check only
  mini-shai-hulud check-project:files <dir>     router_init.js hash check only
  mini-shai-hulud check-global                  Auto-detect global package-manager locations
                                                (npm/pnpm/yarn globals and the pnpm store) and
                                                scan each for compromised packages and the
                                                malicious router_init.js

Environment:
  MSH_GLOBAL_ROOTS  Colon-separated list of paths. When set, check-global scans these instead of
                    auto-detecting via package manager CLIs (useful for hermetic testing).

Exit codes:
  0  clean
  1  compromised package(s) or file(s) found
  2  usage / IO error
`;

const SUBCOMMANDS_REQUIRING_DIR = new Set([
  "check-project",
  "check-project:packages",
  "check-project:files",
]);
const SUBCOMMANDS_NO_DIR = new Set(["check-global"]);

export function printUsage(stream: NodeJS.WriteStream = process.stderr): void {
  stream.write(USAGE);
}

export function parseArgs(argv: string[]): ParsedArgs {
  if (argv.length === 0 || argv[0] === "-h" || argv[0] === "--help") {
    printUsage(process.stdout);
    process.exit(0);
  }

  const subcommand = argv[0];
  if (!SUBCOMMANDS_REQUIRING_DIR.has(subcommand) && !SUBCOMMANDS_NO_DIR.has(subcommand)) {
    throw new UsageError(`unknown subcommand: ${subcommand}`);
  }

  if (SUBCOMMANDS_NO_DIR.has(subcommand)) {
    if (argv.length > 1) {
      throw new UsageError(`${subcommand} takes no positional arguments`);
    }
    return { subcommand, dir: undefined };
  }

  const dir = argv[1];
  if (!dir) {
    throw new UsageError(`${subcommand} requires a <dir> argument`);
  }

  const resolved = path.resolve(dir);
  let stat: fs.Stats;
  try {
    stat = fs.statSync(resolved);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new UsageError(`cannot access <dir> ${resolved}: ${msg}`);
  }
  if (!stat.isDirectory()) {
    throw new UsageError(`<dir> is not a directory: ${resolved}`);
  }

  return { subcommand, dir: resolved };
}

export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}
