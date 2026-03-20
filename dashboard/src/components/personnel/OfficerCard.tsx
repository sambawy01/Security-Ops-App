import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import type { Officer } from '../../types';

interface OfficerCardProps {
  officer: Officer;
}

const statusDot: Record<string, string> = {
  active: 'bg-green-500',
  device_offline: 'bg-yellow-500',
  off_duty: 'bg-slate-400',
  suspended: 'bg-red-500',
};

const statusLabel: Record<string, string> = {
  active: 'Active',
  device_offline: 'Device Offline',
  off_duty: 'Off Duty',
  suspended: 'Suspended',
};

const roleLabel: Record<string, string> = {
  officer: 'Officer',
  supervisor: 'Supervisor',
  commander: 'Commander',
  dispatcher: 'Dispatcher',
  analyst: 'Analyst',
  admin: 'Admin',
  trainee: 'Trainee',
};

export function OfficerCard({ officer }: OfficerCardProps) {
  const dot = statusDot[officer.status] ?? 'bg-slate-400';
  const count = (officer as any)._count?.incidents ?? null;

  return (
    <div
      className={cn(
        'w-full bg-white border border-slate-200 rounded-lg px-4 py-3 transition-all duration-150',
        'hover:border-slate-300 hover:shadow-sm'
      )}
      role="row"
      aria-label={`Officer ${officer.nameEn}, status ${statusLabel[officer.status] ?? officer.status}`}
    >
      <div className="flex items-center gap-3">
        {/* Status dot */}
        <span
          className={cn('h-2.5 w-2.5 flex-shrink-0 rounded-full', dot)}
          aria-label={`Status: ${statusLabel[officer.status] ?? officer.status}`}
        />

        {/* Name */}
        <span className="text-sm font-medium text-slate-900 min-w-0 truncate">
          {officer.nameEn}
        </span>

        {/* Badge number */}
        <span className="text-xs font-mono text-slate-500 flex-shrink-0">
          {officer.badgeNumber}
        </span>

        {/* Role badge */}
        <Badge variant="default" className="flex-shrink-0">
          {roleLabel[officer.role] ?? officer.role}
        </Badge>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Active incident count */}
        {count !== null && count > 0 && (
          <span className="text-xs text-slate-500">
            {count} active incident{count !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
