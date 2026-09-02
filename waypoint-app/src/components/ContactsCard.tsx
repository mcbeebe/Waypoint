/**
 * Key Contacts card (Profile, D4) — teachers, case managers, principals,
 * service coordinators. These auto-fill into generated letters, email
 * recipient suggestions, and the AI Navigator's context.
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useToast } from '@/components/Toast';
import { showConfirm } from '@/lib/dialogs';
import {
  useContacts,
  type FamilyContact,
  type ContactOrg,
  type ContactInput,
} from '@/hooks/useContacts';
import { colors, fonts, spacing, radii } from '@/lib/theme';

const ORG_OPTIONS: Array<{ value: ContactOrg; label: string; emoji: string }> = [
  { value: 'school', label: 'School', emoji: '🏫' },
  { value: 'regional_center', label: 'Regional Center', emoji: '🏛️' },
  { value: 'insurance', label: 'Insurance', emoji: '🏥' },
  { value: 'medical', label: 'Medical', emoji: '⚕️' },
  { value: 'other', label: 'Other', emoji: '📋' },
];

const ORG_EMOJI: Record<string, string> = Object.fromEntries(
  ORG_OPTIONS.map((o) => [o.value, o.emoji])
);

const ROLE_SUGGESTIONS = [
  'Service Coordinator',
  'SpEd Teacher',
  'Gen Ed Teacher',
  'Case Manager',
  'Principal',
  'School Psychologist',
  'Pediatrician',
  'Insurance Case Worker',
];

export default function ContactsCard({ familyId }: { familyId: string }) {
  const { showToast } = useToast();
  const { contacts, addContact, updateContact, deleteContact } = useContacts(familyId);

  // null = closed; 'new' = adding; otherwise the contact id being edited
  const [formFor, setFormFor] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [org, setOrg] = useState<ContactOrg>('school');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const openForm = (contact?: FamilyContact) => {
    setFormFor(contact?.id ?? 'new');
    setName(contact?.name ?? '');
    setRole(contact?.role ?? '');
    setOrg(contact?.organization ?? 'school');
    setEmail(contact?.email ?? '');
    setPhone(contact?.phone ?? '');
  };

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    const input: ContactInput = { name, role, organization: org, email, phone };
    const ok = formFor === 'new' ? await addContact(input) : await updateContact(formFor!, input);
    setSaving(false);
    showToast(ok ? 'Contact saved' : "Couldn't save — try again.", ok ? 'success' : 'error');
    if (ok) setFormFor(null);
  };

  const handleDelete = async (contact: FamilyContact) => {
    const confirmed = await showConfirm(
      `Remove ${contact.name}?`,
      'They will no longer auto-fill into letters and emails.',
      'Remove',
      true
    );
    if (!confirmed) return;
    const ok = await deleteContact(contact.id);
    showToast(ok ? 'Contact removed' : "Couldn't remove — try again.", ok ? 'success' : 'error');
    if (ok && formFor === contact.id) setFormFor(null);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.intro}>
        Your child's team — these names auto-fill into generated letters, email recipients,
        and the Waypoint Navigator's suggestions.
      </Text>

      {contacts.map((c) =>
        formFor === c.id ? (
          <ContactForm
            key={c.id}
            name={name} setName={setName}
            role={role} setRole={setRole}
            org={org} setOrg={setOrg}
            email={email} setEmail={setEmail}
            phone={phone} setPhone={setPhone}
            saving={saving}
            onSave={handleSave}
            onCancel={() => setFormFor(null)}
            onDelete={() => handleDelete(c)}
          />
        ) : (
          <TouchableOpacity
            key={c.id}
            style={styles.contactRow}
            onPress={() => openForm(c)}
            accessibilityRole="button"
            accessibilityLabel={`Edit contact ${c.name}`}
          >
            <Text style={styles.contactEmoji}>{ORG_EMOJI[c.organization ?? 'other']}</Text>
            <View style={styles.contactBody}>
              <Text style={styles.contactName}>{c.name}</Text>
              <Text style={styles.contactMeta}>
                {[c.role, c.email, c.phone].filter(Boolean).join(' · ') || 'Tap to add details'}
              </Text>
            </View>
            <Text style={styles.editHint}>Edit ›</Text>
          </TouchableOpacity>
        )
      )}

      {formFor === 'new' ? (
        <ContactForm
          name={name} setName={setName}
          role={role} setRole={setRole}
          org={org} setOrg={setOrg}
          email={email} setEmail={setEmail}
          phone={phone} setPhone={setPhone}
          saving={saving}
          onSave={handleSave}
          onCancel={() => setFormFor(null)}
        />
      ) : (
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => openForm()}
          accessibilityRole="button"
          accessibilityLabel="Add a contact"
        >
          <Text style={styles.addBtnText}>＋ Add a contact</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ContactForm(props: {
  name: string; setName: (v: string) => void;
  role: string; setRole: (v: string) => void;
  org: ContactOrg; setOrg: (v: ContactOrg) => void;
  email: string; setEmail: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  return (
    <View style={styles.form}>
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={props.name}
        onChangeText={props.setName}
        placeholder="e.g., Maria Lopez"
        placeholderTextColor={colors.mid}
        autoCapitalize="words"
        accessibilityLabel="Contact name"
      />

      <Text style={styles.label}>Role</Text>
      <TextInput
        style={styles.input}
        value={props.role}
        onChangeText={props.setRole}
        placeholder="e.g., Service Coordinator"
        placeholderTextColor={colors.mid}
        autoCapitalize="words"
        accessibilityLabel="Contact role"
      />
      <View style={styles.chipRow}>
        {ROLE_SUGGESTIONS.filter((r) => r.toLowerCase() !== props.role.trim().toLowerCase())
          .slice(0, 4)
          .map((r) => (
            <TouchableOpacity
              key={r}
              style={styles.roleChip}
              onPress={() => props.setRole(r)}
              accessibilityRole="button"
            >
              <Text style={styles.roleChipText}>{r}</Text>
            </TouchableOpacity>
          ))}
      </View>

      <Text style={styles.label}>Organization</Text>
      <View style={styles.chipRow}>
        {ORG_OPTIONS.map((o) => (
          <TouchableOpacity
            key={o.value}
            style={[styles.orgChip, props.org === o.value && styles.orgChipActive]}
            onPress={() => props.setOrg(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: props.org === o.value }}
          >
            <Text style={[styles.orgChipText, props.org === o.value && styles.orgChipTextActive]}>
              {o.emoji} {o.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={props.email}
        onChangeText={props.setEmail}
        placeholder="name@district.org"
        placeholderTextColor={colors.mid}
        keyboardType="email-address"
        autoCapitalize="none"
        accessibilityLabel="Contact email"
      />

      <Text style={styles.label}>Phone</Text>
      <TextInput
        style={styles.input}
        value={props.phone}
        onChangeText={props.setPhone}
        placeholder="(510) 555-0100"
        placeholderTextColor={colors.mid}
        keyboardType="phone-pad"
        accessibilityLabel="Contact phone"
      />

      <View style={styles.formActions}>
        <TouchableOpacity
          style={[styles.saveBtn, (!props.name.trim() || props.saving) && styles.saveBtnDisabled]}
          onPress={props.onSave}
          disabled={!props.name.trim() || props.saving}
          accessibilityRole="button"
          accessibilityLabel="Save contact"
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={props.onCancel} accessibilityRole="button">
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        {props.onDelete && (
          <TouchableOpacity style={styles.deleteBtn} onPress={props.onDelete} accessibilityRole="button">
            <Text style={styles.deleteBtnText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  intro: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    lineHeight: 17,
    marginBottom: spacing.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.light,
    minHeight: 48,
  },
  contactEmoji: {
    fontSize: 18,
  },
  contactBody: {
    flex: 1,
  },
  contactName: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.medium as '500',
    color: colors.dark,
  },
  contactMeta: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    marginTop: 1,
  },
  editHint: {
    fontSize: fonts.sizes.xs,
    color: colors.teal,
    fontWeight: fonts.weights.medium as '500',
  },
  addBtn: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.base,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: fonts.sizes.sm,
    color: colors.teal,
    fontWeight: fonts.weights.semibold as '600',
  },
  form: {
    borderTopWidth: 1,
    borderTopColor: colors.light,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  label: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.semibold as '600',
    color: colors.mid,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.light,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
    fontSize: fonts.sizes.sm,
    color: colors.dark,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  roleChip: {
    backgroundColor: colors.light,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 26,
    justifyContent: 'center',
  },
  roleChipText: {
    fontSize: fonts.sizes.xs,
    color: colors.teal,
  },
  orgChip: {
    backgroundColor: colors.light,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minHeight: 30,
    justifyContent: 'center',
  },
  orgChipActive: {
    backgroundColor: colors.teal,
  },
  orgChipText: {
    fontSize: fonts.sizes.xs,
    color: colors.dark,
    fontWeight: fonts.weights.medium as '500',
  },
  orgChipTextActive: {
    color: colors.white,
  },
  formActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  saveBtn: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 40,
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: fonts.sizes.sm,
    color: colors.white,
    fontWeight: fonts.weights.semibold as '600',
  },
  cancelBtn: {
    minHeight: 40,
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: fonts.sizes.sm,
    color: colors.mid,
  },
  deleteBtn: {
    marginLeft: 'auto',
    minHeight: 40,
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: fonts.sizes.sm,
    color: '#DC2626',
  },
});
