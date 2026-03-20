import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToken } from './auth';
import { API_URL } from '../config';

const LOCATION_TASK = 'background-location-task';
const LOCATION_BUFFER_KEY = 'location:buffer';
const TRACKING_OFFICER_KEY = 'tracking:officerId';

// Define the background task
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const { locations } = data as { locations: Location.LocationObject[] };

  // Buffer locations for batch upload
  const bufferRaw = await AsyncStorage.getItem(LOCATION_BUFFER_KEY);
  const buffer: any[] = bufferRaw ? JSON.parse(bufferRaw) : [];

  for (const loc of locations) {
    buffer.push({
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
      timestamp: new Date(loc.timestamp).toISOString(),
    });
  }

  // Try to upload batch
  const token = await getToken();
  const officerId = await AsyncStorage.getItem(TRACKING_OFFICER_KEY);

  if (token && officerId && buffer.length > 0) {
    try {
      for (const point of buffer) {
        await fetch(`${API_URL}/api/v1/officers/${officerId}/location`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(point),
        });
      }
      await AsyncStorage.setItem(LOCATION_BUFFER_KEY, '[]');
    } catch {
      // Keep buffer for next attempt
      await AsyncStorage.setItem(LOCATION_BUFFER_KEY, JSON.stringify(buffer));
    }
  } else {
    await AsyncStorage.setItem(LOCATION_BUFFER_KEY, JSON.stringify(buffer));
  }
});

export async function startTracking(officerId: string): Promise<boolean> {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') return false;

  await AsyncStorage.setItem(TRACKING_OFFICER_KEY, officerId);

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 30000, // 30 seconds
    distanceInterval: 10, // 10 meters
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: '\u0646\u0638\u0627\u0645 \u0627\u0644\u0623\u0645\u0646',
      notificationBody: '\u062A\u062A\u0628\u0639 \u0627\u0644\u0645\u0648\u0642\u0639 \u0646\u0634\u0637',
    },
  });
  return true;
}

export async function stopTracking(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
  await AsyncStorage.removeItem(TRACKING_OFFICER_KEY);
  await AsyncStorage.setItem(LOCATION_BUFFER_KEY, '[]');
}

export async function isTracking(): Promise<boolean> {
  return TaskManager.isTaskRegisteredAsync(LOCATION_TASK);
}
