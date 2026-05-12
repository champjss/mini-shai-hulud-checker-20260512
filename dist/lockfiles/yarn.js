import * as fs from "node:fs";
export function parseYarnLock(filePath) {
    const text = fs.readFileSync(filePath, "utf8");
    const isV2Plus = sniffV2Plus(text);
    return isV2Plus ? parseV2(text) : parseV1(text);
}
function sniffV2Plus(text) {
    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed)
            continue;
        if (trimmed.startsWith("#"))
            continue;
        return /^__metadata\s*:/.test(trimmed);
    }
    return false;
}
function parseV1(text) {
    const lines = text.split(/\r?\n/);
    const out = [];
    const seen = new Set();
    let pendingName = null;
    const headingRe = /^"?((?:@[^/"@,\s]+\/)?[^"@,\s]+)@/;
    const versionRe = /^\s+version\s+"([^"]+)"/;
    for (const line of lines) {
        if (line.length > 0 && line[0] !== " " && line[0] !== "\t" && line[0] !== "#") {
            const h = headingRe.exec(line);
            pendingName = h ? h[1] : null;
            continue;
        }
        if (pendingName) {
            const v = versionRe.exec(line);
            if (v) {
                const name = pendingName;
                const version = v[1];
                const key = `${name}@${version}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    out.push({ name, version, lockfile: "yarn" });
                }
                pendingName = null;
            }
        }
    }
    return out;
}
function parseV2(text) {
    const lines = text.split(/\r?\n/);
    const out = [];
    const seen = new Set();
    let pendingName = null;
    const headingRe = /^"?((?:@[^/"@,\s]+\/)?[^"@,\s]+)@(?:npm:|workspace:|patch:)/;
    const versionRe = /^\s+version\s*:\s*"?([^"\s]+)"?/;
    for (const line of lines) {
        if (line.length > 0 && line[0] !== " " && line[0] !== "\t" && line[0] !== "#") {
            const h = headingRe.exec(line);
            pendingName = h ? h[1] : null;
            continue;
        }
        if (pendingName) {
            const v = versionRe.exec(line);
            if (v) {
                const name = pendingName;
                const version = v[1];
                const key = `${name}@${version}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    out.push({ name, version, lockfile: "yarn" });
                }
                pendingName = null;
            }
        }
    }
    return out;
}
