#!/usr/bin/env node
/**
 * Bundle a range of migrations into one script for the Supabase SQL editor.
 *
 * This project applies migrations by hand rather than through the CLI, which
 * means seven separate copy-pastes plus seven ledger inserts — and one missed
 * step is a feature that silently doesn't work. This emits a single
 * transaction that runs them in order and records every one in
 * supabase_migrations.schema_migrations.
 *
 *   node scripts/build-pending-migrations.mjs 028 034 > pending.sql
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations');

const [from = '000', to = '999'] = process.argv.slice(2);

const files = readdirSync(DIR)
  .filter((f) => f.endsWith('.sql'))
  .filter((f) => {
    const version = f.slice(0, 3);
    return version >= from && version <= to;
  })
  .sort();

if (files.length === 0) {
  console.error(`No migrations found in ${from}..${to}`);
  process.exit(1);
}

const out = [];
out.push('-- Waypoint — pending migrations ' + from + '–' + to);
out.push('--');
out.push('-- Paste the whole file into the Supabase SQL editor and run it once.');
out.push('-- Everything is inside one transaction: if any statement fails, nothing');
out.push('-- is applied and the ledger stays honest. Every statement is written to');
out.push('-- be safely re-runnable, so running this twice is harmless.');
out.push('--');
for (const f of files) out.push(`--   ${f}`);
out.push('');
out.push('begin;');
out.push('');

for (const f of files) {
  const version = f.slice(0, 3);
  const name = f.slice(4).replace(/\.sql$/, '');
  out.push('-- ' + '═'.repeat(72));
  out.push(`-- ${f}`);
  out.push('-- ' + '═'.repeat(72));
  out.push(readFileSync(join(DIR, f), 'utf8').trimEnd());
  out.push('');
  out.push('insert into supabase_migrations.schema_migrations (version, name)');
  out.push(`values ('${version}', '${name}')`);
  out.push('on conflict (version) do nothing;');
  out.push('');
}

out.push('commit;');
out.push('');
console.log(out.join('\n'));
