/**
 * Static guards over the migration directory.
 *
 * WHY THIS FILE EXISTS. `public.action_stats` shipped in migration 004 as a
 * plain view over `public.actions` and sat there for 55 migrations returning
 * EVERY family's action counts to EVERY signed-in user. Postgres runs a view
 * with its definer's rights unless `security_invoker` is set, and the definer
 * owns `actions`, and a table owner bypasses that table's RLS. So the RLS on
 * actions — carefully written in 004, extended to co-parents in 053 — was
 * never applied through the view at all. The client's `.eq('family_id', …)`
 * looked like a boundary and was only a filter.
 *
 * Migration 053 NOTICED this, in a header comment, and moved on: "worth a
 * separate look". Nothing failed. Nothing went red. The note aged for three
 * weeks. Migration 059 is the fix; this file is the reason it cannot come
 * back — a comment is not a guard, and the next view added to this schema
 * should not depend on a reviewer remembering a Postgres default.
 *
 * These are STATIC checks over SQL text: they prove what the migration files
 * say, not what the live database does. Proving the live database is a
 * different and larger job — cross-tenant RLS integration tests, initiative
 * 008 — and this file is deliberately not a substitute for it.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'supabase',
  'migrations'
);

/**
 * SQL with comments removed. Both guards below must read only executable text:
 * migration 059's own header discusses `security_invoker = off` in prose, and
 * 053's header names `action_stats` — a parser that reads comments would draw
 * conclusions from documentation.
 */
function strippedSql(name: string): string {
  return readFileSync(join(MIGRATIONS_DIR, name), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ') // block comments
    .replace(/--[^\n]*/g, ' '); // line comments
}

const FILES = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const ALL_SQL = FILES.map(strippedSql).join('\n');

/** Every view this schema creates, by bare name. */
function declaredViews(): string[] {
  const re = /create\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\s+(?:if\s+not\s+exists\s+)?(?:public\.)?("?[a-zA-Z_][a-zA-Z0-9_]*"?)/gi;
  const found = new Set<string>();
  for (const m of ALL_SQL.matchAll(re)) found.add(m[1].replace(/"/g, ''));
  return [...found].sort();
}

/**
 * The last `security_invoker` setting applied to a view across the whole
 * directory, in file order — `on`, `off`, or null if never set. Order matters:
 * a later migration turning it back off must fail, not be masked by an earlier
 * migration turning it on.
 */
function finalInvokerSetting(view: string): 'on' | 'off' | null {
  const inline = new RegExp(
    `create\\s+(?:or\\s+replace\\s+)?view\\s+(?:public\\.)?"?${view}"?[\\s\\S]{0,400}?with\\s*\\([^)]*security_invoker\\s*=\\s*(on|off|true|false)`,
    'i'
  );
  const altered = new RegExp(
    `alter\\s+view\\s+(?:if\\s+exists\\s+)?(?:public\\.)?"?${view}"?\\s+set\\s*\\([^)]*security_invoker\\s*=\\s*(on|off|true|false)`,
    'i'
  );
  let setting: 'on' | 'off' | null = null;
  for (const file of FILES) {
    const sql = strippedSql(file);
    for (const re of [inline, altered]) {
      const m = sql.match(re);
      if (m) setting = /^(on|true)$/i.test(m[1]) ? 'on' : 'off';
    }
  }
  return setting;
}

describe('every view enforces RLS as the caller', () => {
  it('finds the views it is meant to be guarding', () => {
    // A regex that silently matches nothing would make every assertion below
    // vacuously pass — the exact failure mode that let this bug live.
    const views = declaredViews();
    expect(views.length).toBeGreaterThan(0);
    expect(views).toContain('action_stats');
  });

  it.each(declaredViews())(
    'view %s sets security_invoker = on',
    (view) => {
      const setting = finalInvokerSetting(view);

      expect(
        setting,
        `public.${view} never sets security_invoker.\n\n` +
          `A Postgres view runs with its DEFINER's rights by default, and the ` +
          `definer here owns the underlying tables — so RLS on those tables is ` +
          `NOT applied through the view, and it returns every family's rows to ` +
          `every signed-in user. This is exactly how action_stats leaked for 55 ` +
          `migrations (see 059).\n\n` +
          `Add to your migration:\n` +
          `  alter view public.${view} set (security_invoker = on);`
      ).not.toBeNull();

      expect(
        setting,
        `public.${view} explicitly sets security_invoker = OFF, which disables ` +
          `RLS through the view. If that is genuinely intended, the view must ` +
          `not be reachable by the anon or authenticated roles — revoke it and ` +
          `document why here.`
      ).toBe('on');
    }
  );
});

describe('the action_stats regression specifically', () => {
  it('is fixed in migration 059, not merely described', () => {
    const sql = strippedSql('059_action_stats_security_invoker.sql');
    expect(sql).toMatch(
      /alter\s+view\s+public\.action_stats\s+set\s*\(\s*security_invoker\s*=\s*on\s*\)/i
    );
  });

  it('is still the only view in the schema', () => {
    // If this fails, a view was added — which is fine, but it means the
    // it.each above is now carrying real weight for something new. Read the
    // new view's policies before updating this number.
    expect(declaredViews()).toEqual(['action_stats']);
  });
});
