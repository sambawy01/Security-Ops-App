import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import type { Incident } from '../types';

interface IncidentFilters {
  status?: string;
  zoneId?: string;
  priority?: string;
  categoryId?: string;
  search?: string;
  skip?: number;
  take?: number;
}

export function useIncidents(filters?: IncidentFilters) {
  return useQuery({
    queryKey: ['incidents', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.zoneId) params.set('zoneId', filters.zoneId);
      if (filters?.priority) params.set('priority', filters.priority);
      if (filters?.categoryId) params.set('categoryId', filters.categoryId);
      if (filters?.search) params.set('search', filters.search);
      if (filters?.skip) params.set('skip', String(filters.skip));
      if (filters?.take) params.set('take', String(filters.take));
      const qs = params.toString();
      return apiFetch<Incident[]>(`/api/v1/incidents${qs ? '?' + qs : ''}`);
    },
    refetchInterval: 10_000,
  });
}

export function useIncidentDetail(id: string | null) {
  return useQuery({
    queryKey: ['incidents', id],
    queryFn: () => apiFetch<Incident>(`/api/v1/incidents/${id}`),
    enabled: !!id,
  });
}

export function useIncidentsGeoJSON() {
  return useQuery({
    queryKey: ['incidents', 'geojson'],
    queryFn: () =>
      apiFetch<GeoJSON.FeatureCollection>('/api/v1/incidents/geojson'),
    refetchInterval: 10_000,
  });
}

export function useAssignIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      incidentId,
      officerId,
    }: {
      incidentId: string;
      officerId: string;
    }) =>
      apiFetch(`/api/v1/incidents/${incidentId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ officerId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
}

export function useUpdateIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      incidentId,
      data,
    }: {
      incidentId: string;
      data: Record<string, unknown>;
    }) =>
      apiFetch(`/api/v1/incidents/${incidentId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
}

export function useAddIncidentUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      incidentId,
      data,
    }: {
      incidentId: string;
      data: { type: string; content: string };
    }) =>
      apiFetch(`/api/v1/incidents/${incidentId}/updates`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['incidents', variables.incidentId],
      });
    },
  });
}
