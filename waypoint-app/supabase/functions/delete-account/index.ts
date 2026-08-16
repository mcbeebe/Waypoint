/**
 * delete-account — in-app account deletion (roadmap Wave 1.3; App Store
 * Guideline 5.1.1(v) requires an in-app deletion path).
 *
 * Verifies the caller's JWT, purges their document files from Storage
 * (FK cascade does NOT remove storage objects), then deletes the auth user —
 * the families.user_id FK is `on delete cascade`, which removes the family
 * and every row that hangs off it.
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Missing authorization' }, 401);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

    // Resolve the caller's family (deletion is strictly self-service —
    // the only account this function can ever delete is the caller's own)
    const { data: family } = await admin
      .from('families')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    // Purge storage: FK cascade does not touch storage.objects
    if (family) {
      const prefix = `${family.id}/`;
      let page = 0;
      // list() is paginated; loop until the folder is empty
      for (;;) {
        const { data: files, error: listError } = await admin.storage
          .from('documents')
          .list(family.id, { limit: 100, offset: 0 });
        if (listError || !files || files.length === 0) break;
        const paths = files.map((f: { name: string }) => `${prefix}${f.name}`);
        const { error: removeError } = await admin.storage.from('documents').remove(paths);
        if (removeError) break;
        page += 1;
        if (page > 100) break; // safety valve
      }
    }

    // Delete the auth user — cascades through families → all family data
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      return jsonResponse({ error: `Deletion failed: ${deleteError.message}` }, 500);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return jsonResponse({ error: message }, 500);
  }
});
