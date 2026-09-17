/**
 * Multi-select diagnosis picker
 * Ported from GAS MVP ONBOARD_STEPS step 2 (18 diagnosis options)
 *
 * Localized in initiative 009. The `value` keys are NOT translatable: they
 * are persisted as `diagnoses.name` and read by `planGenerator.ts` (`hasDx`
 * at :291, and the autism/PDA equivalence at :291) to decide which plan steps
 * a family gets. A translated value would silently change a child's plan, so
 * only `label` moves between languages — pinned by `DiagnosisSelector.test.ts`.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SelectGrid from './SelectGrid';
import type { FunnelLocale } from '@/lib/eligibility';
import { colors, fonts, spacing } from '@/lib/theme';

export interface DiagnosisOption {
  value: string;
  label: string;
  emoji: string;
}

function pick(locale: FunnelLocale, en: string, es: string, vi: string): string {
  return locale === 'es' ? es : locale === 'vi' ? vi : en;
}

/**
 * All diagnosis options from GAS MVP, plus PDA and PTSD.
 *
 * Naming follows the English source rather than re-deciding it: where the
 * English uses community/identity terms ("Deaf / Hard of hearing"), the
 * translations mirror that register instead of imposing person-first
 * phrasing (content-ops STYLE-GUIDE §4 — per-community disability language).
 */
export function diagnosisOptions(locale: FunnelLocale = 'en'): DiagnosisOption[] {
  const L = (en: string, es: string, vi: string) => pick(locale, en, es, vi);
  return [
    { value: 'autism', label: L('Autism (ASD)', 'Autismo (TEA)', 'Tự kỷ (ASD)'), emoji: '🧩' },
    { value: 'pda', label: L('PDA (Demand Avoidance)', 'PDA (evitación de demandas)', 'PDA (né tránh yêu cầu)'), emoji: '🛡️' },
    { value: 'delay', label: L('Developmental delays', 'Retrasos del desarrollo', 'Chậm phát triển'), emoji: '🌱' },
    { value: 'id', label: L('Intellectual disability', 'Discapacidad intelectual', 'Khuyết tật trí tuệ'), emoji: '🧠' },
    { value: 'sld', label: L('Learning disability (SLD)', 'Trastorno del aprendizaje (SLD)', 'Khuyết tật học tập (SLD)'), emoji: '📚' },
    { value: 'adhd', label: L('ADHD', 'TDAH', 'ADHD (tăng động giảm chú ý)'), emoji: '⚡' },
    { value: 'cp', label: L('Cerebral palsy', 'Parálisis cerebral', 'Bại não'), emoji: '🦽' },
    { value: 'down', label: L('Down syndrome', 'Síndrome de Down', 'Hội chứng Down'), emoji: '💛' },
    { value: 'epilepsy', label: L('Epilepsy / Seizures', 'Epilepsia / Convulsiones', 'Động kinh / Co giật'), emoji: '⚕️' },
    { value: 'sli', label: L('Speech / Language', 'Habla / Lenguaje', 'Nói / Ngôn ngữ'), emoji: '🗣️' },
    { value: 'sensory', label: L('Sensory processing', 'Procesamiento sensorial', 'Xử lý giác quan'), emoji: '👁️' },
    { value: 'genetic', label: L('Genetic condition', 'Condición genética', 'Bệnh di truyền'), emoji: '🧬' },
    { value: 'dyslexia', label: L('Dyslexia', 'Dislexia', 'Chứng khó đọc'), emoji: '📖' },
    { value: 'tbi', label: L('Traumatic brain injury', 'Lesión cerebral traumática', 'Chấn thương sọ não'), emoji: '🏥' },
    { value: 'deaf', label: L('Deaf / Hard of hearing', 'Sordo / Con dificultad auditiva', 'Điếc / Khiếm thính'), emoji: '🦻' },
    { value: 'blind', label: L('Blind / Low vision', 'Ciego / Baja visión', 'Mù / Thị lực kém'), emoji: '👓' },
    { value: 'multiple', label: L('Multiple disabilities', 'Discapacidades múltiples', 'Đa khuyết tật'), emoji: '🔗' },
    { value: 'ohi', label: L('Other health impairment', 'Otra condición de salud', 'Vấn đề sức khỏe khác'), emoji: '💊' },
    { value: 'ed', label: L('Emotional disturbance', 'Trastorno emocional', 'Rối loạn cảm xúc'), emoji: '🫂' },
    { value: 'ptsd', label: L('PTSD / Trauma', 'TEPT / Trauma', 'PTSD / Sang chấn'), emoji: '🎗️' },
    { value: 'suspected', label: L('Suspected (not yet dx)', 'Sospecha (sin diagnóstico aún)', 'Nghi ngờ (chưa chẩn đoán)'), emoji: '❓' },
  ];
}

/**
 * The English option list, kept as a named export because callers outside
 * this component (and older imports) expect it.
 */
export const DIAGNOSIS_OPTIONS = diagnosisOptions('en');

/** The picker's hint and its empty-state validation line. */
export function diagnosisSelectorCopy(locale: FunnelLocale = 'en') {
  return {
    hint: pick(locale, 'Select all that apply', 'Seleccione todas las que correspondan', 'Chọn tất cả những mục phù hợp'),
    validation: pick(
      locale,
      'Please select at least one diagnosis',
      'Seleccione al menos un diagnóstico',
      'Vui lòng chọn ít nhất một chẩn đoán',
    ),
  };
}

interface DiagnosisSelectorProps {
  selected: string[];
  onToggle: (value: string) => void;
  /** App language. Defaults to English so untranslated callers are unchanged. */
  locale?: FunnelLocale;
}

export default function DiagnosisSelector({ selected, onToggle, locale = 'en' }: DiagnosisSelectorProps) {
  const copy = diagnosisSelectorCopy(locale);
  return (
    <View style={styles.container}>
      <Text style={styles.hint}>{copy.hint}</Text>
      <SelectGrid
        options={diagnosisOptions(locale)}
        selected={selected}
        onSelect={onToggle}
        multiSelect
        columns={2}
      />
      {selected.length === 0 && (
        <Text style={styles.validation}>{copy.validation}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hint: {
    fontSize: fonts.sizes.sm,
    color: colors.mid,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  validation: {
    fontSize: fonts.sizes.sm,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
