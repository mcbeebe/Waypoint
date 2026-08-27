/**
 * Card snoozing (owner feedback, Aug 26): "remind me later" for Home
 * cards. Per-device convenience via AsyncStorage — a snooze is about not
 * seeing a card on THIS phone for a while, not family state, so no
 * migration and no sync. Reads fail open (card shows) so a storage
 * hiccup never hides guidance.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const keyFor = (key: string) => `waypoint_snooze_${key}`;

/** Hide the card behind `key` for `days` days on this device. */
export async function snoozeFor(key: string, days: number): Promise<void> {
  try {
    await AsyncStorage.setItem(keyFor(key), String(Date.now() + days * 86_400_000));
  } catch {
    // Best effort — worst case the card reappears.
  }
}

/** Whether `key` is currently snoozed on this device. */
export async function isSnoozed(key: string): Promise<boolean> {
  try {
    const until = await AsyncStorage.getItem(keyFor(key));
    return !!until && Number(until) > Date.now();
  } catch {
    return false;
  }
}
