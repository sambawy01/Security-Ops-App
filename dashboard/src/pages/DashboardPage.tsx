import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CommandMap } from '../components/map/CommandMap';
import { ZoneOverlays } from '../components/map/ZoneOverlays';
import { OfficerMarkers } from '../components/map/OfficerMarkers';
import { IncidentMarkers } from '../components/map/IncidentMarkers';
import { CheckpointMarkers } from '../components/map/CheckpointMarkers';
import { SlaTimer } from '../components/incidents/SlaTimer';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useIncidents } from '../hooks/useIncidents';
import { useOfficers } from '../hooks/useOfficers';
import { useZones } from '../hooks/useZones';
import { OpsBriefing } from '../components/ai/OpsBriefing';
import type { Incident, Officer, Zone } from '../types';

/* ------------------------------------------------------------------ */
/*  Panel wrapper                                                      */
/* ------------------------------------------------------------------ */

const panelClass =
  'absolute z-10 bg-white/90 backdrop-blur-sm rounded-lg border border-slate-200 shadow-lg p-3 max-w-[280px] pointer-events-auto';

/* ------------------------------------------------------------------ */
/*  1. Quick Stats Panel (top-left)                                    */
/* ------------------------------------------------------------------ */

function QuickStatsPanel({
  incidents,
  officers,
}: {
  incidents: Incident[];
  officers: Officer[];
}) {
  const openIncidents = incidents.filter(
    (i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED',
  );
  const byPriority = useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 } as Record<
      string,
      number
    >;
    for (const inc of openIncidents) {
      const key = inc.priority?.toUpperCase() ?? 'LOW';
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [openIncidents]);

  const onDuty = officers.filter((o) => o.status === 'ON_DUTY' || o.status === 'on_duty');
  const dutyPct =
    officers.length > 0
      ? Math.round((onDuty.length / officers.length) * 100)
      : 0;

  return (
    <div className={`${panelClass} top-3 left-3`}>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        Quick Stats
      </h3>

      {/* Open Incidents */}
      <div className="mb-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <svg
            className="h-3.5 w-3.5 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
          <span className="text-sm font-bold text-slate-800">
            {openIncidents.length}
          </span>
          <span className="text-xs text-slate-500">Open Incidents</span>
        </div>
        <div className="flex gap-1.5 flex-wrap text-[10px]">
          {byPriority.CRITICAL > 0 && (
            <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
              Crit: {byPriority.CRITICAL}
            </span>
          )}
          {byPriority.HIGH > 0 && (
            <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">
              High: {byPriority.HIGH}
            </span>
          )}
          {byPriority.MEDIUM > 0 && (
            <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">
              Med: {byPriority.MEDIUM}
            </span>
          )}
          {byPriority.LOW > 0 && (
            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
              Low: {byPriority.LOW}
            </span>
          )}
        </div>
      </div>

      {/* On-Duty Officers */}
      <div className="flex items-center gap-1.5">
        <svg
          className="h-3.5 w-3.5 text-emerald-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
          />
        </svg>
        <span className="text-sm font-bold text-slate-800">
          {onDuty.length}
        </span>
        <span className="text-xs text-slate-500">
          On-Duty ({dutyPct}%)
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  2. Zone Health Indicators (top-right)                              */
/* ------------------------------------------------------------------ */

type HealthStatus = 'green' | 'yellow' | 'red';

function computeZoneHealth(
  zone: Zone,
  incidents: Incident[],
  officers: Officer[],
): HealthStatus {
  const zoneIncidents = incidents.filter(
    (i) =>
      i.zoneId === zone.id &&
      i.status !== 'RESOLVED' &&
      i.status !== 'CLOSED',
  );
  const zoneOfficers = officers.filter(
    (o) => o.zoneId === zone.id && (o.status === 'ON_DUTY' || o.status === 'on_duty'),
  );

  const hasCritical = zoneIncidents.some(
    (i) => i.priority?.toUpperCase() === 'CRITICAL',
  );
  if (hasCritical) return 'red';
  if (zoneIncidents.length > zoneOfficers.length) return 'yellow';
  return 'green';
}

const healthDotColor: Record<HealthStatus, string> = {
  green: 'bg-emerald-400',
  yellow: 'bg-yellow-400',
  red: 'bg-red-500',
};

function ZoneHealthPanel({
  zones,
  incidents,
  officers,
}: {
  zones: Zone[];
  incidents: Incident[];
  officers: Officer[];
}) {
  return (
    <div className={`${panelClass} top-3 right-3`}>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        Zone Health
      </h3>
      <div className="space-y-1">
        {zones.map((zone) => {
          const health = computeZoneHealth(zone, incidents, officers);
          return (
            <div key={zone.id} className="flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${healthDotColor[health]}`}
                aria-label={`${zone.nameEn} health: ${health}`}
              />
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: zone.color }}
                aria-hidden="true"
              />
              <span className="text-xs text-slate-700 truncate">
                {zone.nameEn}
              </span>
            </div>
          );
        })}
        {zones.length === 0 && (
          <span className="text-xs text-slate-400">No zones</span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  3. Recent Activity Feed (bottom-left)                              */
/* ------------------------------------------------------------------ */

interface RecentUpdate {
  id?: string;
  timestamp: string;
  type: string;
  description: string;
}

function ActivityFeedPanel({
  stats,
  incidents,
}: {
  stats: Record<string, unknown> | undefined;
  incidents: Incident[];
}) {
  const { t } = useTranslation();
  // Try to use recentUpdates from dashboard stats; fall back to deriving from incidents
  const updates: RecentUpdate[] = useMemo(() => {
    if (stats && Array.isArray((stats as any).recentUpdates)) {
      return (stats as any).recentUpdates.slice(0, 5);
    }
    // Fallback: derive from most recent incidents
    return incidents
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5)
      .map((inc) => ({
        id: inc.id,
        timestamp: inc.createdAt,
        type: 'incident',
        description: `Incident "${inc.title}" created (${inc.priority})`,
      }));
  }, [stats, incidents]);

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '--:--';
    }
  };

  const typeIcons: Record<string, string> = {
    incident: 'text-red-500',
    assignment: 'text-blue-500',
    checkin: 'text-emerald-500',
    update: 'text-slate-500',
  };

  return (
    <div className={`${panelClass} bottom-3 left-3`}>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        {t('stats.recentActivity', 'النشاط الأخير')}
      </h3>
      <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
        {updates.length === 0 && (
          <span className="text-xs text-slate-400">No recent activity</span>
        )}
        {updates.map((u, idx) => (
          <div key={u.id ?? idx} className="flex items-start gap-1.5">
            <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap pt-0.5">
              {formatTime(u.timestamp)}
            </span>
            <svg
              className={`h-3 w-3 mt-0.5 flex-shrink-0 ${typeIcons[u.type] ?? typeIcons.update}`}
              fill="currentColor"
              viewBox="0 0 8 8"
              aria-hidden="true"
            >
              <circle cx="4" cy="4" r="4" />
            </svg>
            <span className="text-xs text-slate-700 leading-tight">
              {u.description}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  4. Mini Incident Queue (bottom-right)                              */
/* ------------------------------------------------------------------ */

const priorityOrder: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const priorityDotColor: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-blue-400',
};

function MiniIncidentQueue({ incidents }: { incidents: Incident[] }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const topIncidents = useMemo(() => {
    return incidents
      .filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED')
      .sort(
        (a, b) =>
          (priorityOrder[a.priority?.toUpperCase()] ?? 3) -
          (priorityOrder[b.priority?.toUpperCase()] ?? 3),
      )
      .slice(0, 5);
  }, [incidents]);

  return (
    <div className={`${panelClass} bottom-3 right-3`}>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        {t('stats.topIncidents', 'أهم البلاغات')}
      </h3>
      <div className="space-y-1.5">
        {topIncidents.length === 0 && (
          <span className="text-xs text-slate-400">No open incidents</span>
        )}
        {topIncidents.map((inc) => (
          <button
            key={inc.id}
            onClick={() => navigate(`/incidents?selected=${inc.id}`)}
            className="flex items-center gap-1.5 w-full text-left hover:bg-slate-100 rounded px-1 py-0.5 transition-colors group"
            title={inc.title}
          >
            <span
              className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${
                priorityDotColor[inc.priority?.toUpperCase()] ??
                priorityDotColor.LOW
              }`}
              aria-label={`Priority: ${inc.priority}`}
            />
            <span className="text-xs text-slate-700 truncate flex-1 group-hover:text-slate-900">
              {inc.title}
            </span>
            <SlaTimer deadline={inc.slaResponseDeadline ?? inc.slaResolutionDeadline} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard Page                                                     */
/* ------------------------------------------------------------------ */

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { data: statsData } = useDashboardStats();
  const { data: incidents = [] } = useIncidents();
  const { data: officers = [] } = useOfficers();
  const { data: zones = [] } = useZones();

  const incidentList = Array.isArray(incidents) ? incidents : [];
  const officerList = Array.isArray(officers) ? officers : [];
  const zoneList = Array.isArray(zones) ? zones : [];

  return (
    <div className="-m-6 h-[calc(100vh-4rem)] flex flex-col">
      {/* Top bar: Quick Stats + Zone Health */}
      <div className="flex items-stretch gap-3 px-4 py-3 bg-white border-b border-slate-200 shrink-0">
        {/* Quick Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-bold text-slate-900">
              {incidentList.filter((i: any) => ['open','assigned','in_progress','escalated'].includes(i.status)).length}
            </span>
            <span className="text-xs text-slate-500">{t('stats.openIncidents')}</span>
          </div>
          <div className="flex gap-1">
            {['critical','high','medium','low'].map(p => {
              const count = incidentList.filter((i: any) => i.priority === p && ['open','assigned','in_progress','escalated'].includes(i.status)).length;
              if (count === 0) return null;
              const colors: Record<string,string> = { critical: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-yellow-500', low: 'bg-blue-500' };
              return (
                <span key={p} className={`text-[10px] font-bold text-white px-1.5 py-0.5 rounded ${colors[p]}`}>
                  {t(`incident.${p}`)}: {count}
                </span>
              );
            })}
          </div>
          <div className="w-px h-6 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm font-bold text-slate-900">
              {officerList.filter((o: any) => o.status === 'active').length}
            </span>
            <span className="text-xs text-slate-500">{t('stats.onDuty')}</span>
          </div>
        </div>

        <div className="flex-1" />

        {/* Zone Health dots */}
        <div className="flex items-center gap-3">
          {zoneList.map((zone: any) => {
            const zoneIncidents = incidentList.filter((i: any) => i.zoneId === zone.id && ['open','assigned','in_progress','escalated'].includes(i.status));
            const hasCritical = zoneIncidents.some((i: any) => i.priority === 'critical');
            const zoneOfficers = officerList.filter((o: any) => o.zoneId === zone.id && o.status === 'active');
            const health = hasCritical ? 'red' : zoneIncidents.length > zoneOfficers.length ? 'yellow' : 'green';
            const dotColor = health === 'red' ? 'bg-red-500' : health === 'yellow' ? 'bg-yellow-500' : 'bg-green-500';
            return (
              <div key={zone.id} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                <span className="text-[10px] text-slate-600 font-medium">{i18n.language === 'ar' ? (zone.nameAr || zone.nameEn) : zone.nameEn}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main content: Map (left) + OIB (right) */}
      <div className="flex flex-1 min-h-0">
        {/* Map Panel */}
        <div className="flex-1 relative">
          <CommandMap>
            <ZoneOverlays />
            <OfficerMarkers />
            <IncidentMarkers />
            <CheckpointMarkers />
          </CommandMap>

          {/* Floating mini panels on the map */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            <ActivityFeedPanel stats={statsData} incidents={incidentList} />
            <MiniIncidentQueue incidents={incidentList} />
          </div>
        </div>

        {/* OIB Panel — separated, scrollable */}
        <div className="w-[380px] shrink-0 border-s border-slate-200 bg-white overflow-y-auto p-4">
          <OpsBriefing />
        </div>
      </div>
    </div>
  );
}
