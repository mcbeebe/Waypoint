/**
 * Static guards over the migration directory.
 *
 * WHY THIS FILE EXISTS. `public.action_stats` shipped in migration 004 as a
 * plain view over `public.actions` and sat there for 55 migrations returning
 * EVERY family's action counts to EVERY caller — including `anon`, the
 * publishable key that ships inside the app bundle. Postgres runs a view with
 * its definer's rights unless `security_invoker` is set, the definer owns
 * `actions`, and a table owner bypasses that table's RLS. So the RLS on
 * actions — written in 004, extended to co-parents in 053 — was never applied
 * through the view at all.
 *
 * Migration 053 NOTICED, in a header comment, and moved on: "worth a separate
 * look". Nothing failed. Nothing went red. Migration 059 is the fix; this file
 * is why it cannot come back.
 *
 * HOW THIS GUARD IS BUILT, AND WHY IT IS NOT A PILE OF REGEXES.
 * The first version of this file matched patterns against whole files. An
 * adversarial pass against a real PostgreSQL 16 cluster defeated it five ways,
 * each verified by execution:
 *
 *   - `create or replace view` with no `with (...)` clause CLEARS
 *     security_invoker (Postgres replaces reloptions wholesale). The most
 *     likely future edit to this view — adding a column to the rollup — reopened
 *     the leak while the guard stayed green.
 *   - A `[\s\S]{0,400}` window let one view's name match a DIFFERENT view's
 *     `with (security_invoker = on)`, certifying an unsecured view as secured.
 *   - `create recursive view` was not matched at all.
 *   - Materialized views were demanded to set an option they cannot hold
 *     (`alter materialized view … set (security_invoker …)` is an error), so the
 *     guard fired with a remedy that does not execute.
 *   - A non-global `.match()` meant the FIRST setting in a file won, not the
 *     last, so `on` then `off` in one file passed.
 *
 * So this walks STATEMENTS in order and models what Postgres actually does to
 * `reloptions`: create sets the option state (absent unless the statement says
 * otherwise), drop clears it, alter updates it. Last write wins, across files
 * and within them.
 *
 * These are STATIC checks over SQL text: they prove what the migration files
 * say, not what the live database does. Because migrations here are applied BY
 * HAND, those are independent facts — CI green here does NOT mean production is
 * fixed. The live proof is the verification query in 059 and, permanently,
 * initiative 008.
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

const FILES = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

/** Comments removed — migration prose discusses `security_invoker = off`. */
function strippedSql(name: string): string {
  return readFileSync(join(MIGRATIONS_DIR, name), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ');
}

/**
 * Split into statements, respecting dollar-quoted blocks (`do $$ … $$`, which
 * 059 uses) and single-quoted strings, so a `;` inside either does not split.
 */
function statements(sql: string): string[] {
  const out: string[] = [];
  let cur = '';
  let i = 0;
  let tag: string | null = null;
  let inStr = false;
  while (i < sql.length) {
    if (tag) {
      if (sql.startsWith(tag, i)) {
        cur += tag;
        i += tag.length;
        tag = null;
      } else cur += sql[i++];
      continue;
    }
    if (inStr) {
      if (sql[i] === "'") inStr = false;
      cur += sql[i++];
      continue;
    }
    const dollar = /^\$[a-zA-Z_]*\$/.exec(sql.slice(i));
    if (dollar) {
      tag = dollar[0];
      cur += tag;
      i += tag.length;
      continue;
    }
    if (sql[i] === "'") {
      inStr = true;
      cur += sql[i++];
      continue;
    }
    if (sql[i] === ';') {
      out.push(cur);
      cur = '';
      i++;
      continue;
    }
    cur += sql[i++];
  }
  if (cur.trim()) out.push(cur);
  return out;
}

type Kind = 'view' | 'materialized';
interface ViewState {
  kind: Kind;
  /** Last security_invoker setting, or null when unset (Postgres's default). */
  invoker: 'on' | 'off' | null;
  /** SELECT revoked from these roles — the only real remedy for a matview. */
  revokedFrom: Set<string>;
  file: string;
}

const CREATE =
  /^\s*create\s+(?:or\s+replace\s+)?(?:(recursive|materialized|temp|temporary)\s+)?view\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-zA-Z_][\w]*)"?/i;
const ALTER =
  /^\s*alter\s+(?:materialized\s+)?view\s+(?:if\s+exists\s+)?(?:public\.)?"?([a-zA-Z_][\w]*)"?\s+set\s*\(([^)]*)\)/i;
const DROP =
  /^\s*drop\s+(?:materialized\s+)?view\s+(?:if\s+exists\s+)?(?:public\.)?"?([a-zA-Z_][\w]*)"?/i;
const REVOKE =
  /^\s*revoke\s+([\s\S]*?)\s+on\s+(?:table\s+)?(?:public\.)?"?([a-zA-Z_][\w]*)"?\s+from\s+([\s\S]*)$/i;

function invokerIn(text: string): 'on' | 'off' | null {
  const m = /security_invoker\s*=\s*(on|off|true|false)/i.exec(text);
  if (!m) return null;
  return /^(on|true)$/i.test(m[1]) ? 'on' : 'off';
}

