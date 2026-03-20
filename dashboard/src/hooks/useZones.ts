import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import type { Zone } from '../types';

export function useZones() {
  return useQuery({
    queryKey: ['zones'],
    queryFn: () => apiFetch<Zone[]>('/api/v1/zones'),
  });
}

export function useZoneDetail(id: string) {
  return useQuery({
    queryKey: ['zones', id],
    queryFn: () => apiFetch<Zone>(`/api/v1/zones/${id}`),
    enabled: !!id,
  });
}

export function useZonesGeoJSON() {
  return useQuery({
    queryKey: ['zones', 'geojson'],
    queryFn: () =>
      apiFetch<GeoJSON.FeatureCollection>('/api/v1/zones/geojson'),
  });
}

export function useCheckpointsGeoJSON() {
  return useQuery({
    queryKey: ['checkpoints', 'geojson'],
    queryFn: () =>
      apiFetch<GeoJSON.FeatureCollection>('/api/v1/checkpoints/geojson'),
  });
}
