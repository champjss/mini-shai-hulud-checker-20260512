#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const csvPath = path.join(repoRoot, "resources", "advisory", "affected-packages.csv");

const ARTICLE_URL =
  "https://socket.dev/blog/tanstack-npm-packages-compromised-mini-shai-hulud-supply-chain-attack";

async function main() {
  console.log(`Fetching ${ARTICLE_URL}`);
  const articleRes = await fetch(ARTICLE_URL, {
    headers: { "User-Agent": "mini-shai-hulud-checker/0.1 (update script)" },
  });
  if (!articleRes.ok) {
    throw new Error(`HTTP ${articleRes.status} fetching article`);
  }
  const html = await articleRes.text();

  const csvUrl = findCsvUrl(html);
  if (!csvUrl) {
    console.error(
      "Could not auto-discover a CSV download link on the Socket.dev article.\n" +
        "Manual fallback:\n" +
        `  1. Open ${ARTICLE_URL} in a browser.\n` +
        "  2. Use the article's export/download control to save the affected-packages CSV.\n" +
        `  3. Save it to ${path.relative(repoRoot, csvPath)} (overwriting the existing file).\n`,
    );
    process.exit(2);
  }

  console.log(`Downloading CSV from ${csvUrl}`);
  const csvRes = await fetch(csvUrl, {
    headers: { "User-Agent": "mini-shai-hulud-checker/0.1 (update script)" },
  });
  if (!csvRes.ok) {
    throw new Error(`HTTP ${csvRes.status} fetching CSV`);
  }
  const csvText = await csvRes.text();
  if (!csvText.startsWith("Ecosystem,")) {
    throw new Error(
      `Downloaded content does not look like the expected CSV (first 80 chars: ${JSON.stringify(csvText.slice(0, 80))})`,
    );
  }

  const previous = fs.existsSync(csvPath) ? fs.readFileSync(csvPath, "utf8") : "";
  fs.writeFileSync(csvPath, csvText);

  const prevRows = previous ? previous.split(/\r?\n/).filter((l) => l.trim()).length - 1 : 0;
  const nextRows = csvText.split(/\r?\n/).filter((l) => l.trim()).length - 1;
  console.log(`\nWrote ${path.relative(repoRoot, csvPath)}`);
  console.log(`  Previous rows: ${prevRows}`);
  console.log(`  New rows:      ${nextRows}`);
  console.log(`  Delta:         ${nextRows - prevRows >= 0 ? "+" : ""}${nextRows - prevRows}`);
}

function findCsvUrl(html) {
  const candidateRes = [
    /href=["']([^"']+\.csv[^"']*)["']/i,
    /href=["']([^"']+\/export[^"']*)["'][^>]*>[^<]*csv/i,
  ];
  for (const re of candidateRes) {
    const m = re.exec(html);
    if (m) {
      let url = m[1];
      if (url.startsWith("//")) url = `https:${url}`;
      else if (url.startsWith("/")) url = `https://socket.dev${url}`;
      return url;
    }
  }
  return null;
}

main().catch((err) => {
  console.error(`error: ${err.message}`);
  process.exit(1);
});
