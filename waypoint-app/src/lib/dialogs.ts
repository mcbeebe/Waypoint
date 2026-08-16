/**
 * Cross-platform dialogs — React Native's Alert.alert is a NO-OP on
 * react-native-web, so every Alert-based confirm silently does nothing in
 * the PWA (the bug behind "I can't click buttons in Settings"). These
 * helpers use window.confirm/alert on web and Alert on native.
 */

import { Alert, Platform } from 'react-native';

/** Fire-and-forget notice. */
export function showAlert(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

/** Yes/no confirmation. Resolves true when the user confirms. */
export function showConfirm(
  title: string,
  message: string,
  confirmLabel = 'OK',
  destructive = false
): Promise<boolean> {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise(resolve => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}
