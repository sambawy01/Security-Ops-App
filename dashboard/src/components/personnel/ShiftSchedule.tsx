import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useShifts } from '../../hooks/useShifts';
import { useOfficers } from '../../hooks/useOfficers';
import { useZones } from '../../hooks/useZones';
import { Select } from '../ui/select';
import { cn } from '../../lib/utils';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Get start of the week (Sunday) for a given date */
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Format a date as YYYY-MM-DD */
function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Format week range label */
function weekLabel(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  return `${fmt.format(start)} - ${fmt.format(end)}, ${end.getFullYear()}`;
}

/** Determine shift type label from scheduled start hour */
function shiftType(scheduledStart: string): string {
  const hour = new Date(scheduledStart).getHours();
  return hour >= 6 && hour < 18 ? 'Day' : 'Night';
}

/** Shift status to cell styling */
const statusCellClass: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
  scheduled: 'bg-blue-100 text-blue-800',
  no_show: 'bg-red-100 text-red-800',
  called_off: 'bg-slate-100 text-slate-500',
};

const statusCellLabel: Record<string, string> = {
  no_show: 'No Show',
  called_off: 'Called Off',
};

export function ShiftSchedule() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [zoneFilter, setZoneFilter] = useState('');

  const { data: zones } = useZones();
  const zoneOptions = useMemo(() => {
    const base = [{ value: '', label: 'All Zones' }];
    if (!zones) return base;
    return [...base, ...zones.map((z) => ({ value: z.id, label: z.nameEn }))];
  }, [zones]);

  // Compute week boundaries
  const weekStart = useMemo(() => {
    const now = new Date();
    const ws = startOfWeek(now);
    ws.setDate(ws.getDate() + weekOffset * 7);
    return ws;
  }, [weekOffset]);

  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);
    return end;
  }, [weekStart]);

  // Fetch shifts for the week
  const shiftFilters = useMemo(
    () => ({
      from: toISO(weekStart),
      to: toISO(weekEnd),
      ...(zoneFilter ? { zoneId: zoneFilter } : {}),
    }),
    [weekStart, weekEnd, zoneFilter]
  );

  const { data: shifts, isLoading: shiftsLoading } = useShifts(shiftFilters);

  // Fetch officers to resolve names
  const officerFilters = useMemo(
    () => (zoneFilter ? { zoneId: zoneFilter } : undefined),
    [zoneFilter]
  );
  const { data: officers } = useOfficers(officerFilters);

  // Build a lookup: officerId -> name
  const officerMap = useMemo(() => {
    const m = new Map<string, string>();
    officers?.forEach((o) => m.set(o.id, o.nameEn));
    return m;
  }, [officers]);

  // Build the week days array (Date objects for Sun-Sat)
  const weekDays = useMemo(() => {
    return DAYS.map((_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  // Today's day index (0=Sun)
  const todayIndex = useMemo(() => {
    const now = new Date();
    const thisWeekStart = startOfWeek(now);
    if (weekStart.getTime() === thisWeekStart.getTime()) {
      return now.getDay();
    }
    return -1; // not this week
  }, [weekStart]);

  // Build grid: officerId -> dayIndex -> shift
  const grid = useMemo(() => {
    const m = new Map<string, Map<number, { label: string; status: string }>>();
    if (!shifts) return m;

    for (const s of shifts) {
      const date = new Date(s.scheduledStart);
      const dayIdx = date.getDay();
      if (!m.has(s.officerId)) m.set(s.officerId, new Map());
      m.get(s.officerId)!.set(dayIdx, {
        label: statusCellLabel[s.status] ?? shiftType(s.scheduledStart),
        status: s.status,
      });
    }
    return m;
  }, [shifts]);

  // Sorted officer IDs for the grid
  const officerIds = useMemo(() => {
    return Array.from(grid.keys()).sort((a, b) => {
      const nameA = officerMap.get(a) ?? a;
      const nameB = officerMap.get(b) ?? b;
      return nameA.localeCompare(nameB);
    });
  }, [grid, officerMap]);

  /** Abbreviate name: "Ahmed Mahmoud" -> "Ahmed M." */
  function abbreviate(name: string): string {
    const parts = name.split(' ');
    if (parts.length <= 1) return name;
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w - 1)}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-slate-900 min-w-[180px] text-center">
            {weekLabel(weekStart)}
          </span>
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w + 1)}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {weekOffset !== 0 && (
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className="ml-1 text-xs text-slate-500 hover:text-slate-700 underline"
            >
              Today
            </button>
          )}
        </div>

        <div className="w-48">
          <Select
            options={zoneOptions}
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            aria-label="Filter by zone"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {shiftsLoading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : officerIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-slate-500">No shifts found for this week</p>
          </div>
        ) : (
          <table className="w-full text-sm" role="grid">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-2.5 font-semibold text-slate-700 whitespace-nowrap min-w-[140px]">
                  Officer
                </th>
                {DAYS.map((day, i) => (
                  <th
                    key={day}
                    className={cn(
                      'px-3 py-2.5 text-center font-semibold text-slate-700 whitespace-nowrap min-w-[70px]',
                      i === todayIndex && 'bg-blue-50 text-blue-800'
                    )}
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {officerIds.map((officerId) => {
                const name = officerMap.get(officerId) ?? officerId.slice(0, 8);
                const row = grid.get(officerId)!;
                return (
                  <tr
                    key={officerId}
                    className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-900 whitespace-nowrap">
                      {abbreviate(name)}
                    </td>
                    {DAYS.map((day, i) => {
                      const cell = row.get(i);
                      return (
                        <td
                          key={day}
                          className={cn(
                            'px-3 py-2.5 text-center whitespace-nowrap',
                            i === todayIndex && 'bg-blue-50/40'
                          )}
                        >
                          {cell ? (
                            <span
                              className={cn(
                                'inline-block rounded px-2 py-0.5 text-xs font-medium',
                                statusCellClass[cell.status] ?? 'bg-slate-100 text-slate-500'
                              )}
                            >
                              {cell.label}
                            </span>
                          ) : (
                            <span className="text-slate-300">&mdash;</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
