/**
 * Offline sync manager — queues operations when offline, syncs on reconnect
 * Phase 9: Sprint S64
 *
 * Provides a generic offline queue that any hook can use.
 * Operations are persisted to AsyncStorage and replayed on reconnect.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const QUEUE_PREFIX = 'waypoint_offline_queue_';

export interface QueuedOperation {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  createdAt: string;
}

/**
 * Add an operation to the offline queue.
 */
export async function enqueueOffline(
  queueName: string,
  operation: Omit<QueuedOperation, 'id' | 'createdAt'>
): Promise<void> {
  const key = QUEUE_PREFIX + queueName;
  const queue = await getQueue(queueName);
  queue.push({
    ...operation,
    id: `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
  });
  await AsyncStorage.setItem(key, JSON.stringify(queue));
}

/**
 * Get all queued operations for a queue.
 */
export async function getQueue(queueName: string): Promise<QueuedOperation[]> {
  try {
    const key = QUEUE_PREFIX + queueName;
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Clear the queue after successful sync.
 */
export async function clearQueue(queueName: string): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_PREFIX + queueName);
}

/**
 * Remove a single operation from the queue.
 */
export async function dequeueOperation(queueName: string, operationId: string): Promise<void> {
  const key = QUEUE_PREFIX + queueName;
  const queue = await getQueue(queueName);
  const filtered = queue.filter((op) => op.id !== operationId);
  await AsyncStorage.setItem(key, JSON.stringify(filtered));
}

/**
 * Check if the device is currently online.
 */
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true;
}

/**
 * Get total pending operations across all queues.
 */
export async function getPendingCount(): Promise<number> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const queueKeys = keys.filter((k) => k.startsWith(QUEUE_PREFIX));
    let total = 0;
    for (const key of queueKeys) {
      const raw = await AsyncStorage.getItem(key);
      if (raw) total += JSON.parse(raw).length;
    }
    return total;
  } catch {
    return 0;
  }
}
