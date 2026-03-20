import { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

interface SlaTimerProps {
  deadline: string | null;
  label?: string;
}

function getTimeRemaining(deadline: string) {
  const now = Date.now();
  const end = new Date(deadline).getTime();
  return end - now;
}

function formatRemaining(ms: number): string {
  const absSec = Math.floor(Math.abs(ms) / 1000);
  const hours = Math.floor(absSec / 3600);
  const minutes = Math.floor((absSec % 3600) / 60);
  const seconds = absSec % 60;

  if (ms < 0) {
    if (hours > 0) return `OVERDUE +${hours}h ${minutes}m`;
    return `OVERDUE +${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function getColorClass(remainingMs: number, deadline: string, createdEstimate?: string): string {
  if (remainingMs <= 0) return 'sla-breached';

  // Estimate total SLA duration: assume the SLA was set relative to "now minus remaining"
  // We approximate original SLA as 2x the deadline distance from now at 50%
  // Better: use the ratio of remaining to total (deadline - creation)
  const totalMs = new Date(deadline).getTime() - (Date.now() - remainingMs - remainingMs);
  const pct = totalMs > 0 ? remainingMs / (remainingMs + (Date.now() - (new Date(deadline).getTime() - remainingMs - remainingMs))) : 0;

  // Simpler approach: estimate original SLA as 2 * (time from now to deadline when at 50%)
  // Since we don't have createdAt, use a heuristic: map absolute time to colors
  // Actually let's just use fixed thresholds that make practical sense for security ops
  const remainingMin = remainingMs / 60000;

  if (remainingMin > 60) return 'sla-green';
  if (remainingMin > 15) return 'sla-yellow';
  return 'sla-red';
}

export function SlaTimer({ deadline, label }: SlaTimerProps) {
  const [remaining, setRemaining] = useState<number | null>(
    deadline ? getTimeRemaining(deadline) : null
  );

  useEffect(() => {
    if (!deadline) return;

    setRemaining(getTimeRemaining(deadline));

    const interval = setInterval(() => {
      setRemaining(getTimeRemaining(deadline));
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  if (!deadline || remaining === null) {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-400">
        {label && <span className="text-slate-500">{label}</span>}
        <span>&mdash;</span>
      </span>
    );
  }

  const isBreached = remaining <= 0;
  const remainingMin = remaining / 60000;
  const isGreen = remainingMin > 60;
  const isYellow = remainingMin > 15 && remainingMin <= 60;
  const isRed = remainingMin > 0 && remainingMin <= 15;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-xs font-semibold transition-colors',
        isGreen && 'bg-green-100 text-green-800 border border-green-200',
        isYellow && 'bg-yellow-100 text-yellow-800 border border-yellow-200',
        isRed && 'bg-red-100 text-red-800 border border-red-200',
        isBreached && 'bg-red-600 text-white border border-red-700 animate-pulse'
      )}
      role="timer"
      aria-label={label ? `${label}: ${formatRemaining(remaining)}` : formatRemaining(remaining)}
    >
      {label && <span className="font-sans font-medium opacity-80">{label}</span>}
      <span>{formatRemaining(remaining)}</span>
    </span>
  );
}
