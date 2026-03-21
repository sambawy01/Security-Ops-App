import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, MapPin, Clock, Shield } from 'lucide-react';
import { useShifts } from '../../hooks/useShifts';
import { useZones } from '../../hooks/useZones';
import { Select } from '../ui/select';
import { cn } from '../../lib/utils';

/** Format a date as YYYY-MM-DD */
function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Format time as HH:MM */
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Get start of the week (Sunday) */
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Format week range label */
function weekLabel(start: Date, locale: string): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
  return `${fmt.format(start)} - ${fmt.format(end)}, ${end.getFullYear()}`;
}

/** Determine SOP type from shift hours */
function getShiftSOP(scheduledStart: string, scheduledEnd: string, isAr: boolean): string {
  const startHour = new Date(scheduledStart).getHours();
  const endHour = new Date(scheduledEnd).getHours();
  if (startHour >= 5 && startHour <= 8 && endHour >= 16 && endHour <= 20) return isAr ? 'وردية نهارية' : 'Day Shift';
  if (startHour >= 17 || startHour <= 1) return isAr ? 'وردية ليلية' : 'Night Shift';
  return isAr ? 'مخصص' : 'Custom';
}

interface ShiftData {
  id: string;
  officerId: string;
  zoneId: string;
  status: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualCheckIn: string | null;
  actualCheckOut: string | null;
  handoverNotes: string | null;
  officer?: { nameEn: string; nameAr: string; badgeNumber: string };
  zone?: { nameEn: string; nameAr: string };
}

