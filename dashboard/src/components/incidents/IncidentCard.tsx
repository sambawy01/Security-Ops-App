import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { SlaTimer } from './SlaTimer';
import type { Incident } from '../../types';

interface IncidentCardProps {
  incident: Incident;
  onClick: () => void;
  selected?: boolean;
}

const priorityDot: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
};

const priorityVariant: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
};

const statusLabel: Record<string, string> = {
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  escalated: 'Escalated',
  resolved: 'Resolved',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

export function IncidentCard({ incident, onClick, selected }: IncidentCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left bg-white border rounded-lg p-4 transition-all duration-150 cursor-pointer',
        'hover:border-slate-300 hover:shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1',
        selected
          ? 'border-blue-500 bg-blue-50/50 shadow-sm'
          : 'border-slate-200'
      )}
      aria-pressed={selected}
      aria-label={`Incident: ${incident.title}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <span
            className={cn(
              'mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full',
              priorityDot[incident.priority] ?? 'bg-slate-400'
            )}
            aria-label={`Priority: ${incident.priority}`}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 truncate">
              {incident.title}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              {incident.zoneId && (
                <span className="font-mono">Zone: {incident.zoneId.slice(0, 8)}</span>
              )}
              <span className="text-slate-300">&middot;</span>
              <span>
                {incident.assignedOfficerId
                  ? `Officer: ${incident.assignedOfficerId.slice(0, 8)}`
                  : <span className="text-slate-400 italic">Unassigned</span>}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <Badge variant={priorityVariant[incident.priority] ?? 'default'}>
            {statusLabel[incident.status] ?? incident.status}
          </Badge>
          <SlaTimer deadline={incident.slaResolutionDeadline} />
        </div>
      </div>
    </button>
  );
}
