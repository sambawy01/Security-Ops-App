import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit3, Trash2, Clock, MapPin, User, AlertCircle, Calendar } from 'lucide-react';
import { useShifts } from '../../hooks/useShifts';
import { useZones } from '../../hooks/useZones';
import { useOfficers } from '../../hooks/useOfficers';
import {
  useCreateShift,
  useUpdateShift,
  useDeleteShift,
  useChangeShiftStatus,
} from '../../hooks/useShiftMutations';
import { Select } from '../ui/select';
import { Dialog, DialogTitle, DialogContent } from '../ui/dialog';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

/* eslint-disable @typescript-eslint/no-explicit-any */

function toLocalDateTimeInput(date: Date): string {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
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
  isOvertime: boolean;
  officer?: { nameEn: string; nameAr: string; badgeNumber: string };
  zone?: { nameEn: string; nameAr: string };
}

interface ShiftFormState {
  officerId: string;
  zoneId: string;
  scheduledStart: string;
  scheduledEnd: string;
  isOvertime: boolean;
}

const EMPTY_FORM: ShiftFormState = {
  officerId: '',
  zoneId: '',
  scheduledStart: '',
  scheduledEnd: '',
  isOvertime: false,
};

/** Generate a default shift form with sensible defaults: today 08:00 → 16:00 */
function defaultShiftForm(): ShiftFormState {
  const now = new Date();
  // Default: today at 08:00 → 16:00 (a standard day shift)
  const start = new Date(now);
  start.setHours(8, 0, 0, 0);
  const end = new Date(now);
  end.setHours(16, 0, 0, 0);
  return {
    officerId: '',
    zoneId: '',
    scheduledStart: toLocalDateTimeInput(start),
    scheduledEnd: toLocalDateTimeInput(end),
    isOvertime: false,
  };
}

