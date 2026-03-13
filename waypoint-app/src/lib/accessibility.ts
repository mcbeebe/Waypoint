/**
 * Accessibility utilities for Waypoint
 *
 * Provides helpers for consistent accessible behavior:
 * - Screen reader announcements
 * - Focus management
 * - Semantic role mapping
 * - Minimum touch target sizes (44x44 per Apple HIG)
 */

import { AccessibilityInfo, Platform } from 'react-native';

/** Minimum touch target size per Apple HIG / WCAG 2.5.5 */
export const MIN_TOUCH_TARGET = 44;

/**
 * Announce a message to screen readers (VoiceOver / TalkBack)
 * Useful for dynamic content updates, success messages, errors
 */
export function announce(message: string): void {
  AccessibilityInfo.announceForAccessibility(message);
}

/**
 * Check if a screen reader is currently active
 */
export async function isScreenReaderEnabled(): Promise<boolean> {
  return AccessibilityInfo.isScreenReaderEnabled();
}

/**
 * Build an accessibility label for a deadline with urgency context
 */
export function deadlineLabel(title: string, dueDate: string, status: string): string {
  const daysLeft = Math.ceil(
    (new Date(dueDate).getTime() - new Date().getTime()) / 86400000
  );

  if (status === 'completed') {
    return `${title}, completed`;
  }
  if (daysLeft < 0) {
    return `${title}, overdue by ${Math.abs(daysLeft)} days`;
  }
  if (daysLeft === 0) {
    return `${title}, due today`;
  }
  if (daysLeft === 1) {
    return `${title}, due tomorrow`;
  }
  return `${title}, due in ${daysLeft} days`;
}

/**
 * Build an accessibility label for an action item
 */
export function actionLabel(
  title: string,
  status: string,
  priority: string,
  category: string
): string {
  const statusMap: Record<string, string> = {
    not_started: 'not started',
    in_progress: 'in progress',
    completed: 'completed',
    dismissed: 'dismissed',
  };

  return `${title}, ${statusMap[status] ?? status}, ${priority} priority, ${category}`;
}

/**
 * Build an accessibility label for a document
 */
export function documentLabel(
  title: string,
  documentType: string,
  uploadedAt: string
): string {
  const typeMap: Record<string, string> = {
    iep: 'IEP document',
    evaluation: 'Evaluation report',
    insurance_denial: 'Insurance denial',
    appeal: 'Appeal document',
    medical_record: 'Medical record',
    ipp: 'IPP document',
    other: 'Document',
  };

  const date = new Date(uploadedAt).toLocaleDateString();
  return `${typeMap[documentType] ?? 'Document'}: ${title}, uploaded ${date}`;
}

/**
 * Format a percentage for screen readers
 */
export function percentageLabel(value: number, context: string): string {
  return `${Math.round(value)} percent ${context}`;
}
