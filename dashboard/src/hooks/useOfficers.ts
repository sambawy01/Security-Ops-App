import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import type { Officer } from '../types';

interface OfficerFilters {
  zoneId?: string;
  status?: string;
}

export function useOfficers(filters?: OfficerFilters) {
  return useQuery({
    queryKey: ['officers', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.zoneId) params.set('zoneId', filters.zoneId);
      if (filters?.status) params.set('status', filters.status);
      const qs = params.toString();
      return apiFetch<Officer[]>(`/api/v1/officers${qs ? '?' + qs : ''}`);
    },
    refetchInterval: 30_000,
  });
}

export function useOfficerLocations() {
  return useQuery({
    queryKey: ['officers', 'locations'],
    queryFn: () =>
      apiFetch<
        Array<{
          officer_id: string;
          lat: number;
          lng: number;
          timestamp: string;
        }>
      >('/api/v1/officers/locations'),
    refetchInterval: 15_000,
  });
}
