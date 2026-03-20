import { useState } from 'react';
import { useAiReports, useAiReportDetail } from '../hooks/useAi';
import { Tabs, TabList, Tab, TabPanel } from '../components/ui/tabs';
import { formatDate } from '../lib/utils';

function ReportRow({ report, onSelect, isSelected }: {
  report: any;
  onSelect: (id: string) => void;
  isSelected: boolean;
}) {
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => onSelect(isSelected ? '' : report.id)}
        className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">
            {report.type?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())} Report
          </p>
          <p className="text-xs text-slate-500">
            {formatDate(report.periodStart)} - {formatDate(report.periodEnd)}
          </p>
        </div>
        <span className="text-xs text-slate-400">
          {formatDate(report.createdAt)}
        </span>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${isSelected ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
    </div>
  );
}

/** Render a key-value stats table */
function StatsTable({ data, title }: { data: Record<string, any>; title?: string }) {
  return (
    <div className="mb-4">
      {title && <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{title}</h4>}
      <div className="rounded-md border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <tbody>
            {Object.entries(data).map(([key, val]) => (
              <tr key={key} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-1.5 bg-slate-50 text-slate-600 font-medium w-[40%]">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                </td>
                <td className="px-3 py-1.5 text-slate-900 font-mono">
                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Render a list of items */
function ItemList({ items, title }: { items: any[]; title: string }) {
  return (
    <div className="mb-4">
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{title}</h4>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-slate-700 flex gap-2">
            <span className="text-slate-400 shrink-0">{i + 1}.</span>
            <span>{typeof item === 'string' ? item : item.action ?? item.description ?? item.name ?? JSON.stringify(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReportDetail({ id }: { id: string }) {
  const { data, isLoading } = useAiReportDetail(id);

  if (isLoading) {
    return (
      <div className="px-4 py-6 bg-slate-50 border-b border-slate-100">
        <p className="text-xs text-slate-400">Loading report...</p>
      </div>
    );
  }

  const report = (data as any)?.data ?? data;
  if (!report) return null;

  const c = report.content ?? {};

  return (
    <div className="px-4 py-4 bg-slate-50 border-b border-slate-200">
      <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-5">
        {/* Title */}
        {c.title && <h3 className="text-base font-bold text-slate-900">{c.title}</h3>}
        {c.subtitle && <p className="text-xs text-slate-500 -mt-3">{c.subtitle}</p>}

        {/* Executive Summary (monthly) */}
        {c.executiveSummary && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Executive Summary</h4>
            <p className="text-sm text-slate-700 leading-relaxed">{c.executiveSummary}</p>
          </div>
        )}

        {/* Narrative Summary (daily/weekly) */}
        {c.summary?.narrative && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Summary</h4>
            <p className="text-sm text-slate-700 leading-relaxed">{c.summary.narrative}</p>
          </div>
        )}

        {/* Recommendations */}
        {c.summary?.recommendations && (
          <ItemList items={c.summary.recommendations} title="Recommendations" />
        )}
        {c.recommendations && Array.isArray(c.recommendations) && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Recommendations</h4>
            <div className="space-y-2">
              {c.recommendations.map((r: any, i: number) => (
                <div key={i} className="rounded-md border border-slate-200 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      r.priority === 'High' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>{r.priority}</span>
                    <span className="text-xs font-semibold text-slate-900">{r.action}</span>
                  </div>
                  {r.rationale && <p className="text-[11px] text-slate-600">{r.rationale}</p>}
                  {r.expectedImpact && <p className="text-[11px] text-green-700 mt-1">Expected: {r.expectedImpact}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KPIs (monthly) */}
        {c.kpis && <StatsTable data={c.kpis} title="Key Performance Indicators" />}

        {/* KPI Trends */}
        {c.kpiTrends && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">KPI Trends (vs Previous Month)</h4>
            <div className="rounded-md border border-slate-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-1.5 text-left text-slate-600">Metric</th>
                  <th className="px-3 py-1.5 text-right text-slate-600">Previous</th>
                  <th className="px-3 py-1.5 text-right text-slate-600">Current</th>
                  <th className="px-3 py-1.5 text-right text-slate-600">Change</th>
                </tr></thead>
                <tbody>
                  {Object.entries(c.kpiTrends).map(([key, val]: [string, any]) => (
                    <tr key={key} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-1.5 text-slate-700 font-medium">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-slate-500">{String(val.previous)}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-slate-900">{String(val.current)}</td>
                      <td className={`px-3 py-1.5 text-right font-mono font-semibold ${val.direction === 'improved' ? 'text-green-700' : 'text-red-700'}`}>{val.change}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Incidents */}
        {c.incidents && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Incidents</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div className="rounded-md bg-slate-50 border border-slate-200 p-3 text-center">
                <div className="text-2xl font-bold text-slate-900">{c.incidents.total}</div>
                <div className="text-[10px] text-slate-500 uppercase">Total</div>
              </div>
              <div className="rounded-md bg-green-50 border border-green-200 p-3 text-center">
                <div className="text-2xl font-bold text-green-700">{c.incidents.resolved}</div>
                <div className="text-[10px] text-green-600 uppercase">Resolved</div>
              </div>
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-center">
                <div className="text-2xl font-bold text-amber-700">{c.incidents.pending}</div>
                <div className="text-[10px] text-amber-600 uppercase">Pending</div>
              </div>
              {c.sla && (
                <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-center">
                  <div className="text-2xl font-bold text-blue-700">{c.sla.responseCompliance}%</div>
                  <div className="text-[10px] text-blue-600 uppercase">SLA Compliance</div>
                </div>
              )}
            </div>
            {c.incidents.byPriority && <StatsTable data={c.incidents.byPriority} title="By Priority" />}
            {c.incidents.byZone && <StatsTable data={c.incidents.byZone} title="By Zone" />}
            {c.incidents.byCategory && <StatsTable data={c.incidents.byCategory} title="By Category" />}
          </div>
        )}

        {/* Zone Analysis (monthly) */}
        {c.zoneAnalysis && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Zone Analysis</h4>
            <div className="rounded-md border border-slate-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-1.5 text-left">Zone</th>
                  <th className="px-3 py-1.5 text-right">Incidents</th>
                  <th className="px-3 py-1.5 text-right">Avg Response</th>
                  <th className="px-3 py-1.5 text-right">SLA %</th>
                  <th className="px-3 py-1.5 text-center">Trend</th>
                  <th className="px-3 py-1.5 text-left">Notes</th>
                </tr></thead>
                <tbody>
                  {c.zoneAnalysis.map((z: any) => (
                    <tr key={z.zone} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-1.5 font-medium text-slate-900">{z.zone}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{z.incidents}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{z.avgResponse}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{z.sla}%</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          z.trend === 'stable' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}>{z.trend}</span>
                      </td>
                      <td className="px-3 py-1.5 text-slate-600 max-w-[200px] truncate">{z.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SLA */}
        {c.sla && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">SLA Performance</h4>
            <StatsTable data={{
              'Response Compliance': `${c.sla.responseCompliance}%`,
              'Resolution Compliance': `${c.sla.resolutionCompliance}%`,
              'Avg Response Time': c.sla.avgResponseTime,
              'Avg Resolution Time': c.sla.avgResolutionTime,
            }} />
            {c.sla.breaches?.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] font-semibold text-red-600 uppercase mb-1">SLA Breaches</p>
                {c.sla.breaches.map((b: any, i: number) => (
                  <p key={i} className="text-xs text-red-700">
                    {b.incident} ({b.zone}) — {b.type} exceeded by {b.exceededBy}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Personnel */}
        {c.personnel && <StatsTable data={{
          ...(c.personnel.totalOnDuty ? { 'On Duty': c.personnel.totalOnDuty } : {}),
          ...(c.personnel.avgDailyOnDuty ? { 'Avg Daily On Duty': c.personnel.avgDailyOnDuty } : {}),
          ...(c.personnel.attendanceRate ? { 'Attendance Rate': `${c.personnel.attendanceRate}%` } : {}),
          ...(c.personnel.attendance ? c.personnel.attendance : {}),
        }} title="Personnel" />}

        {/* Patrols */}
        {c.patrols && <StatsTable data={{
          'Routes Completed': `${c.patrols.completed}/${c.patrols.totalRoutes}`,
          'Completion Rate': `${c.patrols.completionRate}%`,
          'Checkpoints': `${c.patrols.checkpointsConfirmed}/${c.patrols.checkpointsTotal}`,
        }} title="Patrols" />}

        {/* Notable Events */}
        {c.notableEvents && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Notable Events</h4>
            <div className="space-y-2">
              {c.notableEvents.map((e: any, i: number) => (
                <div key={i} className="flex gap-3 text-xs">
                  <span className="font-mono text-slate-400 shrink-0">{e.time}</span>
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                    e.priority === 'critical' ? 'bg-red-100 text-red-800' :
                    e.priority === 'high' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>{e.priority}</span>
                  <span className="text-slate-700">{e.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Week Over Week (weekly) */}
        {c.summary?.weekOverWeek && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Week Over Week</h4>
            <div className="rounded-md border border-slate-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-1.5 text-left">Metric</th>
                  <th className="px-3 py-1.5 text-right">Previous</th>
                  <th className="px-3 py-1.5 text-right">Current</th>
                  <th className="px-3 py-1.5 text-right">Change</th>
                </tr></thead>
                <tbody>
                  {Object.entries(c.summary.weekOverWeek).map(([key, val]: [string, any]) => (
                    <tr key={key} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-1.5 text-slate-700 font-medium">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-slate-500">{String(val.previous)}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-slate-900">{String(val.current)}</td>
                      <td className={`px-3 py-1.5 text-right font-mono font-semibold ${Number(val.change) < 0 ? 'text-green-700' : val.change > 0 ? 'text-red-700' : 'text-slate-500'}`}>{val.change > 0 ? '+' : ''}{val.change}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Top Issues / Improvements (weekly) */}
        {c.summary?.topIssues && <ItemList items={c.summary.topIssues} title="Top Issues" />}
        {c.summary?.topImprovements && <ItemList items={c.summary.topImprovements} title="Top Improvements" />}

        {/* AI Insights (monthly) */}
        {c.aiInsights && <ItemList items={c.aiInsights} title="AI Insights" />}

        {/* Category Breakdown (monthly) */}
        {c.categoryBreakdown && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Category Breakdown</h4>
            <div className="rounded-md border border-slate-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-1.5 text-left">Category</th>
                  <th className="px-3 py-1.5 text-right">Count</th>
                  <th className="px-3 py-1.5 text-right">%</th>
                  <th className="px-3 py-1.5 text-center">Trend</th>
                </tr></thead>
                <tbody>
                  {c.categoryBreakdown.map((cat: any) => (
                    <tr key={cat.category} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-1.5 text-slate-900 font-medium">{cat.category}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{cat.count}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{cat.pct}%</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`text-[10px] font-bold ${
                          cat.trend === 'up' ? 'text-red-600' : cat.trend === 'down' ? 'text-green-600' : 'text-slate-400'
                        }`}>{cat.trend === 'up' ? '↑' : cat.trend === 'down' ? '↓' : '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Staffing Recommendations (weekly) */}
        {c.staffingRecommendations && <ItemList items={c.staffingRecommendations} title="Staffing Recommendations" />}
      </div>
    </div>
  );
}

function ReportList({ type }: { type?: string }) {
  const [selectedId, setSelectedId] = useState('');
  const { data, isLoading } = useAiReports(type);

  const reports = (data as any)?.data ?? (Array.isArray(data) ? data : []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-slate-400">Loading reports...</p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-slate-400">No reports generated yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      {reports.map((report: any) => (
        <div key={report.id}>
          <ReportRow
            report={report}
            onSelect={setSelectedId}
            isSelected={selectedId === report.id}
          />
          {selectedId === report.id && <ReportDetail id={report.id} />}
        </div>
      ))}
    </div>
  );
}

export function ReportsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">AI Reports</h1>
        <p className="text-sm text-slate-500 mt-1">
          Auto-generated daily, weekly, and monthly reports
        </p>
      </div>

      <Tabs defaultValue="all">
        <TabList>
          <Tab value="all">All</Tab>
          <Tab value="daily">Daily</Tab>
          <Tab value="weekly">Weekly</Tab>
          <Tab value="monthly">Monthly</Tab>
        </TabList>

        <TabPanel value="all">
          <ReportList />
        </TabPanel>
        <TabPanel value="daily">
          <ReportList type="daily" />
        </TabPanel>
        <TabPanel value="weekly">
          <ReportList type="weekly" />
        </TabPanel>
        <TabPanel value="monthly">
          <ReportList type="monthly" />
        </TabPanel>
      </Tabs>
    </div>
  );
}
