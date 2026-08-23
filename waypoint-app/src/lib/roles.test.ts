import { describe, it, expect } from 'vitest';
import { isStaffRole, resolveShell } from './roles';

describe('roles', () => {
  it('treats facilitator/supervisor/admin as staff', () => {
    expect(isStaffRole('facilitator')).toBe(true);
    expect(isStaffRole('supervisor')).toBe(true);
    expect(isStaffRole('admin')).toBe(true);
  });

  it('treats family, null, and undefined as non-staff', () => {
    expect(isStaffRole('family')).toBe(false);
    expect(isStaffRole(null)).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
  });

  it('routes staff to the staff shell and everyone else to family', () => {
    expect(resolveShell('facilitator')).toBe('staff');
    expect(resolveShell('admin')).toBe('staff');
    expect(resolveShell('family')).toBe('family');
    // A missing profile row must never strand a parent: default to family.
    expect(resolveShell(null)).toBe('family');
  });
});
