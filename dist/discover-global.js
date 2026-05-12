import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
const PROBES = [
    { source: "npm-global", cmd: "npm", args: ["root", "-g"] },
    { source: "pnpm-global", cmd: "pnpm", args: ["root", "-g"] },
    { source: "pnpm-store", cmd: "pnpm", args: ["store", "path"] },
    { source: "yarn-global", cmd: "yarn", args: ["global", "dir"] },
];
export function discoverGlobalPaths() {
    const envOverride = process.env.MSH_GLOBAL_ROOTS;
    if (envOverride !== undefined) {
        return fromEnv(envOverride);
    }
    const found = [];
    for (const probe of PROBES) {
        const loc = runProbe(probe);
        if (loc)
            found.push(loc);
    }
    return dedupeByPath(found);
}
function fromEnv(raw) {
    const out = [];
    for (const part of raw.split(":")) {
        const trimmed = part.trim();
        if (!trimmed)
            continue;
        if (!isExistingDir(trimmed))
            continue;
        out.push({ source: `env:${trimmed}`, path: path.resolve(trimmed) });
    }
    return dedupeByPath(out);
}
function runProbe(probe) {
    let result;
    try {
        result = spawnSync(probe.cmd, probe.args, {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
        });
    }
    catch {
        return null;
    }
    if (result.error)
        return null;
    if (result.status !== 0)
        return null;
    const out = (result.stdout ?? "").trim();
    if (!out)
        return null;
    if (!isExistingDir(out))
        return null;
    return { source: probe.source, path: path.resolve(out) };
}
function isExistingDir(p) {
    try {
        return fs.statSync(p).isDirectory();
    }
    catch {
        return false;
    }
}
function dedupeByPath(locs) {
    const seen = new Set();
    const out = [];
    for (const loc of locs) {
        if (seen.has(loc.path))
            continue;
        seen.add(loc.path);
        out.push(loc);
    }
    return out;
}
