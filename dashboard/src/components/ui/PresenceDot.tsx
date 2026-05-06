import { cn } from '../../lib/utils';

/**
 * Presence dot for officers — driven by the heartbeat that the auth plugin
 * writes to officers.last_seen_at. NOT the same as Shift.status (which is
 * "is this scheduled shift currently in its window") or Officer.status
 * (which is "is the account active vs suspended"). This says: have we heard
 * from this person's app in the last few minutes.
 *
 *   online (green): seen within ONLINE_MS
 *   idle  (amber): seen within IDLE_MS
 *   offline (grey): never seen, or older than IDLE_MS
 *
 * Mobile heartbeats every 60s, so a 2-min online window absorbs one missed
 * beat.
 */

const ONLINE_MS = 2 * 60_000;
const IDLE_MS = 15 * 60_000;

export type Presence = 'online' | 'idle' | 'offline';

export function getPresence(lastSeenAt: string | null | undefined, now: number = Date.now()): Presence {
  if (!lastSeenAt) return 'offline';
  const diff = now - new Date(lastSeenAt).getTime();
  if (diff < 0) return 'online'; // clock skew safety
  if (diff <= ONLINE_MS) return 'online';
  if (diff <= IDLE_MS) return 'idle';
  return 'offline';
}

export function presenceLabel(p: Presence, isAr: boolean, lastSeenAt: string | null | undefined): string {
  if (p === 'online') return isAr ? 'متصل' : 'Online';
  if (p === 'idle') return isAr ? 'خامل' : 'Idle';
  if (lastSeenAt) {
    const mins = Math.round((Date.now() - new Date(lastSeenAt).getTime()) / 60000);
    if (mins < 60) return isAr ? `قبل ${mins} د` : `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return isAr ? `قبل ${hrs} س` : `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    return isAr ? `قبل ${days} ي` : `${days}d ago`;
  }
  return isAr ? 'غير متصل' : 'Offline';
}

interface PresenceDotProps {
  lastSeenAt: string | null | undefined;
  isAr?: boolean;
  className?: string;
  showLabel?: boolean;
}

export function PresenceDot({ lastSeenAt, isAr = false, className, showLabel = false }: PresenceDotProps) {
  const presence = getPresence(lastSeenAt);
  const label = presenceLabel(presence, isAr, lastSeenAt);
  const dot = cn(
    'inline-block h-2 w-2 rounded-full flex-shrink-0',
    presence === 'online' && 'bg-green-500 ring-2 ring-green-200',
    presence === 'idle' && 'bg-amber-400',
    presence === 'offline' && 'bg-slate-300',
  );

  if (!showLabel) {
    return <span className={cn(dot, className)} title={label} aria-label={label} />;
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={dot} aria-hidden />
      <span className="text-xs text-slate-500">{label}</span>
    </span>
  );
}
