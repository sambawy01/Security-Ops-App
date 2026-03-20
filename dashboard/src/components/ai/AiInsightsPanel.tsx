import { useState } from 'react';
import { useAiStatus, useAiPatterns, useAiAnomalies, useAiStaffing, useAiQuery } from '../../hooks/useAi';
import { cn } from '../../lib/utils';

function StatusIndicator({ available }: { available: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span
        className={cn(
          'inline-block h-2 w-2 rounded-full',
          available ? 'bg-emerald-400' : 'bg-red-500'
        )}
      />
      <span className={available ? 'text-emerald-600' : 'text-red-600'}>
        {available ? 'AI Online' : 'AI Offline'}
      </span>
    </span>
  );
}

function PatternInsights({ patterns }: { patterns: unknown[] }) {
  if (patterns.length === 0) {
    return <p className="text-xs text-slate-400">No recent pattern insights</p>;
  }

  return (
    <div className="space-y-2">
      {patterns.slice(0, 3).map((p: any, idx: number) => {
        const content = p.content ?? {};
        const insights = content.insights ?? [];
        const firstInsight = insights[0];

        return (
          <div
            key={p.id ?? idx}
            className="rounded-md border border-slate-200 bg-slate-50 p-2.5"
          >
            <p className="text-xs font-medium text-slate-700">
              {firstInsight?.titleEn ?? 'Pattern Analysis'}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">
              {firstInsight?.bodyEn ?? 'Analysis details unavailable'}
            </p>
            <p className="mt-1 text-[10px] text-slate-400">
              {new Date(p.createdAt).toLocaleString()}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function AnomalyAlerts({ anomalies }: { anomalies: unknown[] }) {
  if (anomalies.length === 0) {
    return <p className="text-xs text-slate-400">No active anomaly alerts</p>;
  }

  return (
    <div className="space-y-1.5">
      {anomalies.slice(0, 5).map((a: any, idx: number) => {
        const content = a.content ?? {};
        const alertType = content.alertType ?? 'unknown';
        const isHigh = alertType.includes('spike') || alertType.includes('critical');

        return (
          <div
            key={a.id ?? idx}
            className="flex items-start gap-2 rounded-md border border-slate-200 bg-white p-2"
          >
            <span
              className={cn(
                'mt-0.5 inline-flex h-4 min-w-[40px] items-center justify-center rounded-full px-1.5 text-[9px] font-bold uppercase',
                isHigh
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
              )}
            >
              {isHigh ? 'HIGH' : 'WARN'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-700 line-clamp-1">
                {content.alertText ?? alertType}
              </p>
              <p className="text-[10px] text-slate-400">
                {new Date(a.createdAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StaffingRecommendation({ data }: { data: any }) {
  if (!data) {
    return <p className="text-xs text-slate-400">No staffing recommendations yet</p>;
  }

  const content = data.content ?? {};
  const recommendation = content.recommendation ?? '';

  return (
    <div className="rounded-md border border-blue-200 bg-blue-50 p-2.5">
      <p className="text-xs font-medium text-blue-800">Staffing Recommendation</p>
      <p className="mt-1 text-[11px] text-blue-700 line-clamp-4 whitespace-pre-line">
        {typeof recommendation === 'string'
          ? recommendation
          : JSON.stringify(recommendation, null, 2)}
      </p>
      <p className="mt-1 text-[10px] text-blue-400">
        {new Date(data.createdAt).toLocaleString()}
      </p>
    </div>
  );
}

function NlqInput() {
  const [question, setQuestion] = useState('');
  const { mutate, data, isPending, isError } = useAiQuery();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      mutate(question.trim());
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-1.5">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        <button
          type="submit"
          disabled={isPending || !question.trim()}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? '...' : 'Ask'}
        </button>
      </form>
      {data?.answer && (
        <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2.5">
          <p className="text-xs text-slate-700 whitespace-pre-line">{data.answer}</p>
        </div>
      )}
      {isError && (
        <p className="mt-1 text-[11px] text-red-500">Failed to process query</p>
      )}
    </div>
  );
}

export function AiInsightsPanel() {
  const { data: status } = useAiStatus();
  const { data: patternsData } = useAiPatterns();
  const { data: anomaliesData } = useAiAnomalies();
  const { data: staffingData } = useAiStaffing();

  const patterns = (patternsData as any)?.data ?? (Array.isArray(patternsData) ? patternsData : []);
  const anomalies = (anomaliesData as any)?.data ?? (Array.isArray(anomaliesData) ? anomaliesData : []);
  const staffing = (staffingData as any)?.data ?? staffingData;

  return (
    <div className="space-y-4">
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          AI Insights
        </h3>
        <StatusIndicator available={status?.available ?? false} />
      </div>

      {/* Natural Language Query */}
      <div>
        <p className="mb-1.5 text-[10px] font-medium text-slate-500 uppercase tracking-wide">
          Ask AI
        </p>
        <NlqInput />
      </div>

      {/* Anomaly Alerts */}
      <div>
        <p className="mb-1.5 text-[10px] font-medium text-slate-500 uppercase tracking-wide">
          Anomaly Alerts (24h)
        </p>
        <AnomalyAlerts anomalies={anomalies} />
      </div>

      {/* Pattern Insights */}
      <div>
        <p className="mb-1.5 text-[10px] font-medium text-slate-500 uppercase tracking-wide">
          Pattern Insights (7d)
        </p>
        <PatternInsights patterns={patterns} />
      </div>

      {/* Staffing */}
      <div>
        <p className="mb-1.5 text-[10px] font-medium text-slate-500 uppercase tracking-wide">
          Staffing
        </p>
        <StaffingRecommendation data={staffing} />
      </div>
    </div>
  );
}
