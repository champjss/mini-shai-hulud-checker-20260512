import { discoverGlobalPaths } from "../discover-global.js";
import { sha256OfFile } from "../hash.js";
import { loadAffected } from "../load-affected.js";
import { scanForInstalledPackages } from "../scan-installed.js";
import { findFilesNamed } from "../walk.js";
const ROUTER_INIT = "router_init.js";
export async function runCheckGlobal() {
    const affected = loadAffected();
    const malicious = affected.maliciousFileHashes[ROUTER_INIT]?.sha256;
    if (!malicious) {
        throw new Error(`advisory/file-hashes.json is missing maliciousFileHashes["${ROUTER_INIT}"].sha256`);
    }
    const locations = discoverGlobalPaths();
    if (locations.length === 0) {
        process.stderr.write("no global locations found.\n" +
            "checked: `npm root -g`, `pnpm root -g`, `pnpm store path`, `yarn global dir`\n" +
            "none returned a usable path. install a package manager or set MSH_GLOBAL_ROOTS to scan an explicit path.\n");
        return 2;
    }
    process.stdout.write(`Discovered ${locations.length} global location(s):\n`);
    for (const loc of locations) {
        process.stdout.write(`  - ${loc.source}: ${loc.path}\n`);
    }
    process.stdout.write("\n");
    let totalPackageHits = 0;
    let totalFileHits = 0;
    for (const loc of locations) {
        process.stdout.write(`=== ${loc.source} (${loc.path}) ===\n`);
        const packageHits = await scanPackages(loc.path, affected.packages);
        const fileHits = await scanFiles(loc.path, malicious);
        if (packageHits.length === 0 && fileHits.length === 0) {
            process.stdout.write("  OK — no compromised packages or files found.\n\n");
            continue;
        }
        if (packageHits.length > 0) {
            process.stderr.write(`  COMPROMISED packages (${packageHits.length}):\n`);
            for (const h of packageHits) {
                process.stderr.write(`    - ${h.name}@${h.version}\n      at ${h.manifestPath}\n`);
            }
            totalPackageHits += packageHits.length;
        }
        if (fileHits.length > 0) {
            process.stderr.write(`  COMPROMISED files (${fileHits.length}):\n`);
            for (const f of fileHits) {
                process.stderr.write(`    - ${f.path}\n      sha256=${f.sha256}\n`);
            }
            totalFileHits += fileHits.length;
        }
        process.stderr.write("\n");
    }
    process.stdout.write(`Summary: ${totalPackageHits} compromised package(s), ${totalFileHits} compromised file(s) across ${locations.length} location(s).\n`);
    if (totalPackageHits === 0 && totalFileHits === 0) {
        process.stdout.write("Result: OK\n");
        return 0;
    }
    process.stderr.write(`Advisory: ${affected.source}\n` +
        "Remediate by uninstalling/upgrading the affected packages globally and clearing any caches/stores containing the malicious payload. Rotate CI credentials used during install.\n");
    return 1;
}
async function scanPackages(root, affectedMap) {
    const scanned = await scanForInstalledPackages(root);
    const hits = [];
    for (const pkg of scanned) {
        const versions = affectedMap[pkg.name];
        if (Array.isArray(versions) && versions.includes(pkg.version)) {
            hits.push(pkg);
        }
    }
    return hits;
}
async function scanFiles(root, malicious) {
    const hits = [];
    for await (const filePath of findFilesNamed(root, ROUTER_INIT)) {
        const got = await sha256OfFile(filePath);
        if (got === malicious) {
            hits.push({ path: filePath, sha256: got });
        }
    }
    return hits;
}
