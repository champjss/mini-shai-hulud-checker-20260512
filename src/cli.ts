#!/usr/bin/env node
import { type ParsedArgs, parseArgs, printUsage, UsageError } from "./args.js";
import { runCheckGlobal } from "./commands/check-global.js";
import { runCheckProject } from "./commands/check-project.js";

async function main(): Promise<number> {
  let parsed: ParsedArgs;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (err) {
    if (err instanceof UsageError) {
      process.stderr.write(`error: ${err.message}\n\n`);
      printUsage();
      return 2;
    }
    throw err;
  }

  try {
    if (parsed.subcommand === "check-global") {
      return await runCheckGlobal();
    }
    if (parsed.dir === undefined) {
      process.stderr.write(`error: ${parsed.subcommand} requires a <dir> argument\n`);
      return 2;
    }
    if (parsed.subcommand === "check-project") {
      return await runCheckProject("both", parsed.dir);
    }
    if (parsed.subcommand === "check-project:packages") {
      return await runCheckProject("packages", parsed.dir);
    }
    if (parsed.subcommand === "check-project:files") {
      return await runCheckProject("files", parsed.dir);
    }
    process.stderr.write(`error: unhandled subcommand ${parsed.subcommand}\n`);
    return 2;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`error: ${msg}\n`);
    return 2;
  }
}

main().then(
  (code) => process.exit(code),
  (err) => {
    process.stderr.write(`fatal: ${err?.stack ?? err}\n`);
    process.exit(2);
  },
);
