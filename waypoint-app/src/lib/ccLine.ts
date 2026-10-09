/**
 * The paper trail's "who else was on it" line (064, initiative 014 PR A).
 * Pure, so it is tested without rendering the screen.
 */

/** A name to show for an address — the Key Contacts entry, when there is one. */
export interface NamedAddress {
  name: string;
  email: string | null;
}

/**
 * The line under an email in Paper Trail naming who else was on it, or null
 * when none is recorded (every row before 064, every email with nobody else).
 *
 * The label differs by direction because the data does: an outgoing row
 * holds the Cc the family chose; a synced reply holds everyone else on it —
 * its To and Cc alike — so calling that "Cc" would misstate it.
 */
export function ccLine(
  entry: { direction: 'outgoing' | 'incoming'; cc?: readonly string[] | null },
  contacts: readonly NamedAddress[]
): string | null {
  if (!entry.cc || entry.cc.length === 0) return null;
  const names = entry.cc.map(
    (email) =>
      contacts.find((c) => c.email?.toLowerCase() === email.toLowerCase())?.name?.trim() || email
  );
  return `${entry.direction === 'incoming' ? 'Also on this email' : 'Cc'}: ${names.join(', ')}`;
}
