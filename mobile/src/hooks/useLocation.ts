import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';

export function useCurrentLocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const acquire = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        return null;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const next = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setLocation(next);
      return next;
    } catch (e) {
      setError((e as Error).message || 'Failed to acquire location');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void acquire();
  }, [acquire]);

  return { location, error, loading, refresh: acquire };
}