/** Replay every migration in order and report the final state of each view. */
function finalViewStates(): Map<string, ViewState> {
  const state = new Map<string, ViewState>();
  for (const file of FILES) {
    for (const stmt of statements(strippedSql(file))) {
      const dropped = DROP.exec(stmt);
      if (dropped) {
        state.delete(dropped[1].toLowerCase());
        continue;
      }

      const created = CREATE.exec(stmt);
      if (created) {
        const name = created[2].toLowerCase();
        // Options live in the WITH clause BEFORE `as` — after it is the query
        // body, where `with` would be a CTE.
        const head = stmt.split(/\bas\b/i)[0];
        // A create with no WITH clause RESETS reloptions. Modelling that is the
        // entire point: it is how the option silently disappears.
        state.set(name, {
          kind: created[1]?.toLowerCase() === 'materialized' ? 'materialized' : 'view',
          invoker: invokerIn(head),
          revokedFrom: state.get(name)?.revokedFrom ?? new Set(),
          file,
        });
        continue;
      }

      const altered = ALTER.exec(stmt);
      if (altered) {
        const name = altered[1].toLowerCase();
        const found = invokerIn(altered[2]);
        const prev = state.get(name);
        if (prev && found) state.set(name, { ...prev, invoker: found });
        continue;
      }

      const revoked = REVOKE.exec(stmt);
      if (revoked) {
        const name = revoked[2].toLowerCase();
        const prev = state.get(name);
        if (prev && /\b(select|all)\b/i.test(revoked[1])) {
          const roles = revoked[3].toLowerCase();
          for (const role of ['anon', 'authenticated', 'public']) {
            if (new RegExp(`\\b${role}\\b`).test(roles)) prev.revokedFrom.add(role);
          }
        }
      }
    }
  }
  return state;
}

const STATES = finalViewStates();
const VIEW_NAMES = [...STATES.keys()].sort();

describe('every view enforces RLS as the caller', () => {
  it('actually parses the schema it claims to guard', () => {
    // A parser that silently matched nothing would make every case below
    // vacuously green — the exact failure mode that let this bug live.
    expect(VIEW_NAMES.length).toBeGreaterThan(0);
    expect(VIEW_NAMES).toContain('action_stats');
  });

  it.each(VIEW_NAMES)('view %s cannot bypass RLS', (name) => {
    const s = STATES.get(name)!;

    if (s.kind === 'materialized') {
      // RLS is NEVER applied to a materialized view scan — security_invoker
      // does not exist for them and `alter materialized view … set
      // (security_invoker …)` is a hard error. The only real remedy is to keep
      // the client roles off it entirely.
      const covered = s.revokedFrom.has('public')
        ? true
        : s.revokedFrom.has('anon') && s.revokedFrom.has('authenticated');
      expect(
        covered,
        `public.${name} is a MATERIALIZED view (${s.file}). RLS is never applied ` +
          `to a matview scan, and security_invoker does not exist for them — so ` +
          `any client role that can select it reads every family's rows.\n\n` +
          `Do NOT try 'alter materialized view … set (security_invoker = on)'; ` +
          `that errors. Either revoke it from the client roles:\n` +
          `  revoke all on public.${name} from anon, authenticated;\n` +
          `or make it a regular view with security_invoker = on.`
      ).toBe(true);
      return;
    }

    expect(
      s.invoker,
      `public.${name} does not end up with security_invoker set (last touched in ` +
        `${s.file}).\n\n` +
        `A Postgres view runs with its DEFINER's rights by default, and the ` +
        `definer here owns the underlying tables — so RLS is NOT applied through ` +
        `it and every family's rows are returned to every caller, anon included. ` +
        `That is exactly how action_stats leaked for 55 migrations (see 059).\n\n` +
        `NOTE: 'create or replace view' with no WITH clause CLEARS the option, ` +
        `even if an earlier migration set it. Re-set it in the same statement:\n` +
        `  create or replace view public.${name} with (security_invoker = on) as …\n` +
        `or follow it with:\n` +
        `  alter view public.${name} set (security_invoker = on);`
    ).not.toBeNull();

    expect(
      s.invoker,
      `public.${name} ends with security_invoker = OFF, which disables RLS ` +
        `through the view. If deliberate, it must not be reachable by anon or ` +
        `authenticated — revoke it and say why here.`
    ).toBe('on');
  });
});

describe('the action_stats regression specifically', () => {
  it('is fixed in 059, and the fix survives every later migration', () => {
    expect(STATES.get('action_stats')?.invoker).toBe('on');
  });

  it('is also revoked from anon — the vector was unauthenticated', () => {
    // The adversary proved the pre-fix leak was reachable with NO JWT at all,
    // via the publishable key that ships in the app bundle. security_invoker
    // alone does close that (anon has no auth.uid(), so every policy fails),
    // but the view has exactly one legitimate caller and it is authenticated,
    // so anon has no business holding SELECT on it either.
    const s = STATES.get('action_stats')!;
    expect(s.revokedFrom.has('anon') || s.revokedFrom.has('public')).toBe(true);
  });
});
