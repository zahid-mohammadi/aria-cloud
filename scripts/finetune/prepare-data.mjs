#!/usr/bin/env node
/**
 * Prepares fine-tuning data in the model's chat format.
 *
 * Converts a simple trilingual JSON source into `messages`-style JSONL that
 * Axolotl/TRL consume directly, and can seed site-schema examples from the
 * site-builder blueprints already in this repo.
 *
 * Usage:
 *   node scripts/finetune/prepare-data.mjs --input data/examples.json --output data/train.jsonl
 *   node scripts/finetune/prepare-data.mjs --seed --output data/seed-sites.jsonl
 *
 * Input schema (array of examples):
 *   { "type": "chat", "instruction": {fa,ps,en}, "response": {fa,ps,en} }
 *     -> emits one `messages` example per language that has both fields.
 *   { "type": "site", "instruction": "prompt", "schema": { ...trilingual site schema... } }
 *     -> emits one JSON-generation example (the site-builder output shape).
 */
import { readFile, writeFile } from 'node:fs/promises';

const SYSTEM = {
  fa: 'تو آریا هستی، دستیار تجاری افغان. به همان زبان کاربر پاسخ بده.',
  ps: 'ته آریا یې، د افغان سوداګریز مرستیال. د کاروونکي په ژبه ځواب ورکړه.',
  en: "You are Aria, an Afghan business assistant. Reply in the user's language.",
};

const SITE_SYSTEM =
  'You are Aria Core AI. Given a business prompt, return a trilingual ' +
  '(Dari fa, Pashto ps, English en) website schema as JSON.';

const LANGS = ['fa', 'ps', 'en'];

async function main() {
  const args = process.argv.slice(2);
  const get = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };

  if (args.includes('--seed')) {
    return seed(get('--output') || 'data/seed-sites.jsonl');
  }

  const inputPath = get('--input');
  const outputPath = get('--output') || 'data/train.jsonl';
  if (!inputPath) {
    console.error('--input <file> is required (or use --seed).');
    process.exit(1);
  }

  const raw = JSON.parse(await readFile(inputPath, 'utf8'));
  const examples = Array.isArray(raw) ? raw : [raw];

  const out = [];
  for (const ex of examples) {
    if (ex.type === 'chat') {
      for (const lang of LANGS) {
        const instr = ex.instruction?.[lang];
        const resp = ex.response?.[lang];
        if (instr && resp) {
          out.push({
            messages: [
              { role: 'system', content: SYSTEM[lang] },
              { role: 'user', content: instr },
              { role: 'assistant', content: resp },
            ],
          });
        }
      }
    } else if (ex.type === 'site') {
      out.push({
        messages: [
          { role: 'system', content: SITE_SYSTEM },
          { role: 'user', content: ex.instruction },
          { role: 'assistant', content: JSON.stringify(ex.schema) },
        ],
      });
    } else {
      console.warn(`skipping unknown example type: ${ex.type}`);
    }
  }

  await writeFile(outputPath, out.map((o) => JSON.stringify(o)).join('\n') + '\n', 'utf8');
  console.log(`wrote ${out.length} examples → ${outputPath}`);
}

/** Seeds site-schema examples from the repo's sector blueprints. */
async function seed(outputPath) {
  let site;
  try {
    site = await import('../../services/site-builder/dist/index.js');
  } catch {
    console.error('site-builder is not built. Run `pnpm build:services` first.');
    process.exit(1);
  }

  const industries = ['clinic', 'school', 'logistics', 'export', 'retail', 'services'];
  const prompts = {
    clinic: 'یک کلینیک صحی در کابل',
    school: 'یک مکتب درسی زبان و کمپیوتر',
    logistics: 'یک شرکت ترانسپورتی بین‌المللی',
    export: 'یک شرکت صادراتی زعفران و میوه خشک',
    retail: 'یک دکان آنلاین فرش و صنایع دستی',
    services: 'یک شرکت مشورتی و حقوقی',
  };

  const out = [];
  for (const industry of industries) {
    const schema = site.createSectorBlueprint(industry, `seed-${industry}`, prompts[industry], undefined);
    out.push({
      messages: [
        { role: 'system', content: SITE_SYSTEM },
        { role: 'user', content: prompts[industry] },
        { role: 'assistant', content: JSON.stringify(schema) },
      ],
    });
  }

  await writeFile(outputPath, out.map((o) => JSON.stringify(o)).join('\n') + '\n', 'utf8');
  console.log(`seeded ${out.length} site-schema examples → ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
