import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return null;
    const token = await Notifications.getExpoPushTokenAsync();
    // Store token locally -- sending to backend deferred to Phase 5
    await AsyncStorage.setItem('pushToken', token.data);
    return token.data;
  } catch {
    // Push notifications may not be available in development
    return null;
  }
}
