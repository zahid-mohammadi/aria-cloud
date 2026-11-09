#!/usr/bin/env node
/**
 * Downloads the official OFAC SDN list CSV for the in-house screener.
 *
 * The list changes daily, so run this on a schedule (cron) and point
 * OFAC_LIST_PATH at the output. The file is NOT committed to the repo.
 *
 *   node scripts/download-ofac-list.mjs [url] [outputPath]
 *
 * Default url: https://www.treasury.gov/ofac/downloads/sdn.csv
 * Default output: ./ofac-sdn.csv
 *
 * For the broader Consolidated list (SDN + other OFAC programs) use:
 *   node scripts/download-ofac-list.mjs https://www.treasury.gov/ofac/downloads/consolidated/consolidated.csv
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_URL = 'https://www.treasury.gov/ofac/downloads/sdn.csv';
const url = process.argv[2] || DEFAULT_URL;
const out = process.argv[3] || path.join(process.cwd(), 'ofac-sdn.csv');

const res = await fetch(url, { redirect: 'follow' });
if (!res.ok) {
  throw new Error(`Download failed: HTTP ${res.status} from ${url}`);
}
const text = await res.text();
await writeFile(out, text, 'utf8');
console.log(`Downloaded ${text.length} bytes → ${out}`);
console.log(`Set OFAC_LIST_PATH=${out} and restart services.`);
