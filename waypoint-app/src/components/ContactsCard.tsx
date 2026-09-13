/**
 * Key Contacts card (Profile, D4) — teachers, case managers, principals,
 * service coordinators. These auto-fill into generated letters, email
 * recipient suggestions, and the Waypoint Navigator's context.
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
import type { FunnelLocale } from '@/lib/eligibility';
import {
  contactsCopy,
  orgOptions,
  roleSuggestions,
  editContactLabel,
  removeContactTitle,
  type ContactsCopy,
} from '@/lib/contactsCopy';
import { colors, fonts, spacing, radii } from '@/lib/theme';

/** Emoji are locale-invariant, so this map can be built once from English. */
const ORG_EMOJI: Record<string, string> = Object.fromEntries(
  orgOptions('en').map((o) => [o.value, o.emoji])
);

export default function ContactsCard({
  familyId,
  locale = 'en',
}: {
  familyId: string;
  /** App language. Defaults to English so untranslated callers are unchanged. */
  locale?: FunnelLocale;
}) {
  const copy = contactsCopy(locale);
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
    showToast(ok ? copy.contactSaved : copy.cantSave, ok ? 'success' : 'error');
    if (ok) setFormFor(null);
  };

  const handleDelete = async (contact: FamilyContact) => {
    const confirmed = await showConfirm(
      removeContactTitle(contact.name, locale),
      copy.removeBody,
      copy.remove,
      true
    );
    if (!confirmed) return;
    const ok = await deleteContact(contact.id);
    showToast(ok ? copy.contactRemoved : copy.cantRemove, ok ? 'success' : 'error');
    if (ok && formFor === contact.id) setFormFor(null);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.intro}>
        {copy.intro}
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
            copy={copy}
            locale={locale}
          />
        ) : (
          <TouchableOpacity
            key={c.id}
            style={styles.contactRow}
            onPress={() => openForm(c)}
            accessibilityRole="button"
            accessibilityLabel={editContactLabel(c.name, locale)}
          >
            <Text style={styles.contactEmoji}>{ORG_EMOJI[c.organization ?? 'other']}</Text>
            <View style={styles.contactBody}>
              <Text style={styles.contactName}>{c.name}</Text>
              <Text style={styles.contactMeta}>
                {[c.role, c.email, c.phone].filter(Boolean).join(' · ') || copy.tapToAdd}
              </Text>
            </View>
            <Text style={styles.editHint}>{copy.editHint}</Text>
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
          copy={copy}
          locale={locale}
        />
      ) : (
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => openForm()}
          accessibilityRole="button"
          accessibilityLabel={copy.addContactA11y}
        >
          <Text style={styles.addBtnText}>{copy.addContact}</Text>
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
  copy: ContactsCopy;
  locale: FunnelLocale;
}) {
  const copy = props.copy;
  return (
    <View style={styles.form}>
      <Text style={styles.label}>{copy.name}</Text>
      <TextInput
        style={styles.input}
        value={props.name}
        onChangeText={props.setName}
        placeholder={copy.namePlaceholder}
        placeholderTextColor={colors.mid}
        autoCapitalize="words"
        accessibilityLabel={copy.nameA11y}
      />

      <Text style={styles.label}>{copy.role}</Text>
      <TextInput
        style={styles.input}
        value={props.role}
        onChangeText={props.setRole}
        placeholder={copy.rolePlaceholder}
        placeholderTextColor={colors.mid}
        autoCapitalize="words"
        accessibilityLabel={copy.roleA11y}
      />
      <View style={styles.chipRow}>
        {roleSuggestions(props.locale).filter((r) => r.toLowerCase() !== props.role.trim().toLowerCase())
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

      <Text style={styles.label}>{copy.organization}</Text>
      <View style={styles.chipRow}>
        {orgOptions(props.locale).map((o) => (
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

      <Text style={styles.label}>{copy.email}</Text>
      <TextInput
        style={styles.input}
        value={props.email}
        onChangeText={props.setEmail}
        placeholder={copy.emailPlaceholder}
        placeholderTextColor={colors.mid}
        keyboardType="email-address"
        autoCapitalize="none"
        accessibilityLabel={copy.emailA11y}
      />

      <Text style={styles.label}>{copy.phone}</Text>
      <TextInput
        style={styles.input}
        value={props.phone}
        onChangeText={props.setPhone}
        placeholder={copy.phonePlaceholder}
        placeholderTextColor={colors.mid}
        keyboardType="phone-pad"
        accessibilityLabel={copy.phoneA11y}
      />

      <View style={styles.formActions}>
        <TouchableOpacity
          style={[styles.saveBtn, (!props.name.trim() || props.saving) && styles.saveBtnDisabled]}
          onPress={props.onSave}
          disabled={!props.name.trim() || props.saving}
          accessibilityRole="button"
          accessibilityLabel={copy.saveA11y}
        >
          <Text style={styles.saveBtnText}>{copy.save}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={props.onCancel} accessibilityRole="button">
          <Text style={styles.cancelBtnText}>{copy.cancel}</Text>
        </TouchableOpacity>
        {props.onDelete && (
          <TouchableOpacity style={styles.deleteBtn} onPress={props.onDelete} accessibilityRole="button">
            <Text style={styles.deleteBtnText}>{copy.remove}</Text>
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
