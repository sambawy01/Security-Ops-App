import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Clock, Megaphone, Radio, X } from 'lucide-react';
import { useBroadcasts, useAckBroadcast, type Broadcast } from '../hooks/useBroadcasts';
import { cn } from '../lib/utils';

const priorityConfig: Record<Broadcast['priority'], { bg: string; ring: string; text: string; icon: typeof AlertTriangle; en: string; ar: string }> = {
  emergency: { bg: 'bg-red-50',    ring: 'ring-red-500',    text: 'text-red-700',    icon: AlertTriangle, en: 'EMERGENCY', ar: 'طوارئ' },
  urgent:    { bg: 'bg-orange-50', ring: 'ring-orange-500', text: 'text-orange-700', icon: Clock,         en: 'URGENT',    ar: 'عاجل'  },
  normal:    { bg: 'bg-blue-50',   ring: 'ring-blue-500',   text: 'text-blue-700',   icon: Megaphone,     en: 'BROADCAST', ar: 'إعلان' },
  info:      { bg: 'bg-slate-50',  ring: 'ring-slate-500',  text: 'text-slate-700',  icon: Radio,         en: 'INFO',      ar: 'معلومات'},
};

/**
 * Polls /api/v1/broadcasts and pops a blocking modal for any unacked one
 * targeted at the caller. Click "Acknowledged" to dismiss — the ack is
 * recorded server-side so the same broadcast never re-pops on this account.
 *
 * Intended use: mounted once at the top of <Layout/> so it appears on every
 * authenticated page.
 */
export function BroadcastListener() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const { data: broadcasts } = useBroadcasts();
  const ackMutation = useAckBroadcast();

  // Show the oldest unacked broadcast first (FIFO) so emergency instructions
  // queued earlier surface before later ones.
  const unacked = useMemo(() => {
    if (!broadcasts) return [];
    return [...broadcasts]
      .filter((b) => !b.ackedAt)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [broadcasts]);

  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const current = unacked[0];

  if (!current || dismissingId === current.id) return null;

  const cfg = priorityConfig[current.priority] ?? priorityConfig.normal;
  const Icon = cfg.icon;

  const onAck = () => {
    setDismissingId(current.id);
    ackMutation.mutate(current.id, {
      onSettled: () => setDismissingId((id) => (id === current.id ? null : id)),
    });
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
         dir={isAr ? 'rtl' : 'ltr'}>
      <div className={cn('w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-4 overflow-hidden', cfg.ring)}>
        <div className={cn('px-6 py-4 flex items-center gap-3', cfg.bg)}>
          <Icon className={cn('h-6 w-6', cfg.text)} />
          <span className={cn('text-xs font-bold uppercase tracking-wider', cfg.text)}>
            {isAr ? cfg.ar : cfg.en}
          </span>
          {current.sender && (
            <span className="ms-auto text-xs text-slate-500">
              {isAr ? 'من:' : 'From:'} {isAr ? current.sender.nameAr : current.sender.nameEn} · {current.sender.badgeNumber}
            </span>
          )}
        </div>
        <div className="px-6 py-6">
          <p className={cn('text-lg font-medium leading-relaxed whitespace-pre-wrap', cfg.text)}>
            {current.priority === 'emergency' && '🚨 '}
            {current.priority === 'urgent' && '⚠️ '}
            {current.message}
          </p>
          <div className="text-xs text-slate-400 mt-3">
            {new Date(current.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onAck}
            disabled={ackMutation.isPending}
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-50',
              current.priority === 'emergency' ? 'bg-red-600 hover:bg-red-700'
                : current.priority === 'urgent' ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-slate-900 hover:bg-slate-800',
            )}
          >
            <X className="h-4 w-4" />
            {isAr ? 'تم الاطلاع' : 'Acknowledged'}
          </button>
        </div>
      </div>
    </div>
  );
}