export function ShiftSchedule() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const [weekOffset, setWeekOffset] = useState(0);
  const [zoneFilter, setZoneFilter] = useState('');
  const [expandedShift, setExpandedShift] = useState<string | null>(null);

  /** Status styling */
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    active:     { bg: 'bg-green-100', text: 'text-green-800', label: t('shift.active') },
    completed:  { bg: 'bg-green-50',  text: 'text-green-700', label: t('shift.completed') },
    scheduled:  { bg: 'bg-blue-100',  text: 'text-blue-800',  label: t('shift.scheduled') },
    no_show:    { bg: 'bg-red-100',   text: 'text-red-800',   label: t('shift.noShow') },
    called_off: { bg: 'bg-slate-100', text: 'text-slate-500', label: t('shift.calledOff') },
  };

  const { data: zones } = useZones();
  const zoneOptions = useMemo(() => {
    const base = [{ value: '', label: isAr ? 'جميع المناطق' : 'All Zones' }];
    if (!zones) return base;
    return [...base, ...zones.map((z: any) => ({ value: z.id, label: isAr ? (z.nameAr || z.nameEn) : z.nameEn }))];
  }, [zones, isAr]);

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

  const shiftFilters = useMemo(
    () => ({
      from: toISO(weekStart),
      to: toISO(weekEnd),
      ...(zoneFilter ? { zoneId: zoneFilter } : {}),
    }),
    [weekStart, weekEnd, zoneFilter]
  );

  const { data: shifts, isLoading } = useShifts(shiftFilters);
  const shiftList = (shifts ?? []) as ShiftData[];

  // Sort: active first, then by scheduled start
  const sortedShifts = useMemo(() => {
    return [...shiftList].sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;
      return new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime();
    });
  }, [shiftList]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w - 1)}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            aria-label={isAr ? 'الأسبوع السابق' : 'Previous week'}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-slate-900 min-w-[180px] text-center">
            {weekLabel(weekStart, i18n.language)}
          </span>
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w + 1)}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            aria-label={isAr ? 'الأسبوع التالي' : 'Next week'}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {weekOffset !== 0 && (
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className="ml-1 text-xs text-slate-500 hover:text-slate-700 underline"
            >
              {isAr ? 'اليوم' : 'Today'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-mono">{sortedShifts.length} {isAr ? 'وردية' : 'shifts'}</span>
          <div className="w-48">
            <Select
              options={zoneOptions}
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              aria-label={isAr ? 'تصفية حسب المنطقة' : 'Filter by zone'}
            />
          </div>
        </div>
      </div>

      {/* Shift List */}
      <div className="divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 rounded bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : sortedShifts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Clock className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">{isAr ? 'لا توجد ورديات لهذه الفترة' : 'No shifts found for this period'}</p>
          </div>
        ) : (
          sortedShifts.map((shift) => {
            const sop = getShiftSOP(shift.scheduledStart, shift.scheduledEnd, isAr);
            const config = statusConfig[shift.status] ?? statusConfig.scheduled;
            const isExpanded = expandedShift === shift.id;
            const zoneName = isAr ? (shift.zone?.nameAr || shift.zone?.nameEn ?? (isAr ? 'منطقة غير معروفة' : 'Unknown Zone')) : (shift.zone?.nameEn ?? 'Unknown Zone');
            const officerName = isAr ? (shift.officer?.nameAr || shift.officer?.nameEn ?? (isAr ? 'غير معروف' : 'Unknown')) : (shift.officer?.nameEn ?? 'Unknown');
            const badge = shift.officer?.badgeNumber ?? '';
            const dateLocale = isAr ? 'ar-EG' : 'en-US';
            const date = new Date(shift.scheduledStart).toLocaleDateString(dateLocale, {
              weekday: 'short', month: 'short', day: 'numeric',
            });

            return (
              <div key={shift.id}>
                <button
                  type="button"
                  onClick={() => setExpandedShift(isExpanded ? null : shift.id)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Officer */}
                    <div className="min-w-[160px]">
                      <div className="text-sm font-medium text-slate-900">{officerName}</div>
                      <div className="text-xs text-slate-500 font-mono">{badge}</div>
                    </div>

                    {/* Location (Zone) */}
                    <div className="flex items-center gap-1.5 min-w-[120px]">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="text-sm text-slate-700">{zoneName}</span>
                    </div>

                    {/* Time */}
                    <div className="flex items-center gap-1.5 min-w-[130px]">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="text-sm text-slate-700 font-mono">
                        {formatTime(shift.scheduledStart)} – {formatTime(shift.scheduledEnd)}
                      </span>
                    </div>

                    {/* SOP */}
                    <div className="flex items-center gap-1.5 min-w-[100px]">
                      <Shield className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="text-sm text-slate-700">{sop}</span>
                    </div>

                    {/* Date */}
                    <div className="text-xs text-slate-500 min-w-[90px]">{date}</div>

                    {/* Status */}
                    <div className="ml-auto">
                      <span className={cn('inline-block rounded px-2 py-0.5 text-xs font-medium', config.bg, config.text)}>
                        {config.label}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 bg-slate-50/50 border-t border-slate-100">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <div className="text-slate-500 font-medium mb-1">{isAr ? 'الموقع' : 'LOCATION'}</div>
                        <div className="text-slate-900">{zoneName}</div>
                        <div className="text-slate-500">{isAr ? shift.zone?.nameEn : shift.zone?.nameAr}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 font-medium mb-1">{isAr ? 'الوقت المحدد' : 'SCHEDULED TIME'}</div>
                        <div className="text-slate-900 font-mono">
                          {formatTime(shift.scheduledStart)} – {formatTime(shift.scheduledEnd)}
                        </div>
                        <div className="text-slate-500">
                          {Math.round((new Date(shift.scheduledEnd).getTime() - new Date(shift.scheduledStart).getTime()) / 3600000)}{isAr ? 'س وردية' : 'h shift'}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 font-medium mb-1">{isAr ? 'نوع العملية' : 'SOP / TYPE'}</div>
                        <div className="text-slate-900">{sop}</div>
                        <div className="text-slate-500">
                          {sop === (isAr ? 'وردية نهارية' : 'Day Shift') ? (isAr ? 'دورية + بوابة + استجابة' : 'Patrol + Gate + Incident Response') :
                           sop === (isAr ? 'وردية ليلية' : 'Night Shift') ? (isAr ? 'دورية + محيط + طوارئ' : 'Patrol + Perimeter + Emergency Response') :
                           (isAr ? 'مهمة مخصصة' : 'Custom Assignment')}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 font-medium mb-1">{isAr ? 'الحضور / الانصراف' : 'CHECK-IN / CHECK-OUT'}</div>
                        <div className="text-slate-900">
                          {shift.actualCheckIn ? (
                            <span className="text-green-700">{isAr ? 'حضور:' : 'In:'} {formatTime(shift.actualCheckIn)}</span>
                          ) : (
                            <span className="text-amber-600">{isAr ? 'لم يسجل حضور' : 'Not checked in'}</span>
                          )}
                        </div>
                        <div className="text-slate-900">
                          {shift.actualCheckOut ? (
                            <span className="text-green-700">{isAr ? 'انصراف:' : 'Out:'} {formatTime(shift.actualCheckOut)}</span>
                          ) : shift.status === 'active' ? (
                            <span className="text-blue-600">{isAr ? 'في الخدمة حالياً' : 'Currently on duty'}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {shift.handoverNotes && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <div className="text-xs text-slate-500 font-medium mb-1">{isAr ? 'ملاحظات التسليم' : 'HANDOVER NOTES'}</div>
                        <div className="text-xs text-slate-700 bg-white rounded p-2 border border-slate-200">
                          {shift.handoverNotes}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
