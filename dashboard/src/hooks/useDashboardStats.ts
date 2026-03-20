import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => apiFetch<Record<string, unknown>>('/api/v1/dashboard/stats'),
    refetchInterval: 15_000,
  });
}
