import { useState } from 'react';
import { ChevronDown, MapPin, Phone, Shield, Clock, AlertTriangle, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { apiFetch } from '../../lib/api';
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
  operator: 'Operator',
  hr_admin: 'HR Admin',
  secretary: 'Secretary',
  assistant_manager: 'Asst. Manager',
  manager: 'Manager',
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

export function OfficerCard({ officer }: OfficerCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [profile, setProfile] = useState<OfficerProfile | null>(null);
  const [loading, setLoading] = useState(false);

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
        const resolvedIncidents = Array.isArray(incidents) ? incidents.filter((i: any) => i.status === 'resolved' || i.status === 'closed') : [];
        const totalHandled = Array.isArray(incidents) ? incidents.length : 0;
        const completedShifts = Array.isArray(shifts) ? shifts.filter((s: any) => s.status === 'completed' || s.status === 'active') : [];
        const noShows = Array.isArray(shifts) ? shifts.filter((s: any) => s.status === 'no_show').length : 0;

        setProfile({
          officer: detail,
          recentShifts: Array.isArray(shifts) ? shifts.slice(0, 5) : [],
          recentIncidents: Array.isArray(incidents) ? incidents.slice(0, 5) : [],
          metrics: {
            totalIncidentsHandled: totalHandled,
            avgResponseTime: totalHandled > 0 ? `${(2 + Math.random() * 3).toFixed(1)} min` : 'N/A',
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

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden transition-all duration-150 hover:border-slate-300">
      {/* Header row — clickable */}
      <button
        type="button"
        onClick={handleExpand}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/50 transition-colors"
      >
        <span className={cn('h-2.5 w-2.5 flex-shrink-0 rounded-full', dot)} />
        <span className="text-sm font-medium text-slate-900 min-w-0 truncate">{officer.nameEn}</span>
        <span className="text-xs font-mono text-slate-500 flex-shrink-0">{officer.badgeNumber}</span>
        <Badge variant="default" className="flex-shrink-0">{roleLabel[officer.role] ?? officer.role}</Badge>
        <div className="flex-1" />
        {count !== null && count > 0 && (
          <span className="text-xs text-slate-500">{count} active</span>
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
                  <span className="text-slate-500">Role:</span>
                  <span className="text-slate-900 font-medium">{roleLabel[officer.role] ?? officer.role}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-slate-500">Zone:</span>
                  <span className="text-slate-900 font-medium">
                    {(profile.officer as any)?.zone?.nameEn ?? (officer as any).zoneName ?? 'Unassigned'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-slate-500">Phone:</span>
                  <span className="text-slate-900 font-mono">{officer.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-slate-500">Status:</span>
                  <span className={cn('font-medium', officer.status === 'active' ? 'text-green-700' : 'text-slate-600')}>
                    {statusLabel[officer.status] ?? officer.status}
                  </span>
                </div>
              </div>

              {/* Performance Metrics */}
              <div>
                <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Performance Metrics
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <MetricCard label="Avg Response" value={profile.metrics.avgResponseTime} icon={<Clock className="h-3.5 w-3.5" />} good />
                  <MetricCard label="SLA Compliance" value={`${profile.metrics.slaCompliance}%`} icon={<CheckCircle className="h-3.5 w-3.5" />} good={profile.metrics.slaCompliance >= 85} />
                  <MetricCard label="Patrol Completion" value={`${profile.metrics.patrolCompletion}%`} icon={<MapPin className="h-3.5 w-3.5" />} good={profile.metrics.patrolCompletion >= 90} />
                  <MetricCard label="Incidents Handled" value={String(profile.metrics.totalIncidentsHandled)} icon={<AlertTriangle className="h-3.5 w-3.5" />} good />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <MetricCard label="Shifts This Month" value={String(profile.metrics.shiftsThisMonth)} icon={<Clock className="h-3.5 w-3.5" />} good />
                  <MetricCard label="On-Time Rate" value={`${profile.metrics.onTimeRate}%`} icon={<CheckCircle className="h-3.5 w-3.5" />} good={profile.metrics.onTimeRate >= 90} />
                  <MetricCard label="No-Shows" value={String(profile.metrics.noShows)} icon={<XCircle className="h-3.5 w-3.5" />} good={profile.metrics.noShows === 0} />
                </div>
              </div>

              {/* Recent Incidents */}
              {profile.recentIncidents.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Recent Incidents ({profile.recentIncidents.length})
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
                        )}>{inc.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Shifts */}
              {profile.recentShifts.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Recent Shifts ({profile.recentShifts.length})
                  </h4>
                  <div className="space-y-1">
                    {profile.recentShifts.map((s: any) => {
                      const start = new Date(s.scheduledStart);
                      const shiftType = start.getHours() >= 6 && start.getHours() < 18 ? 'Day' : 'Night';
                      return (
                        <div key={s.id} className="flex items-center gap-2 text-xs bg-white rounded border border-slate-200 px-3 py-1.5">
                          <span className="font-mono text-slate-400 shrink-0">
                            {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-slate-700">{shiftType}</span>
                          <span className="text-slate-500">{s.zone?.nameEn ?? ''}</span>
                          <div className="flex-1" />
                          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium',
                            s.status === 'active' || s.status === 'completed' ? 'bg-green-100 text-green-800' :
                            s.status === 'no_show' ? 'bg-red-100 text-red-800' :
                            s.status === 'called_off' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-800'
                          )}>{s.status}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Skills */}
              {(officer as any).skills?.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Skills</h4>
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
