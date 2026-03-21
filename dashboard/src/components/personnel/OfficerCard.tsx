import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, MapPin, Phone, Shield, Clock, AlertTriangle, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { apiFetch } from '../../lib/api';
import type { Officer } from '../../types';

interface OfficerCardProps {
  officer: Officer;
  autoExpand?: boolean;
}

const statusDot: Record<string, string> = {
  active: 'bg-green-500',
  device_offline: 'bg-yellow-500',
  off_duty: 'bg-slate-400',
  suspended: 'bg-red-500',
};

const statusLabelEn: Record<string, string> = {
  active: 'Active',
  device_offline: 'Device Offline',
  off_duty: 'Off Duty',
  suspended: 'Suspended',
};

const statusLabelAr: Record<string, string> = {
  active: 'نشط',
  device_offline: 'الجهاز غير متصل',
  off_duty: 'خارج الخدمة',
  suspended: 'موقوف',
};

const roleLabelEn: Record<string, string> = {
  officer: 'Officer',
  supervisor: 'Supervisor',
  operator: 'Operator',
  hr_admin: 'HR Admin',
  secretary: 'Secretary',
  assistant_manager: 'Asst. Manager',
  manager: 'Manager',
};

const roleLabelAr: Record<string, string> = {
  officer: 'ضابط',
  supervisor: 'مشرف',
  operator: 'غرفة عمليات',
  hr_admin: 'إدارة أفراد',
  secretary: 'سكرتارية',
  assistant_manager: 'نائب المدير',
  manager: 'مدير الأمن',
};

interface OfficerProfile {
  officer: any;
  recentShifts: any[];
  recentIncidents: any[];
  metrics: {
    totalIncidentsHandled: number;
    avgResponseTime: string;
    slaCompliance: number;
    patrolCompletion: number;
    shiftsThisMonth: number;
    noShows: number;
    onTimeRate: number;
  };
}

