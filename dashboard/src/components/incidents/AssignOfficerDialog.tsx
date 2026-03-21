import { useTranslation } from 'react-i18next';
import { Dialog, DialogTitle, DialogContent } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { useOfficers } from '../../hooks/useOfficers';
import { useAssignIncident } from '../../hooks/useIncidents';
import { cn } from '../../lib/utils';
import { Loader2, User } from 'lucide-react';

interface AssignOfficerDialogProps {
  open: boolean;
  onClose: () => void;
  incidentId: string;
  zoneId: string | null;
}

const statusVariant: Record<string, 'success' | 'default' | 'medium'> = {
  on_duty: 'success',
  available: 'success',
  off_duty: 'default',
  busy: 'medium',
};

const statusLabelEn: Record<string, string> = {
  on_duty: 'On Duty',
  available: 'Available',
  off_duty: 'Off Duty',
  busy: 'Busy',
  active: 'Active',
  device_offline: 'Device Offline',
  suspended: 'Suspended',
};

const statusLabelAr: Record<string, string> = {
  on_duty: 'في الخدمة',
  available: 'متاح',
  off_duty: 'خارج الخدمة',
  busy: 'مشغول',
  active: 'نشط',
  device_offline: 'الجهاز غير متصل',
  suspended: 'موقوف',
};

export function AssignOfficerDialog({
  open,
  onClose,
  incidentId,
  zoneId,
}: AssignOfficerDialogProps) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const filters = zoneId ? { zoneId } : undefined;
  const { data: officers, isLoading: loadingOfficers } = useOfficers(filters);
  const assignMutation = useAssignIncident();

  const statusLabel = isAr ? statusLabelAr : statusLabelEn;

  const sortedOfficers = officers
    ? [...officers].sort((a, b) => {
        // Sort by status (on_duty first), then alphabetically
        const statusOrder: Record<string, number> = {
          on_duty: 0,
          available: 1,
          busy: 2,
          off_duty: 3,
        };
        const sa = statusOrder[a.status] ?? 99;
        const sb = statusOrder[b.status] ?? 99;
        if (sa !== sb) return sa - sb;
        return a.nameEn.localeCompare(b.nameEn);
      })
    : [];

  const handleAssign = (officerId: string) => {
    assignMutation.mutate(
      { incidentId, officerId },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{isAr ? 'تعيين ضابط' : 'Assign Officer'}</DialogTitle>
      <DialogContent>
        {loadingOfficers && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        )}

        {!loadingOfficers && sortedOfficers.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            {isAr
              ? (zoneId ? 'لا يوجد ضباط متاحين في هذه المنطقة' : 'لا يوجد ضباط متاحين')
              : (zoneId ? 'No officers available in this zone' : 'No officers available')}
          </p>
        )}

        {!loadingOfficers && sortedOfficers.length > 0 && (
          <div className="max-h-80 overflow-y-auto -mx-2 space-y-1">
            {sortedOfficers.map((officer) => (
              <button
                key={officer.id}
                type="button"
                onClick={() => handleAssign(officer.id)}
                disabled={assignMutation.isPending}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                  'hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400',
                  'disabled:opacity-50 disabled:pointer-events-none'
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 flex-shrink-0">
                  <User className="h-4 w-4 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {isAr ? ((officer as any).nameAr || officer.nameEn) : officer.nameEn}
                  </p>
                  <p className="text-xs text-slate-500 font-mono">
                    {isAr ? 'الشارة:' : 'Badge:'} {officer.badgeNumber}
                  </p>
                </div>
                <Badge variant={statusVariant[officer.status] ?? 'default'}>
                  {statusLabel[officer.status] ?? officer.status.replace('_', ' ')}
                </Badge>
              </button>
            ))}
          </div>
        )}

        {assignMutation.isPending && (
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{isAr ? 'جاري تعيين الضابط...' : 'Assigning officer...'}</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
