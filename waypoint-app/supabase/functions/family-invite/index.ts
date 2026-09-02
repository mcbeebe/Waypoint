/**
 * family-invite edge function (Family Sharing B2 — initiative 007).
 *
 * Emails a co-parent their join link. Until this existed, `inviteMember`
 * wrote a pending row and nothing told the invitee; B3 (054/055) made the
 * token redeemable, and this is the delivery.
 *
 * Auth: standard Supabase JWT (config verify_jwt=true). AUTHORIZATION IS
 * ROW-LEVEL SECURITY, NOT THIS CODE: the invitation is read with the caller's
 * own JWT, and 055's "Family admins can manage invitations" policy returns the
 * row only to the family's owner or an admin member. A stranger — even one
 * holding a valid invitation id — gets "not found". The same client stamps
 * sent_at / send_error, so a caller who can't read the row can't write it.
 *
 * What it will NOT do: send for an invitation that is not pending, or has
 * expired, or was emailed in the last 60 seconds (a Resend button is not a
 * spam cannon). It never logs the token, and it HTML-escapes everything a
 * person typed before it lands in the email.
 *
 * Secrets required (Supabase → Edge Functions → Secrets):
 *   RESEND_API_KEY      — from resend.com (the sending domain must be verified
 *                         there, or Resend refuses the From address)
 *   INVITE_FROM_EMAIL   — optional; default "Waypoint <hello@waypointchild.com>"
 *   APP_URL             — optional; default "https://www.waypointchild.com"
 *   SUPABASE_URL, SUPABASE_ANON_KEY — provided by the platform
 *
 * No CI covers Edge Functions — test by hand against a live project.
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM = Deno.env.get('INVITE_FROM_EMAIL') ?? 'Waypoint <hello@waypointchild.com>';
const APP_URL = (Deno.env.get('APP_URL') ?? 'https://www.waypointchild.com').replace(/\/+$/, '');

/** A second tap on Resend inside this window is answered, not re-sent. */
const RESEND_COOLDOWN_MS = 60_000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Everything a person typed is escaped before it goes into HTML. */
export function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface EmailInput {
  inviterName: string;
  role: string;
  joinUrl: string;
}

/**
 * The invitation email — a welcome, not a demand (escalation-tone rule). Warm
 * brand: paper #F5F1E9, panel #FFFFFF, ink #22303A, pine #0F766E. Inline
 * styles only; email clients strip stylesheets.
 */
export function renderInviteEmail({ inviterName, role, joinUrl }: EmailInput): { subject: string; html: string; text: string } {
  const name = esc(inviterName);
  const url = esc(joinUrl);
  const roleLine =
    role === 'viewer'
      ? `You're being added as a <b style="color:#55606B">Viewer</b> — you'll be able to see the family's plan, but not change it.`
      : `You're being added as a <b style="color:#55606B">Member</b> — you'll be able to see the family's plan and help keep it moving.`;
  const subject = `${inviterName} invited you to their Waypoint family`;
  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#F5F1E9;font-family:-apple-system,system-ui,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #EAE3D5;border-radius:16px;overflow:hidden;">
    <div style="background:#FBF6EC;border-bottom:1px solid #EAE3D5;padding:20px 28px;font-size:20px;font-weight:800;color:#22303A;">Waypoint</div>
    <div style="padding:28px;">
      <p style="margin:0 0 18px;font-size:22px;line-height:30px;font-weight:700;color:#22303A;">${name} invited you to help with their family on Waypoint</p>
      <p style="margin:0 0 22px;font-size:15px;line-height:24px;color:#55606B;">Waypoint helps families navigate California disability services — Regional Center, IEP, insurance and benefits. ${name} added you so you can see and work the plan together: the same next steps, calendar, and documents, in one place.</p>
      <p style="margin:0 0 22px;"><a href="${url}" style="display:inline-block;background:#0F766E;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:16px;padding:15px 32px;border-radius:12px;">Join the family</a></p>
      <p style="margin:0 0 18px;font-size:13px;line-height:20px;color:#6D6555;">Or paste this link into your browser:<br><a href="${url}" style="color:#0F766E;word-break:break-all;">${url}</a></p>
      <hr style="border:none;border-top:1px solid #EAE3D5;margin:0 0 18px;">
      <p style="margin:0;font-size:12px;line-height:18px;color:#6D6555;">${roleLine} This link expires in 14 days and only works for this email address. If you weren't expecting this, you can ignore it.</p>
    </div>
  </div>
</body></html>`;
  const text =
    `${inviterName} invited you to help with their family on Waypoint.\n\n` +
    `Waypoint helps families navigate California disability services. ${inviterName} added you so you can see and work the plan together.\n\n` +
    `Join the family: ${joinUrl}\n\n` +
    `This link expires in 14 days and only works for this email address. If you weren't expecting this, you can ignore it.\n`;
  return { subject, html, text };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  if (!RESEND_API_KEY) return json({ error: 'delivery_not_configured' }, 503);

  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'not_authenticated' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const invitationId = typeof body.invitation_id === 'string' ? body.invitation_id : '';
  if (!UUID.test(invitationId)) return json({ error: 'invalid_invitation_id' }, 400);

  // RLS is the gate: only the family's owner or an admin member gets a row.
  const { data: inv, error: readError } = await userClient
    .from('family_invitations')
    .select('id, family_id, invitee_email, role, status, token, expires_at, sent_at')
    .eq('id', invitationId)
    .maybeSingle();
  if (readError) return json({ error: 'read_failed' }, 500);
  if (!inv) return json({ error: 'not_found' }, 404);

  if (inv.status !== 'pending') return json({ error: 'not_pending' }, 409);
  if (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now()) {
    return json({ error: 'expired' }, 409);
  }
  if (inv.sent_at && Date.now() - new Date(inv.sent_at).getTime() < RESEND_COOLDOWN_MS) {
    return json({ ok: true, sent_at: inv.sent_at, skipped: 'cooldown' });
  }

  const { data: fam } = await userClient
    .from('families')
    .select('parent_first_name')
    .eq('id', inv.family_id)
    .maybeSingle();
  const inviterName = (fam?.parent_first_name ?? '').trim() || 'A parent';

  const joinUrl = `${APP_URL}/join?token=${encodeURIComponent(inv.token)}`;
  const { subject, html, text } = renderInviteEmail({ inviterName, role: inv.role, joinUrl });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [inv.invitee_email], subject, html, text }),
  });

  if (!res.ok) {
    // Keep the reason short and free of secrets; it's shown to the owner.
    let reason = `provider ${res.status}`;
    try {
      const err = await res.json();
      if (err && typeof err.message === 'string') reason = err.message.slice(0, 200);
    } catch { /* keep the status */ }
    await userClient.from('family_invitations').update({ send_error: reason }).eq('id', inv.id);
    return json({ error: 'send_failed', reason }, 502);
  }

  const sentAt = new Date().toISOString();
  await userClient
    .from('family_invitations')
    .update({ sent_at: sentAt, send_error: null })
    .eq('id', inv.id);
  return json({ ok: true, sent_at: sentAt });
});
