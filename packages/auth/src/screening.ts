/**
 * In-house sanctions screening against the official OFAC SDN list.
 *
 * This is a first-line matcher, not a replacement for a commercial screening
 * vendor: it does normalized token/substring + light fuzzy matching on the
 * Latin-script SDN names. It deliberately returns `flagged_review` (never
 * `blocked`) on any match, so a human confirms before a tenant is blocked.
 * Aliases and Dari/Pashto transliteration are known gaps — see the compliance
 * doc. If no list is configured it returns `unscreened`, never `clear`.
 */
import { readFile } from 'node:fs/promises';

export type ScreeningStatus = 'unscreened' | 'clear' | 'flagged_review';

export interface ScreeningResult {
  status: ScreeningStatus;
  matchedNames: string[];
  listSize: number;
  source: 'ofac-sdn' | 'none';
}

let cachedList: string[] | null = null;
let cachedPath: string | null = null;

export function normalizeForMatching(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ') // keep Latin alnum + Arabic/Persian block
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function extractNames(rows: string[][]): string[] {
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.toLowerCase().trim());
  let nameIdx = header.indexOf('sdn_name');
  if (nameIdx === -1) nameIdx = header.indexOf('name');
  if (nameIdx === -1) nameIdx = 1; // OFAC SDN CSV puts the name in column 1
  const names = new Set<string>();
  for (let i = 1; i < rows.length; i++) {
    const name = (rows[i][nameIdx] ?? '').trim();
    if (name) names.add(name);
  }
  return [...names];
}

async function loadOfacList(): Promise<string[]> {
  const path = process.env.OFAC_LIST_PATH;
  if (!path) return [];
  if (cachedList !== null && cachedPath === path) return cachedList;

  const text = await readFile(path, 'utf8');
  const names = extractNames(parseCsv(text));
  cachedList = names;
  cachedPath = path;
  return names;
}

/** Resets the in-memory list cache (used by tests). */
export function resetScreeningCache(): void {
  cachedList = null;
  cachedPath = null;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[n];
}

function matchName(input: string, sdnName: string): boolean {
  const a = normalizeForMatching(input);
  const b = normalizeForMatching(sdnName);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length < 4 || b.length < 4) return false;
  if (a.includes(b) || b.includes(a)) return true;

  const aTokens = a.split(' ').filter((t) => t.length >= 4);
  const bTokens = b.split(' ').filter((t) => t.length >= 4);
  for (const t of aTokens) {
    for (const u of bTokens) {
      if (t === u) return true;
    }
  }

  if (Math.min(a.length, b.length) >= 8 && levenshtein(a, b) <= 1) return true;
  return false;
}

/**
 * Screens a set of names against the configured OFAC SDN list. Any match is
 * `flagged_review` (never `blocked`); a human must confirm before blocking.
 */
export async function screenParty(names: string[]): Promise<ScreeningResult> {
  const list = await loadOfacList();
  if (list.length === 0) {
    return { status: 'unscreened', matchedNames: [], listSize: 0, source: 'none' };
  }

  const matchedNames: string[] = [];
  for (const name of names) {
    if (!name) continue;
    for (const sdnName of list) {
      if (matchName(name, sdnName)) {
        matchedNames.push(sdnName);
        break;
      }
    }
  }

  return {
    status: matchedNames.length > 0 ? 'flagged_review' : 'clear',
    matchedNames,
    listSize: list.length,
    source: 'ofac-sdn',
  };
}
