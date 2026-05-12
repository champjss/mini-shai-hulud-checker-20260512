import * as fs from "node:fs";
import * as path from "node:path";
import { parseNpmLock } from "./npm.js";
import { parsePnpmLock } from "./pnpm.js";
import { parseYarnLock } from "./yarn.js";
export function detectAndParse(dir) {
    const npmPath = path.join(dir, "package-lock.json");
    if (fs.existsSync(npmPath)) {
        return {
            lockfile: "npm",
            lockfilePath: npmPath,
            packages: parseNpmLock(npmPath),
        };
    }
    const pnpmPath = path.join(dir, "pnpm-lock.yaml");
    if (fs.existsSync(pnpmPath)) {
        return {
            lockfile: "pnpm",
            lockfilePath: pnpmPath,
            packages: parsePnpmLock(pnpmPath),
        };
    }
    const yarnPath = path.join(dir, "yarn.lock");
    if (fs.existsSync(yarnPath)) {
        return {
            lockfile: "yarn",
            lockfilePath: yarnPath,
            packages: parseYarnLock(yarnPath),
        };
    }
    throw new Error(`No supported lockfile found in ${dir}. Expected one of: package-lock.json, pnpm-lock.yaml, yarn.lock`);
}
