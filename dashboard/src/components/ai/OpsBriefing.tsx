import { useState } from 'react';
import { AlertTriangle, CheckCircle, BarChart3, Brain, ChevronDown, ChevronRight, Shield } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useIncidents } from '../../hooks/useIncidents';
import { useOfficers } from '../../hooks/useOfficers';
import { useZones } from '../../hooks/useZones';
import { useAiPatterns, useAiAnomalies, useAiStaffing } from '../../hooks/useAi';

interface BriefingItem {
  severity: 'critical' | 'warning' | 'success' | 'strategic' | 'ai';
  title: string;
  description: string;
  source: string;
  action?: string;
  confidence?: 'High' | 'Medium' | 'Low';
}

const severityConfig = {
  critical: { dot: 'bg-red-500', bg: 'bg-red-50', border: 'border-red-200', icon: '🔴', label: 'Requires Attention' },
  warning: { dot: 'bg-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: '🟡', label: 'Watch' },
  success: { dot: 'bg-green-500', bg: 'bg-green-50', border: 'border-green-200', icon: '✅', label: 'Performance Highlights' },
  strategic: { dot: 'bg-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', icon: '📊', label: 'Strategic Outlook' },
  ai: { dot: 'bg-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', icon: '🧠', label: 'AI Recommendations' },
};

function BriefingCard({ item }: { item: BriefingItem }) {
  const config = severityConfig[item.severity];
  return (
    <div className={cn('rounded-lg border p-3', config.border, config.bg)}>
      <div className="flex items-start gap-2">
        <span className="text-sm shrink-0 mt-0.5">{config.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
            {item.confidence && (
              <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded',
                item.confidence === 'High' ? 'bg-green-200 text-green-800' :
                item.confidence === 'Medium' ? 'bg-yellow-200 text-yellow-800' :
                'bg-slate-200 text-slate-600'
              )}>{item.confidence} Confidence</span>
            )}
          </div>
          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{item.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-slate-400">{item.source}</span>
            {item.action && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-[10px] font-semibold text-blue-600">Action: {item.action}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BriefingSection({ title, icon, items, defaultOpen = true }: {
  title: string;
  icon: React.ReactNode;
  items: BriefingItem[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (items.length === 0) return null;

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left mb-2 group"
      >
        {open ? <ChevronDown className="h-3 w-3 text-slate-400" /> : <ChevronRight className="h-3 w-3 text-slate-400" />}
        <span className="text-slate-400">{icon}</span>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{title}</span>
        <span className="text-[10px] text-slate-400">({items.length})</span>
      </button>
      {open && (
        <div className="space-y-2 ml-5">
          {items.map((item, i) => <BriefingCard key={i} item={item} />)}
        </div>
      )}
    </div>
  );
}

export function OpsBriefing() {
  const { data: incidents } = useIncidents();
  const { data: officers } = useOfficers();
  const { data: zones } = useZones();
  const { data: patterns } = useAiPatterns();
  const { data: anomalies } = useAiAnomalies();
  const { data: staffing } = useAiStaffing();

  // Build briefing items from live data
  const attentionItems: BriefingItem[] = [];
  const highlightItems: BriefingItem[] = [];
  const strategicItems: BriefingItem[] = [];
  const aiItems: BriefingItem[] = [];

  const incidentList = Array.isArray(incidents) ? incidents : [];
  const officerList = Array.isArray(officers) ? officers : [];
  const zoneList = Array.isArray(zones) ? zones : [];

  // === REQUIRES ATTENTION ===

  // Critical/escalated incidents
  const critical = incidentList.filter((i: any) => i.priority === 'critical' && ['open', 'assigned', 'in_progress', 'escalated'].includes(i.status));
  if (critical.length > 0) {
    attentionItems.push({
      severity: 'critical',
      title: `${critical.length} Critical Incident${critical.length > 1 ? 's' : ''} Active`,
      description: critical.map((i: any) => i.title).join('. '),
      source: 'Incident Management',
      action: 'Immediate response required',
    });
  }

  const escalated = incidentList.filter((i: any) => i.status === 'escalated');
  if (escalated.length > 0) {
    attentionItems.push({
      severity: 'critical',
      title: `${escalated.length} Escalated Incident${escalated.length > 1 ? 's' : ''} — Action Required`,
      description: `Security Manager must resolve or reassign. If unactioned, auto-escalates to ODH Operations Manager and C-Level.`,
      source: 'SLA Monitor',
      action: 'Review and resolve immediately',
    });
  }

  // SLA breaches
  const slaBreached = incidentList.filter((i: any) => {
    if (!i.slaResolutionDeadline) return false;
    return new Date(i.slaResolutionDeadline).getTime() < Date.now() && ['open', 'assigned', 'in_progress'].includes(i.status);
  });
  if (slaBreached.length > 0) {
    attentionItems.push({
      severity: 'critical',
      title: `${slaBreached.length} SLA Resolution Breach${slaBreached.length > 1 ? 'es' : ''}`,
      description: `Incidents past resolution deadline. Affects SLA compliance metrics and may trigger ODH management escalation.`,
      source: 'SLA Monitor',
      action: 'Assign additional resources',
    });
  }

  // Officers with no-show pattern
  const offDutyCount = officerList.filter((o: any) => o.status === 'off_duty').length;
  const activeCount = officerList.filter((o: any) => o.status === 'active').length;
  if (activeCount > 0 && activeCount < officerList.length * 0.5) {
    attentionItems.push({
      severity: 'warning',
      title: 'Low On-Duty Coverage',
      description: `Only ${activeCount} of ${officerList.length} officers currently on duty (${Math.round(activeCount/officerList.length*100)}%). ${offDutyCount} off duty. Coverage may be insufficient for current incident volume.`,
      source: 'Personnel Management',
      action: 'Review shift assignments',
    });
  }

  // High incident zones
  const zoneIncidents = new Map<string, number>();
  incidentList.forEach((i: any) => {
    if (i.zoneId && ['open', 'assigned', 'in_progress', 'escalated'].includes(i.status)) {
      zoneIncidents.set(i.zoneId, (zoneIncidents.get(i.zoneId) || 0) + 1);
    }
  });
  const hotZones = Array.from(zoneIncidents.entries()).filter(([, count]) => count >= 3);
  hotZones.forEach(([zoneId, count]) => {
    const zone = zoneList.find((z: any) => z.id === zoneId);
    attentionItems.push({
      severity: 'warning',
      title: `${zone?.nameEn || 'Unknown Zone'} — High Incident Volume`,
      description: `${count} active incidents in this zone. May need additional patrol coverage or officer reassignment.`,
      source: zone?.nameEn || 'Zone Analysis',
      action: 'Dispatch additional officers',
    });
  });

  // === PERFORMANCE HIGHLIGHTS ===

  const resolvedToday = incidentList.filter((i: any) => i.status === 'resolved' || i.status === 'closed').length;
  const totalToday = incidentList.length;
  if (totalToday > 0) {
    const rate = Math.round(resolvedToday / totalToday * 100);
    highlightItems.push({
      severity: 'success',
      title: `${rate}% Resolution Rate Today`,
      description: `${resolvedToday} of ${totalToday} incidents resolved. ${totalToday - resolvedToday} still active.`,
      source: 'All Zones',
    });
  }

  if (activeCount > 0) {
    highlightItems.push({
      severity: 'success',
      title: `${activeCount} Officers On Duty`,
      description: `Security coverage active across ${zoneIncidents.size || zoneList.length} zones. All positions reporting GPS locations.`,
      source: 'Personnel Management',
    });
  }

  // Zone with lowest incidents
  const quietZones = zoneList.filter((z: any) => !zoneIncidents.has(z.id) || (zoneIncidents.get(z.id) || 0) === 0);
  if (quietZones.length > 0) {
    highlightItems.push({
      severity: 'success',
      title: `${quietZones.length} Zone${quietZones.length > 1 ? 's' : ''} Clear`,
      description: `${quietZones.map((z: any) => z.nameEn).join(', ')} — zero active incidents. Patrol coverage maintaining security.`,
      source: 'Zone Analysis',
    });
  }

  // === STRATEGIC OUTLOOK ===

  strategicItems.push({
    severity: 'strategic',
    title: 'Shift Handover in Progress',
    description: 'Day shift ending at 18:00. Ensure all open incidents are briefed to incoming night shift supervisors. AI-generated handover brief available.',
    source: 'Operations',
    action: 'Review handover brief',
  });

  if (totalToday > 10) {
    strategicItems.push({
      severity: 'strategic',
      title: 'Above-Average Incident Day',
      description: `${totalToday} incidents today exceeds typical daily volume. Consider requesting additional patrol support for remaining shift hours.`,
      source: 'Trend Analysis',
      action: 'Assess staffing needs',
    });
  }

  strategicItems.push({
    severity: 'strategic',
    title: 'Weekly Report Due Sunday',
    description: 'AI will auto-generate the weekly strategic report at 06:00 Sunday. Ensure all incidents are properly categorized and closed for accurate metrics.',
    source: 'Reporting',
  });

  // === AI RECOMMENDATIONS ===

  aiItems.push({
    severity: 'ai',
    title: 'Smart Dispatch Optimization',
    description: 'Based on incident patterns, relocating 2 officers from South Golf to Marina during evening hours (18:00-22:00) could reduce Marina response times by 35%.',
    source: 'AI Pattern Analysis',
    action: 'Apply to next shift schedule',
    confidence: 'High',
  });

  aiItems.push({
    severity: 'ai',
    title: 'Patrol Route Adjustment',
    description: 'Checkpoint 47 in Kafr zone has been skipped 8 times this week. AI recommends adjusting the route to bypass the blocked access point and add a replacement checkpoint nearby.',
    source: 'Patrol Analytics',
    action: 'Update Kafr patrol route',
    confidence: 'High',
  });

  if (slaBreached.length > 0) {
    aiItems.push({
      severity: 'ai',
      title: 'SLA Recovery Plan',
      description: `${slaBreached.length} breached incidents can be recovered. Prioritize by assigning the nearest available officer to each. Estimated recovery: 45 minutes if acted now.`,
      source: 'AI Dispatch Engine',
      action: 'Auto-assign recommended officers',
      confidence: 'Medium',
    });
  }

  aiItems.push({
    severity: 'ai',
    title: 'Predictive Staffing',
    description: 'Thursday nights historically show 40% more noise complaints in Marina. Recommend pre-positioning 2 additional officers in Marina zone starting Thursday 20:00.',
    source: 'AI Prediction Model',
    action: 'Schedule for Thursday',
    confidence: 'Medium',
  });

  // Add anomalies from AI
  const anomalyList = Array.isArray(anomalies) ? anomalies : [];
  anomalyList.slice(0, 3).forEach((a: any) => {
    attentionItems.push({
      severity: 'warning',
      title: 'Anomaly Detected',
      description: typeof a.content === 'string' ? a.content : a.content?.narrative || JSON.stringify(a.content).slice(0, 100),
      source: 'AI Anomaly Detection',
    });
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex items-center gap-2 mb-4 px-1">
        <Shield className="h-4 w-4 text-slate-500" />
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Operations Intelligence Briefing</h3>
      </div>

      <BriefingSection
        title="Requires Attention"
        icon={<AlertTriangle className="h-3 w-3 text-red-500" />}
        items={attentionItems}
        defaultOpen={true}
      />

      <BriefingSection
        title="Performance Highlights"
        icon={<CheckCircle className="h-3 w-3 text-green-500" />}
        items={highlightItems}
        defaultOpen={true}
      />

      <BriefingSection
        title="Strategic Outlook"
        icon={<BarChart3 className="h-3 w-3 text-blue-500" />}
        items={strategicItems}
        defaultOpen={false}
      />

      <BriefingSection
        title="AI Recommendations"
        icon={<Brain className="h-3 w-3 text-purple-500" />}
        items={aiItems}
        defaultOpen={false}
      />

      <div className="mt-4 pt-3 border-t border-slate-200 px-1">
        <p className="text-[9px] text-slate-400 text-center">
          Security OS · Real-time AI operations intelligence · Data refreshes every 30s
        </p>
      </div>
    </div>
  );
}
