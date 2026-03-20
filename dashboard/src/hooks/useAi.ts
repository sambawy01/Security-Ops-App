import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useAiPatterns() {
  return useQuery({
    queryKey: ['ai', 'patterns'],
    queryFn: () => apiFetch<{ data: unknown[] }>('/api/v1/ai/patterns'),
    refetchInterval: 60_000,
  });
}

export function useAiAnomalies() {
  return useQuery({
    queryKey: ['ai', 'anomalies'],
    queryFn: () => apiFetch<{ data: unknown[] }>('/api/v1/ai/anomalies'),
    refetchInterval: 30_000,
  });
}

export function useAiStaffing() {
  return useQuery({
    queryKey: ['ai', 'staffing'],
    queryFn: () => apiFetch<{ data: unknown }>('/api/v1/ai/staffing'),
  });
}

export function useAiReports(type?: string) {
  return useQuery({
    queryKey: ['ai', 'reports', type],
    queryFn: () =>
      apiFetch<{ data: unknown[]; total: number }>(
        `/api/v1/ai/reports${type ? '?type=' + type : ''}`
      ),
  });
}

export function useAiReportDetail(id: string) {
  return useQuery({
    queryKey: ['ai', 'reports', id],
    queryFn: () => apiFetch<{ data: unknown }>(`/api/v1/ai/reports/${id}`),
    enabled: !!id,
  });
}

export function useAiStatus() {
  return useQuery({
    queryKey: ['ai', 'status'],
    queryFn: () => apiFetch<{ available: boolean; model: string }>('/api/v1/ai/status'),
    refetchInterval: 60_000,
  });
}

export function useAiQuery() {
  return useMutation({
    mutationFn: (question: string) =>
      apiFetch<{ answer: string; classification: unknown; results: unknown }>(
        '/api/v1/ai/query',
        {
          method: 'POST',
          body: JSON.stringify({ question }),
        }
      ),
  });
}