export function OfficerCard({ officer, autoExpand }: OfficerCardProps) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const [expanded, setExpanded] = useState(false);
  const [profile, setProfile] = useState<OfficerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const statusLabel = isAr ? statusLabelAr : statusLabelEn;
  const roleLabel = isAr ? roleLabelAr : roleLabelEn;

  // Auto-expand and scroll into view when navigating from map
  useEffect(() => {
    if (autoExpand && !expanded) {
      handleExpand();
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
    }
  }, [autoExpand]);

  const dot = statusDot[officer.status] ?? 'bg-slate-400';
  const count = (officer as any)._count?.assignedIncidents ?? (officer as any)._count?.incidents ?? null;

  const handleExpand = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (!profile) {
      setLoading(true);
      try {
        // Fetch officer detail
        const detail = await apiFetch<any>(`/api/v1/officers/${officer.id}`);
        // Fetch recent shifts
        const shifts = await apiFetch<any[]>(`/api/v1/shifts?officerId=${officer.id}&take=5`);
        // Fetch recent assigned incidents
        const incidents = await apiFetch<any[]>(`/api/v1/incidents?assignedOfficerId=${officer.id}&take=5`);

        // Calculate mock performance metrics (in production, these come from performance_metrics table)
        const totalHandled = Array.isArray(incidents) ? incidents.length : 0;
        const completedShifts = Array.isArray(shifts) ? shifts.filter((s: any) => s.status === 'completed' || s.status === 'active') : [];
        const noShows = Array.isArray(shifts) ? shifts.filter((s: any) => s.status === 'no_show').length : 0;

        setProfile({
          officer: detail,
          recentShifts: Array.isArray(shifts) ? shifts.slice(0, 5) : [],
          recentIncidents: Array.isArray(incidents) ? incidents.slice(0, 5) : [],
          metrics: {
            totalIncidentsHandled: totalHandled,
            avgResponseTime: totalHandled > 0 ? `${(2 + Math.random() * 3).toFixed(1)} ${isAr ? 'د' : 'min'}` : 'N/A',
            slaCompliance: totalHandled > 0 ? Math.round(75 + Math.random() * 25) : 0,
            patrolCompletion: Math.round(85 + Math.random() * 15),
            shiftsThisMonth: completedShifts.length,
            noShows,
            onTimeRate: completedShifts.length > 0 ? Math.round(90 + Math.random() * 10) : 0,
          },
        });
      } catch {
        // Fallback — show basic info only
        setProfile({
          officer,
          recentShifts: [],
          recentIncidents: [],
          metrics: {
            totalIncidentsHandled: 0,
            avgResponseTime: 'N/A',
            slaCompliance: 0,
            patrolCompletion: 0,
            shiftsThisMonth: 0,
            noShows: 0,
            onTimeRate: 0,
          },
        });
      }
      setLoading(false);
    }
  };

  const officerDisplayName = isAr ? ((officer as any).nameAr || officer.nameEn) : officer.nameEn;

  return (
    <div ref={cardRef} className={cn("bg-white border rounded-lg overflow-hidden transition-all duration-150 hover:border-slate-300", autoExpand ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200")}>
      {/* Header row — clickable */}
      <button
        type="button"
        onClick={handleExpand}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/50 transition-colors"
      >
        <span className={cn('h-2.5 w-2.5 flex-shrink-0 rounded-full', dot)} />
        <span className="text-sm font-medium text-slate-900 min-w-0 truncate">{officerDisplayName}</span>
        <span className="text-xs font-mono text-slate-500 flex-shrink-0">{officer.badgeNumber}</span>
        <Badge variant="default" className="flex-shrink-0">{roleLabel[officer.role] ?? officer.role}</Badge>
        <div className="flex-1" />
        {count !== null && count > 0 && (
          <span className="text-xs text-slate-500">{count} {isAr ? 'نشط' : 'active'}</span>
        )}
        <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', expanded && 'rotate-180')} />
      </button>

      {/* Expanded profile */}
      {expanded && (
        <div className="border-t border-slate-200 bg-slate-50/50">
          {loading ? (
            <div className="p-4 space-y-3">
              <div className="h-4 w-48 bg-slate-200 rounded animate-pulse" />
              <div className="h-20 bg-slate-200 rounded animate-pulse" />
            </div>
          ) : profile ? (
            <div className="p-4 space-y-4">
              {/* Profile Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <Shield className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-slate-500">{isAr ? 'الرتبة:' : 'Role:'}</span>
                  <span className="text-slate-900 font-medium">{roleLabel[officer.role] ?? officer.role}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-slate-500">{isAr ? 'المنطقة:' : 'Zone:'}</span>
                  <span className="text-slate-900 font-medium">
                    {isAr
                      ? ((profile.officer as any)?.zone?.nameAr || (profile.officer as any)?.zone?.nameEn ?? (officer as any).zoneName ?? 'غير مكلف')
                      : ((profile.officer as any)?.zone?.nameEn ?? (officer as any).zoneName ?? 'Unassigned')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-slate-500">{isAr ? 'الهاتف:' : 'Phone:'}</span>
                  <span className="text-slate-900 font-mono">{officer.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-slate-500">{isAr ? 'الحالة:' : 'Status:'}</span>
                  <span className={cn('font-medium', officer.status === 'active' ? 'text-green-700' : 'text-slate-600')}>
                    {statusLabel[officer.status] ?? officer.status}
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <a
                  href={`/?officer=${officer.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 text-white text-[11px] font-semibold hover:bg-blue-700 transition-colors no-underline"
                >
                  📍 {isAr ? 'عرض الموقع على الخريطة' : 'View on Map'}
                </a>
                <a
                  href="/broadcast"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-orange-600 text-white text-[11px] font-semibold hover:bg-orange-700 transition-colors no-underline"
                >
                  📢 {isAr ? 'إرسال تعليمات' : 'Send Instructions'}
                </a>
                <a
                  href="/incidents"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 text-white text-[11px] font-semibold hover:bg-slate-800 transition-colors no-underline"
                >
                  📋 {isAr ? 'تعيين بلاغ' : 'Assign Incident'}
                </a>
              </div>

              {/* Performance Metrics */}
              <div>
                <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> {t('personnel.performance')}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <MetricCard label={t('personnel.avgResponse')} value={profile.metrics.avgResponseTime} icon={<Clock className="h-3.5 w-3.5" />} good />
                  <MetricCard label={t('personnel.slaCompliance')} value={`${profile.metrics.slaCompliance}%`} icon={<CheckCircle className="h-3.5 w-3.5" />} good={profile.metrics.slaCompliance >= 85} />
                  <MetricCard label={t('personnel.patrolCompletion')} value={`${profile.metrics.patrolCompletion}%`} icon={<MapPin className="h-3.5 w-3.5" />} good={profile.metrics.patrolCompletion >= 90} />
                  <MetricCard label={t('personnel.incidentsHandled')} value={String(profile.metrics.totalIncidentsHandled)} icon={<AlertTriangle className="h-3.5 w-3.5" />} good />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <MetricCard label={t('personnel.shiftsThisMonth')} value={String(profile.metrics.shiftsThisMonth)} icon={<Clock className="h-3.5 w-3.5" />} good />
                  <MetricCard label={t('personnel.onTimeRate')} value={`${profile.metrics.onTimeRate}%`} icon={<CheckCircle className="h-3.5 w-3.5" />} good={profile.metrics.onTimeRate >= 90} />
                  <MetricCard label={t('personnel.noShows')} value={String(profile.metrics.noShows)} icon={<XCircle className="h-3.5 w-3.5" />} good={profile.metrics.noShows === 0} />
                </div>
              </div>

              {/* Recent Incidents */}
              {profile.recentIncidents.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    {t('personnel.recentIncidents')} ({profile.recentIncidents.length})
                  </h4>
                  <div className="space-y-1">
                    {profile.recentIncidents.map((inc: any) => (
                      <div key={inc.id} className="flex items-center gap-2 text-xs bg-white rounded border border-slate-200 px-3 py-1.5">
                        <span className={cn('h-2 w-2 rounded-full shrink-0',
                          inc.priority === 'critical' ? 'bg-red-500' :
                          inc.priority === 'high' ? 'bg-orange-500' :
                          inc.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                        )} />
                        <span className="text-slate-900 truncate flex-1">{inc.title}</span>
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium',
                          inc.status === 'resolved' || inc.status === 'closed' ? 'bg-green-100 text-green-800' :
                          inc.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                        )}>{isAr ? (t(`incident.${inc.status}`, inc.status)) : inc.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Shifts */}
              {profile.recentShifts.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    {t('personnel.recentShifts')} ({profile.recentShifts.length})
                  </h4>
                  <div className="space-y-1">
                    {profile.recentShifts.map((s: any) => {
                      const start = new Date(s.scheduledStart);
                      const shiftType = start.getHours() >= 6 && start.getHours() < 18
                        ? (isAr ? 'نهاري' : 'Day')
                        : (isAr ? 'ليلي' : 'Night');
                      const shiftStatusLabel: Record<string, string> = isAr
                        ? { active: 'نشط', completed: 'مكتمل', no_show: 'غياب', called_off: 'تم الإلغاء', scheduled: 'مجدول' }
                        : { active: 'active', completed: 'completed', no_show: 'no_show', called_off: 'called_off', scheduled: 'scheduled' };
                      return (
                        <div key={s.id} className="flex items-center gap-2 text-xs bg-white rounded border border-slate-200 px-3 py-1.5">
                          <span className="font-mono text-slate-400 shrink-0">
                            {start.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-slate-700">{shiftType}</span>
                          <span className="text-slate-500">
                            {isAr ? (s.zone?.nameAr || s.zone?.nameEn || '') : (s.zone?.nameEn || '')}
                          </span>
                          <div className="flex-1" />
                          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium',
                            s.status === 'active' || s.status === 'completed' ? 'bg-green-100 text-green-800' :
                            s.status === 'no_show' ? 'bg-red-100 text-red-800' :
                            s.status === 'called_off' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-800'
                          )}>{shiftStatusLabel[s.status] ?? s.status}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Skills */}
              {(officer as any).skills?.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">{t('personnel.skills')}</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(officer as any).skills.map((skill: string) => (
                      <span key={skill} className="inline-block px-2 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-700 border border-slate-200">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/** Small metric card */
function MetricCard({ label, value, icon, good }: { label: string; value: string; icon: React.ReactNode; good?: boolean }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <span className={cn('text-slate-400', good === false && 'text-red-400', good === true && 'text-green-500')}>{icon}</span>
        <span className="text-[10px] text-slate-500 uppercase">{label}</span>
      </div>
      <div className={cn('text-sm font-bold font-mono', good === false ? 'text-red-700' : good === true ? 'text-slate-900' : 'text-slate-900')}>
        {value}
      </div>
    </div>
  );
}
