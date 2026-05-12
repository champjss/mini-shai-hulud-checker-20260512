import { sha256OfFile } from "../hash.js";
import { loadAffected } from "../load-affected.js";
import { findFilesNamed } from "../walk.js";
const TARGET_BASENAME = "router_init.js";
export async function runCheckFiles(dir) {
    const affected = loadAffected();
    const malicious = affected.maliciousFileHashes[TARGET_BASENAME]?.sha256;
    if (!malicious) {
        throw new Error(`advisory/file-hashes.json is missing maliciousFileHashes["${TARGET_BASENAME}"].sha256`);
    }
    process.stdout.write(`Directory: ${dir}\n`);
    process.stdout.write(`Looking for: ${TARGET_BASENAME}\n`);
    process.stdout.write(`Known malicious sha256: ${malicious}\n\n`);
    let total = 0;
    let compromised = 0;
    for await (const filePath of findFilesNamed(dir, TARGET_BASENAME)) {
        total++;
        const got = await sha256OfFile(filePath);
        if (got === malicious) {
            compromised++;
            process.stderr.write(`COMPROMISED  ${filePath}\n             sha256=${got}\n`);
        }
        else {
            process.stdout.write(`OK           ${filePath}\n             sha256=${got}\n`);
        }
    }
    process.stdout.write(`\nScanned ${total} ${TARGET_BASENAME} file(s); ${compromised} match the malicious hash.\n`);
    return compromised === 0 ? 0 : 1;
}
