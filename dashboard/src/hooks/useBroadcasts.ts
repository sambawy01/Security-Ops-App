import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export interface Broadcast {
  id: string;
  message: string;
  priority: 'emergency' | 'urgent' | 'normal' | 'info';
  audience: string;
  zoneId: string | null;
  createdAt: string;
  sender: { id: string; nameEn: string; nameAr: string; badgeNumber: string; role: string } | null;
  ackedAt: string | null;
}

/**
 * Polls the broadcasts endpoint at a steady cadence so emergency instructions
 * surface within ~10s on every connected dashboard.
 */
export function useBroadcasts() {
  return useQuery<Broadcast[]>({
    queryKey: ['broadcasts'],
    queryFn: () => apiFetch<Broadcast[]>('/api/v1/broadcasts?take=50'),
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
  });
}

export function useSendBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { message: string; priority: string; audience: string; zoneId?: string }) =>
      apiFetch<{ data: Broadcast }>('/api/v1/broadcasts', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['broadcasts'] }),
  });
}

export function useAckBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: true }>(`/api/v1/broadcasts/${id}/ack`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['broadcasts'] }),
  });
}
