// Override per build with: EXPO_PUBLIC_API_URL=https://api.example.com eas build ...
// Fallback is the dev Mac on LAN — only useful when the host machine is reachable.
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.108:3000';

export const GPS_INTERVAL_MS = 30000; // 30 seconds
export const SYNC_INTERVAL_MS = 30000; // 30 seconds
export const CHECKPOINT_PROXIMITY_METERS = 50;
