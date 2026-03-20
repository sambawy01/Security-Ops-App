import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToken } from './auth';
import { API_URL } from '../config';
import type { QueuedAction } from '../types';

const QUEUE_KEY = 'sync:queue';
const BATCH_SIZE = 500;

export async function queueAction(
  actionType: string,
  payload: unknown,
): Promise<void> {
  const queue = await getQueue();
  const action: QueuedAction = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    actionType,
    payload,
    createdAtDevice: new Date().toISOString(),
  };
  queue.push(action);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function getQueue(): Promise<QueuedAction[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function getQueueCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

export async function processQueue(): Promise<{
  processed: number;
  conflicts: string[];
}> {
  const queue = await getQueue();
  if (queue.length === 0) return { processed: 0, conflicts: [] };

  const token = await getToken();
  if (!token) return { processed: 0, conflicts: [] };

  try {
    const batch = queue.slice(0, BATCH_SIZE);
    const res = await fetch(`${API_URL}/api/v1/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ actions: batch }),
    });

    if (!res.ok) return { processed: 0, conflicts: [] };

    const result = await res.json();
    const processedIds = new Set<string>(result.processed);
    const remaining = queue.filter((a) => !processedIds.has(a.id));
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));

    return {
      processed: result.processed.length,
      conflicts: result.conflicts ?? [],
    };
  } catch {
    return { processed: 0, conflicts: [] };
  }
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
