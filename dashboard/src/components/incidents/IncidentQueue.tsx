import { useState, useMemo, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { useIncidents } from '../../hooks/useIncidents';
import { useZones } from '../../hooks/useZones';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Badge } from '../ui/badge';
import { IncidentCard } from './IncidentCard';
import type { Incident } from '../../types';

interface IncidentQueueProps {
  onSelectIncident: (id: string) => void;
  selectedId?: string | null;
}

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'resolved', label: 'Resolved' },
];

const priorityOptions = [
  { value: '', label: 'All Priorities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const priorityOrder: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function IncidentQueue({ onSelectIncident, selectedId }: IncidentQueueProps) {
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');

  const debouncedSearch = useDebounce(searchInput, 300);

  const filters = useMemo(
    () => ({
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(priorityFilter ? { priority: priorityFilter } : {}),
      ...(zoneFilter ? { zoneId: zoneFilter } : {}),
    }),
    [debouncedSearch, statusFilter, priorityFilter, zoneFilter]
  );

  const { data: incidents, isLoading } = useIncidents(filters);
  const { data: zones } = useZones();

  const zoneOptions = useMemo(() => {
    const base = [{ value: '', label: 'All Zones' }];
    if (!zones) return base;
    return [
      ...base,
      ...zones.map((z) => ({ value: z.id, label: z.nameEn })),
    ];
  }, [zones]);

  const sortedIncidents = useMemo(() => {
    if (!incidents) return [];
    return [...incidents].sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 99;
      const pb = priorityOrder[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [incidents]);

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="space-y-3 border-b border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            Incident Queue
          </h2>
          {incidents && (
            <Badge variant="default">
              {incidents.length} incident{incidents.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search incidents..."
            className="flex h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1"
            aria-label="Search incidents"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          />
          <Select
            options={priorityOptions}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Filter by priority"
          />
          <Select
            options={zoneOptions}
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            aria-label="Filter by zone"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-lg bg-slate-100 animate-pulse"
              />
            ))}
          </div>
        )}

        {!isLoading && sortedIncidents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-slate-500">
              No incidents match your filters
            </p>
          </div>
        )}

        {!isLoading &&
          sortedIncidents.map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              onClick={() => onSelectIncident(incident.id)}
              selected={incident.id === selectedId}
            />
          ))}
      </div>
    </div>
  );
}
