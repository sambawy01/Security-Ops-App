export const API_URL = __DEV__
  ? 'http://10.0.2.2:3000'  // Android emulator → host machine
  : 'http://YOUR_SERVER_IP:3000'; // Production: on-premise server IP

export const GPS_INTERVAL_MS = 30000; // 30 seconds
export const SYNC_INTERVAL_MS = 30000; // 30 seconds
export const CHECKPOINT_PROXIMITY_METERS = 50;
