/**
 * Role model (PRD W-A) — the app routes on the profile role BEFORE touching
 * families, so a staff login never falls into parent onboarding.
 */

export type ProfileRole = 'family' | 'facilitator' | 'supervisor' | 'admin';

export const STAFF_ROLES: readonly ProfileRole[] = ['facilitator', 'supervisor', 'admin'];

export function isStaffRole(role: ProfileRole | null | undefined): boolean {
  return !!role && (STAFF_ROLES as readonly string[]).includes(role);
}

/** Which root shell a signed-in user lands in. */
export function resolveShell(role: ProfileRole | null | undefined): 'family' | 'staff' {
  return isStaffRole(role) ? 'staff' : 'family';
}
