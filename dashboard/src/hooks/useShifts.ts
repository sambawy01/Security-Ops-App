import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import type { Shift } from '../types';

interface ShiftFilters {
  zoneId?: string;
  officerId?: string;
  status?: string;
  from?: string;
  to?: string;
}

export function useShifts(filters?: ShiftFilters) {
  return useQuery({
    queryKey: ['shifts', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.zoneId) params.set('zoneId', filters.zoneId);
      if (filters?.officerId) params.set('officerId', filters.officerId);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.from) params.set('from', filters.from);
      if (filters?.to) params.set('to', filters.to);
      const qs = params.toString();
      return apiFetch<Shift[]>(`/api/v1/shifts${qs ? '?' + qs : ''}`);
    },
  });
}
