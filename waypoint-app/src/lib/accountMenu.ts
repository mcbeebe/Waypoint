/**
 * What the avatar menu offers (Home rebuild phase 5).
 *
 * Four tabs is the point of the redesign, and Profile was the fifth. It is
 * not a place a parent visits daily, but everything it held has to stay one
 * tap away — so this list is data, and `navRegistry.test.ts` checks every
 * entry against the screens actually registered.
 */
import type { FunnelLocale } from '@/lib/eligibility';

export interface AccountMenuItem {
  key: string;
  icon: string;
  label: string;
  screen: string;
  params?: Record<string, string>;
}

/**
 * Everything the Profile tab reached, plus the two screens families asked
 * for by name. Kept as data so the "nothing is lost" test can read it.
 */
export function accountMenuItems(locale: FunnelLocale = 'en'): AccountMenuItem[] {
  const L = (en: string, es: string, vi: string) =>
    locale === 'es' ? es : locale === 'vi' ? vi : en;
  return [
    {
      key: 'profile',
      icon: 'person-outline',
      label: L('Profile and settings', 'Perfil y ajustes', 'Hồ sơ và cài đặt'),
      screen: 'Profile',
    },
    {
      key: 'notifications',
      icon: 'notifications-outline',
      label: L('Notifications', 'Notificaciones', 'Thông báo'),
      screen: 'NotificationSettings',
    },
    {
      key: 'family',
      icon: 'people-outline',
      label: L('Family sharing', 'Compartir en familia', 'Chia sẻ với gia đình'),
      screen: 'FamilySharing',
    },
    {
      key: 'documents',
      icon: 'folder-outline',
      label: L('Documents', 'Documentos', 'Tài liệu'),
      screen: 'Documents',
    },
    {
      key: 'pricing',
      icon: 'star-outline',
      label: L('Free and Premium', 'Gratis y Premium', 'Miễn phí và Premium'),
      screen: 'Pricing',
    },
  ];
}