export function WorkforceManagement() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [weekOffset, setWeekOffset] = useState(0);
  const [zoneFilter, setZoneFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftData | null>(null);
  const [form, setForm] = useState<ShiftFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  // Mutations
  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const deleteShift = useDeleteShift();
  const changeStatus = useChangeShiftStatus();

  // Data
  const { data: zones } = useZones();
  const { data: officers } = useOfficers();
  const zoneList = (Array.isArray(zones) ? zones : []) as any[];

  // Date range
  const weekStart = useMemo(() => {
    const now = new Date();
    const ws = new Date(now);
    ws.setDate(ws.getDate() - ws.getDay());
    ws.setHours(0, 0, 0, 0);
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
      from: weekStart.toISOString().slice(0, 10),
      to: weekEnd.toISOString().slice(0, 10),
      ...(zoneFilter ? { zoneId: zoneFilter } : {}),
    }),
    [weekStart, weekEnd, zoneFilter],
  );

  const { data: shifts, isLoading } = useShifts(shiftFilters);
  const shiftList = ((shifts ?? []) as ShiftData[]);

  const officerList = (Array.isArray(officers) ? officers : []) as any[];

  // Group shifts by day
  const shiftsByDay = useMemo(() => {
    const groups: Record<string, ShiftData[]> = {};
    for (const s of shiftList) {
      const day = new Date(s.scheduledStart).toLocaleDateString('en-CA');
      if (!groups[day]) groups[day] = [];
      groups[day].push(s);
    }
    return groups;
  }, [shiftList]);

  // Manpower summary per zone
  const manpowerByZone = useMemo(() => {
    const map: Record<string, { total: number; scheduled: number; active: number; completed: number; noShow: number }> = {};
    for (const s of shiftList) {
      if (!map[s.zoneId]) map[s.zoneId] = { total: 0, scheduled: 0, active: 0, completed: 0, noShow: 0 };
      map[s.zoneId].total++;
      if (s.status === 'scheduled') map[s.zoneId].scheduled++;
      if (s.status === 'active') map[s.zoneId].active++;
      if (s.status === 'completed') map[s.zoneId].completed++;
      if (s.status === 'no_show') map[s.zoneId].noShow++;
    }
    return map;
  }, [shiftList]);

  const weekLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return `${fmt.format(weekStart)} - ${fmt.format(end)}, ${end.getFullYear()}`;
  }, [weekStart, isAr]);

  // Dialog handlers
  const openCreate = () => {
    setEditingShift(null);
    setForm(defaultShiftForm());
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (shift: ShiftData) => {
    setEditingShift(shift);
    setForm({
      officerId: shift.officerId,
      zoneId: shift.zoneId,
      scheduledStart: toLocalDateTimeInput(new Date(shift.scheduledStart)),
      scheduledEnd: toLocalDateTimeInput(new Date(shift.scheduledEnd)),
      isOvertime: shift.isOvertime,
    });
    setFormError('');
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!form.officerId) return setFormError(isAr ? 'اختر ضابطاً' : 'Select an officer');
    if (!form.zoneId) return setFormError(isAr ? 'اختر منطقة' : 'Select a zone');
    if (!form.scheduledStart || !form.scheduledEnd) return setFormError(isAr ? 'حدد وقت البداية والنهاية' : 'Set start and end times');

    const start = new Date(form.scheduledStart);
    const end = new Date(form.scheduledEnd);
    if (end <= start) return setFormError(isAr ? 'وقت النهاية يجب أن يكون بعد البداية' : 'End time must be after start time');

    try {
      if (editingShift) {
        await updateShift.mutateAsync({
          id: editingShift.id,
          officerId: form.officerId,
          zoneId: form.zoneId,
          scheduledStart: start.toISOString(),
          scheduledEnd: end.toISOString(),
          isOvertime: form.isOvertime,
        });
      } else {
        await createShift.mutateAsync({
          officerId: form.officerId,
          zoneId: form.zoneId,
          scheduledStart: start.toISOString(),
          scheduledEnd: end.toISOString(),
          isOvertime: form.isOvertime,
        });
      }
      setDialogOpen(false);
    } catch (e: any) {
      setFormError(e?.message || (isAr ? 'خطأ في الحفظ' : 'Save failed'));
    }
  };

  const handleDelete = async (shift: ShiftData) => {
    if (!confirm(isAr ? `حذف وردية ${shift.officer?.nameEn}?` : `Delete shift for ${shift.officer?.nameEn}?`)) return;
    try {
      await deleteShift.mutateAsync(shift.id);
    } catch (e: any) {
      alert(e?.message || (isAr ? 'خطأ في الحذف' : 'Delete failed'));
    }
  };

  const handleStatusChange = async (shift: ShiftData, status: 'called_off' | 'no_show') => {
    try {
      await changeStatus.mutateAsync({ id: shift.id, status });
    } catch (e: any) {
      alert(e?.message || 'Failed');
    }
  };

  const zoneOptions = useMemo(() => {
    const base = [{ value: '', label: isAr ? 'جميع المناطق' : 'All Zones' }];
    return [...base, ...zoneList.map((z) => ({ value: z.id, label: isAr ? (z.nameAr || z.nameEn) : z.nameEn }))];
  }, [zoneList, isAr]);

  const officerOptions = useMemo(() => {
    return officerList.map((o) => ({
      value: o.id,
      label: `${isAr ? (o.nameAr || o.nameEn) : o.nameEn} (${o.badgeNumber})`,
    }));
  }, [officerList, isAr]);

  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: 'bg-green-100', text: 'text-green-800', label: t('shift.active') },
    completed: { bg: 'bg-green-50', text: 'text-green-700', label: t('shift.completed') },
    scheduled: { bg: 'bg-blue-100', text: 'text-blue-800', label: t('shift.scheduled') },
    no_show: { bg: 'bg-red-100', text: 'text-red-800', label: t('shift.noShow') },
    called_off: { bg: 'bg-slate-100', text: 'text-slate-500', label: t('shift.calledOff') },
  };

  // Sorted days
  const sortedDays = Object.keys(shiftsByDay).sort();

  return (
    <div className="space-y-6">
      {/* Manpower Summary Cards */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <User className="h-4 w-4" />
          {isAr ? 'ملخص القوى العاملة' : 'Manpower Summary'}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {zoneList.map((zone) => {
            const mp = manpowerByZone[zone.id] || { total: 0, scheduled: 0, active: 0, completed: 0, noShow: 0 };
            return (
              <div key={zone.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: zone.color }} />
                  <span className="text-xs font-medium text-slate-700 truncate">{isAr ? (zone.nameAr || zone.nameEn) : zone.nameEn}</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">{mp.total}</div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {isAr ? 'إجمالي الورديات' : 'total shifts'}
                </div>
                <div className="flex gap-2 mt-2 text-[10px]">
                  <span className="text-blue-600">{mp.scheduled} {isAr ? 'مجدول' : 'sched'}</span>
                  <span className="text-green-600">{mp.active} {isAr ? 'نشط' : 'active'}</span>
                  {mp.noShow > 0 && <span className="text-red-600">{mp.noShow} {isAr ? 'غياب' : 'no-show'}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shift Schedule with Create/Edit */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w - 1)}
              className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              aria-label={isAr ? 'الأسبوع السابق' : 'Previous week'}
            >
              {isAr ? '→' : '←'}
            </button>
            <span className="text-sm font-medium text-slate-900 min-w-[180px] text-center">{weekLabel}</span>
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w + 1)}
              className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              aria-label={isAr ? 'الأسبوع التالي' : 'Next week'}
            >
              {isAr ? '←' : '→'}
            </button>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)} className="ml-1 text-xs text-slate-500 hover:text-slate-700 underline">
                {isAr ? 'اليوم' : 'Today'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="w-48">
              <Select options={zoneOptions} value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} />
            </div>
            <Button onClick={openCreate} variant="default" size="sm">
              <Plus className="h-4 w-4" />
              {isAr ? 'وردية جديدة' : 'New Shift'}
            </Button>
          </div>
        </div>

        {/* Day-grouped shift list */}
        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 rounded bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : shiftList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Clock className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">{isAr ? 'لا توجد ورديات لهذه الفترة' : 'No shifts found for this period'}</p>
            </div>
          ) : (
            sortedDays.map((day) => {
              const dayShifts = shiftsByDay[day];
              const dayLabel = new Date(day).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' });
              return (
                <div key={day}>
                  {/* Day header */}
                  <div className="px-4 py-2 bg-slate-50/80 flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600">{dayLabel}</span>
                    <span className="text-[10px] text-slate-400">({dayShifts.length} {isAr ? 'وردية' : 'shifts'})</span>
                  </div>
                  {/* Shifts for this day */}
                  {dayShifts.map((shift) => {
                    const config = statusConfig[shift.status] ?? statusConfig.scheduled;
                    const zoneName = isAr ? (shift.zone?.nameAr || shift.zone?.nameEn || '—') : (shift.zone?.nameEn || '—');
                    const officerName = isAr ? (shift.officer?.nameAr || shift.officer?.nameEn || '—') : (shift.officer?.nameEn || '—');
                    const canEdit = shift.status === 'scheduled';
                    return (
                      <div key={shift.id} className="px-4 py-3 hover:bg-slate-50/50 flex items-center gap-4">
                        <div className="min-w-[160px]">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-sm font-medium text-slate-900">{officerName}</span>
                          </div>
                          <div className="text-xs text-slate-500 font-mono ms-5">{shift.officer?.badgeNumber}</div>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-[120px]">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-sm text-slate-700">{zoneName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-[130px]">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-sm text-slate-700 font-mono">{formatTime(shift.scheduledStart)} – {formatTime(shift.scheduledEnd)}</span>
                        </div>
                        {shift.isOvertime && (
                          <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                            {isAr ? 'ساعات إضافية' : 'Overtime'}
                          </span>
                        )}
                        <div className="ml-auto flex items-center gap-2">
                          <span className={cn('inline-block rounded px-2 py-0.5 text-xs font-medium', config.bg, config.text)}>{config.label}</span>
                          {canEdit && (
                            <>
                              <button onClick={() => openEdit(shift)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors" title={isAr ? 'تعديل' : 'Edit'}>
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => handleDelete(shift)} className="p-1 text-slate-400 hover:text-red-600 transition-colors" title={isAr ? 'حذف' : 'Delete'}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => handleStatusChange(shift, 'called_off')} className="text-[10px] text-slate-400 hover:text-slate-600 underline" title={isAr ? 'إلغاء' : 'Call off'}>
                                {isAr ? 'إلغاء' : 'Call off'}
                              </button>
                            </>
                          )}
                          {shift.status === 'scheduled' && new Date(shift.scheduledStart) < new Date(Date.now() - 30 * 60 * 1000) && (
                            <button onClick={() => handleStatusChange(shift, 'no_show')} className="text-[10px] text-red-400 hover:text-red-600 underline" title={isAr ? 'تسجيل غياب' : 'Mark no-show'}>
                              {isAr ? 'غياب' : 'No-show'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} className="max-w-md">
        <DialogTitle>
          {editingShift ? (isAr ? 'تعديل وردية' : 'Edit Shift') : (isAr ? 'إنشاء وردية جديدة' : 'Create New Shift')}
        </DialogTitle>
        <DialogContent>
          <div className="space-y-4">
            {/* Officer */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{isAr ? 'الضابط' : 'Officer'}</label>
              <Select
                options={officerOptions}
                value={form.officerId}
                onChange={(e) => setForm({ ...form, officerId: e.target.value })}
                placeholder={isAr ? 'اختر ضابطاً' : 'Select an officer'}
              />
            </div>

            {/* Zone */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{isAr ? 'المنطقة' : 'Zone'}</label>
              <Select
                options={zoneOptions.filter((z) => z.value !== '')}
                value={form.zoneId}
                onChange={(e) => setForm({ ...form, zoneId: e.target.value })}
                placeholder={isAr ? 'اختر منطقة' : 'Select a zone'}
              />
            </div>

            {/* Start */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{isAr ? 'بداية الوردية' : 'Shift Start'}</label>
              <input
                type="datetime-local"
                value={form.scheduledStart}
                onChange={(e) => setForm({ ...form, scheduledStart: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            {/* End */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{isAr ? 'نهاية الوردية' : 'Shift End'}</label>
              <input
                type="datetime-local"
                value={form.scheduledEnd}
                onChange={(e) => setForm({ ...form, scheduledEnd: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            {/* Overtime */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isOvertime}
                onChange={(e) => setForm({ ...form, isOvertime: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">{isAr ? 'ساعات إضافية' : 'Overtime shift'}</span>
            </label>

            {/* Error */}
            {formError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={() => setDialogOpen(false)} variant="outline" size="sm">
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleSubmit}
                variant="default"
                size="sm"
                disabled={createShift.isPending || updateShift.isPending}
              >
                {createShift.isPending || updateShift.isPending
                  ? (isAr ? 'جاري الحفظ...' : 'Saving...')
                  : editingShift
                    ? (isAr ? 'حفظ التعديلات' : 'Save Changes')
                    : (isAr ? 'إنشاء' : 'Create Shift')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}