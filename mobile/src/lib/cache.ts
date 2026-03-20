import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'cache:';

export async function getCached<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
  return raw ? JSON.parse(raw) : null;
}

export async function setCache<T>(key: string, data: T): Promise<void> {
  await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
}

export async function clearCache(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
  if (cacheKeys.length > 0) {
    await AsyncStorage.multiRemove(cacheKeys);
  }
}
