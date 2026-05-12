import { runCheckFiles } from "./check-files.js";
import { runCheckPackages } from "./check-packages.js";
export async function runCheckProject(mode, dir) {
    let pkgCode = 0;
    let fileCode = 0;
    if (mode === "both" || mode === "packages") {
        process.stdout.write("--- Packages (lockfile) ---\n");
        try {
            pkgCode = runCheckPackages(dir);
        }
        catch (err) {
            if (mode === "both") {
                const msg = err instanceof Error ? err.message : String(err);
                process.stdout.write(`packages skipped: ${msg}\n`);
                pkgCode = 0;
            }
            else {
                throw err;
            }
        }
        process.stdout.write("\n");
    }
    if (mode === "both" || mode === "files") {
        process.stdout.write("--- Files (router_init.js hashes) ---\n");
        fileCode = await runCheckFiles(dir);
        process.stdout.write("\n");
    }
    const combined = Math.max(pkgCode, fileCode);
    if (mode === "both") {
        process.stdout.write(combined === 0 ? "Result: OK (project clean)\n" : "Result: COMPROMISED\n");
    }
    return combined;
}
