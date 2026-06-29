import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

interface CreateShiftInput {
  officerId: string;
  zoneId: string;
  scheduledStart: string;
  scheduledEnd: string;
  isOvertime?: boolean;
  parentShiftId?: string;
}

interface UpdateShiftInput {
  officerId?: string;
  zoneId?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  isOvertime?: boolean;
}

export function useCreateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateShiftInput) =>
      apiFetch<{ id: string }>('/api/v1/shifts', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}

export function useUpdateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateShiftInput & { id: string }) =>
      apiFetch<{ id: string }>(`/api/v1/shifts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}

export function useDeleteShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/v1/shifts/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}

export function useChangeShiftStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'called_off' | 'no_show' }) =>
      apiFetch<{ id: string }>(`/api/v1/shifts/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}