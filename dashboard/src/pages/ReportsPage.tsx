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

function ReportDetail({ id }: { id: string }) {
  const { data, isLoading } = useAiReportDetail(id);

  if (isLoading) {
    return (
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
        <p className="text-xs text-slate-400">Loading report...</p>
      </div>
    );
  }

  const report = (data as any)?.data ?? data;
  if (!report) return null;

  const content = report.content ?? {};
  const narrative = content.narrative ?? '';

  return (
    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
      <div className="rounded-md border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
          {typeof narrative === 'string' ? narrative : JSON.stringify(narrative, null, 2)}
        </p>
        {content.stats && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700">
              View raw data
            </summary>
            <pre className="mt-2 rounded-md bg-slate-100 p-3 text-[11px] text-slate-600 overflow-x-auto">
              {JSON.stringify(content.stats, null, 2)}
            </pre>
          </details>
        )}
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
