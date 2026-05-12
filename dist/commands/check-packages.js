import { loadAffected } from "../load-affected.js";
import { detectAndParse } from "../lockfiles/index.js";
export function runCheckPackages(dir) {
    const affected = loadAffected();
    const { lockfile, lockfilePath, packages } = detectAndParse(dir);
    process.stdout.write(`Directory: ${dir}\n`);
    process.stdout.write(`Lockfile: ${lockfile} (${lockfilePath})\n`);
    process.stdout.write(`Packages scanned: ${packages.length}\n`);
    const hits = packages.filter((p) => {
        const versions = affected.packages[p.name];
        return Array.isArray(versions) && versions.includes(p.version);
    });
    if (hits.length === 0) {
        process.stdout.write("\nResult: OK — no compromised package versions detected.\n");
        return 0;
    }
    process.stderr.write(`\nResult: COMPROMISED — ${hits.length} package version(s) match the advisory:\n`);
    for (const h of hits) {
        process.stderr.write(`  - ${h.name}@${h.version}\n`);
    }
    process.stderr.write(`\nAdvisory: ${affected.source}\n` +
        `Remediate by upgrading or pinning to a known-good version and rotating any CI credentials exposed during install.\n`);
    return 1;
}
