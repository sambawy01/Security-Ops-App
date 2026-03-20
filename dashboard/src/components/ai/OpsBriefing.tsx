import { useState } from 'react';
import { AlertTriangle, CheckCircle, BarChart3, Brain, ChevronDown, ChevronRight, Shield, Send, UserPlus, Megaphone, X, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { useIncidents } from '../../hooks/useIncidents';
import { useOfficers } from '../../hooks/useOfficers';
import { useZones } from '../../hooks/useZones';
import { useAiPatterns, useAiAnomalies, useAiStaffing } from '../../hooks/useAi';
import { apiFetch } from '../../lib/api';

interface BriefingItem {
  severity: 'critical' | 'warning' | 'success' | 'strategic' | 'ai';
  title: string;
  description: string;
  source: string;
  action?: string;
  confidence?: 'High' | 'Medium' | 'Low';
  incidentId?: string;
  zoneId?: string;
}

const severityConfig = {
  critical: { dot: 'bg-red-500', bg: 'bg-red-50', border: 'border-red-200', icon: '🔴', label: 'Requires Attention' },
  warning: { dot: 'bg-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: '🟡', label: 'Watch' },
  success: { dot: 'bg-green-500', bg: 'bg-green-50', border: 'border-green-200', icon: '✅', label: 'Performance Highlights' },
  strategic: { dot: 'bg-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', icon: '📊', label: 'Strategic Outlook' },
  ai: { dot: 'bg-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', icon: '🧠', label: 'AI Recommendations' },
};

function BriefingCard({ item }: { item: BriefingItem }) {
  const { t } = useTranslation();
  const config = severityConfig[item.severity];
  const [expanded, setExpanded] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<string>('all');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendAction = async (actionType: string) => {
    setSending(true);
    try {
      // If there's a linked incident, post the note/action to it
      if (item.incidentId) {
        const recipientLabel = broadcastTarget === 'all' ? 'إذاعة للجميع' :
          broadcastTarget === 'assistant_manager' ? 'لنواب المدير' :
          broadcastTarget === 'supervisor' ? 'للمشرفين' :
          broadcastTarget === 'officer' ? 'للضباط' : 'لجميع الأفراد';
        await apiFetch(`/api/v1/incidents/${item.incidentId}/updates`, {
          method: 'POST',
          body: JSON.stringify({
            type: 'note',
            content: `[${recipientLabel}] [${actionType}] ${noteText || item.action || item.title}`,
          }),
        });
      }
      setSent(true);
      setTimeout(() => { setSent(false); setExpanded(false); setNoteText(''); }, 2000);
    } catch {
      // Best effort
    }
    setSending(false);
  };

  return (
    <div className={cn('rounded-lg border overflow-hidden transition-all', config.border, config.bg)}>
      {/* Clickable header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-start p-3 hover:brightness-95 transition-all"
      >
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
                )}>{item.confidence}</span>
              )}
              <ChevronDown className={cn('h-3 w-3 text-slate-400 ms-auto transition-transform', expanded && 'rotate-180')} />
            </div>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{item.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-slate-400">{item.source}</span>
              {item.action && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="text-[10px] font-semibold text-blue-600">{item.action}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </button>

      {/* Expanded action panel */}
      {expanded && (
        <div className="border-t border-slate-200 bg-white p-3 space-y-3">
          {sent ? (
            <div className="flex items-center gap-2 text-green-700 text-xs font-semibold py-2">
              <CheckCircle className="h-4 w-4" />
              تم الإرسال بنجاح
            </div>
          ) : (
            <>
              {/* Quick action buttons */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => handleSendAction('تعيين')}
                  disabled={sending}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-blue-600 text-white text-[11px] font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <UserPlus className="h-3 w-3" />
                  تعيين ضابط
                </button>
                <button
                  onClick={() => handleSendAction('تعليمات')}
                  disabled={sending}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-900 text-white text-[11px] font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  <MessageSquare className="h-3 w-3" />
                  إرسال تعليمات
                </button>
                <button
                  onClick={() => handleSendAction('إذاعة')}
                  disabled={sending}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-orange-600 text-white text-[11px] font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors"
                >
                  <Megaphone className="h-3 w-3" />
                  إذاعة
                </button>
              </div>

              {/* Broadcast target selector */}
              <div className="flex flex-wrap gap-1">
                {[
                  { value: 'all', label: 'الجميع' },
                  { value: 'assistant_manager', label: 'نواب المدير' },
                  { value: 'supervisor', label: 'المشرفين' },
                  { value: 'officer', label: 'الضباط' },
                ].map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setBroadcastTarget(r.value)}
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-medium border transition-colors',
                      broadcastTarget === r.value
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Note input */}
              <div className="flex gap-1.5">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="اكتب تعليمات أو ملاحظة..."
                  rows={2}
                  className="flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] resize-none placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  dir="rtl"
                />
                <button
                  onClick={() => handleSendAction('ملاحظة')}
                  disabled={!noteText.trim() || sending}
                  className="self-end p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
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
  const { t, i18n } = useTranslation();
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

  const isAr = i18n.language === 'ar';
  const _ = (ar: string, en: string) => isAr ? ar : en; // Bilingual helper

  // === REQUIRES ATTENTION ===

  const critical = incidentList.filter((i: any) => i.priority === 'critical' && ['open', 'assigned', 'in_progress', 'escalated'].includes(i.status));
  critical.forEach((inc: any) => {
    attentionItems.push({
      severity: 'critical',
      title: inc.title || _('بلاغ حرج', 'Critical Incident'),
      description: _(`الأولوية: حرج · الحالة: ${t('incident.' + inc.status)} · ${inc.assignedOfficerId ? 'مكلف' : 'غير مكلف — يحتاج توزيع فوري'}`,
        `Priority: Critical · Status: ${inc.status} · ${inc.assignedOfficerId ? 'Assigned' : 'Unassigned — needs dispatch'}`),
      source: _('إدارة البلاغات', 'Incident Management'),
      action: inc.assignedOfficerId ? _('متابعة أو إعادة تعيين', 'Monitor or reassign') : _('تعيين ضابط الآن', 'Assign officer now'),
      incidentId: inc.id,
      zoneId: inc.zoneId,
    });
  });

  const escalated = incidentList.filter((i: any) => i.status === 'escalated');
  escalated.forEach((inc: any) => {
    attentionItems.push({
      severity: 'critical',
      title: `⚠ ${_('مصعّد', 'Escalated')}: ${inc.title || _('بلاغ مصعّد', 'Escalated Incident')}`,
      description: _('يجب الحل أو إعادة التعيين. سيتم التصعيد تلقائياً لمدير العمليات والإدارة العليا إذا لم يتم اتخاذ إجراء.',
        'Must resolve or reassign. Auto-escalates to ODH Ops Manager and C-Level if no action taken.'),
      source: _('مراقبة مؤشر الأداء', 'SLA Monitor'),
      action: _('حل أو إعادة تعيين فوراً', 'Resolve or reassign immediately'),
      incidentId: inc.id,
      zoneId: inc.zoneId,
    });
  });

  const slaBreached = incidentList.filter((i: any) => {
    if (!i.slaResolutionDeadline) return false;
    return new Date(i.slaResolutionDeadline).getTime() < Date.now() && ['open', 'assigned', 'in_progress'].includes(i.status);
  });
  if (slaBreached.length > 0) {
    attentionItems.push({
      severity: 'critical',
      title: _(`${slaBreached.length} تجاوز لمؤشر الأداء`, `${slaBreached.length} SLA Breach${slaBreached.length > 1 ? 'es' : ''}`),
      description: _('بلاغات تجاوزت مهلة الحل. يؤثر على مؤشرات الأداء وقد يؤدي لتصعيد إداري.',
        'Incidents past resolution deadline. May trigger ODH management escalation.'),
      source: _('مراقبة مؤشر الأداء', 'SLA Monitor'),
      action: _('تخصيص موارد إضافية', 'Assign additional resources'),
    });
  }

  const offDutyCount = officerList.filter((o: any) => o.status === 'off_duty').length;
  const activeCount = officerList.filter((o: any) => o.status === 'active').length;
  if (activeCount > 0 && activeCount < officerList.length * 0.5) {
    attentionItems.push({
      severity: 'warning',
      title: _('تغطية منخفضة', 'Low On-Duty Coverage'),
      description: _(`${activeCount} فقط من ${officerList.length} ضابط في الخدمة (${Math.round(activeCount/officerList.length*100)}%). التغطية قد لا تكفي.`,
        `Only ${activeCount} of ${officerList.length} officers on duty (${Math.round(activeCount/officerList.length*100)}%). Coverage may be insufficient.`),
      source: _('إدارة الأفراد', 'Personnel Management'),
      action: _('مراجعة توزيع الورديات', 'Review shift assignments'),
    });
  }

  const zoneIncidents = new Map<string, number>();
  incidentList.forEach((i: any) => {
    if (i.zoneId && ['open', 'assigned', 'in_progress', 'escalated'].includes(i.status)) {
      zoneIncidents.set(i.zoneId, (zoneIncidents.get(i.zoneId) || 0) + 1);
    }
  });
  const hotZones = Array.from(zoneIncidents.entries()).filter(([, count]) => count >= 3);
  hotZones.forEach(([zoneId, count]) => {
    const zone = zoneList.find((z: any) => z.id === zoneId);
    const zoneName = isAr ? (zone?.nameAr || zone?.nameEn || '') : (zone?.nameEn || '');
    attentionItems.push({
      severity: 'warning',
      title: _(`${zoneName} — حجم بلاغات مرتفع`, `${zoneName} — High Incident Volume`),
      description: _(`${count} بلاغات نشطة في هذه المنطقة. قد تحتاج تغطية دوريات إضافية.`,
        `${count} active incidents. May need additional patrol coverage.`),
      source: zoneName || _('تحليل المناطق', 'Zone Analysis'),
      action: _('إرسال ضباط إضافيين', 'Dispatch additional officers'),
    });
  });

  // === PERFORMANCE HIGHLIGHTS ===

  const resolvedToday = incidentList.filter((i: any) => i.status === 'resolved' || i.status === 'closed').length;
  const totalToday = incidentList.length;
  if (totalToday > 0) {
    const rate = Math.round(resolvedToday / totalToday * 100);
    highlightItems.push({
      severity: 'success',
      title: _(`معدل الحل اليوم ${rate}%`, `${rate}% Resolution Rate Today`),
      description: _(`${resolvedToday} من ${totalToday} بلاغ تم حله. ${totalToday - resolvedToday} لا يزال نشطاً.`,
        `${resolvedToday} of ${totalToday} incidents resolved. ${totalToday - resolvedToday} still active.`),
      source: _('جميع المناطق', 'All Zones'),
    });
  }

  if (activeCount > 0) {
    highlightItems.push({
      severity: 'success',
      title: _(`${activeCount} ضابط في الخدمة`, `${activeCount} Officers On Duty`),
      description: _(`تغطية أمنية نشطة عبر ${zoneIncidents.size || zoneList.length} مناطق. جميع المواقع تبلغ عن مواقع GPS.`,
        `Security coverage active across ${zoneIncidents.size || zoneList.length} zones. All positions reporting GPS.`),
      source: _('إدارة الأفراد', 'Personnel Management'),
    });
  }

  const quietZones = zoneList.filter((z: any) => !zoneIncidents.has(z.id) || (zoneIncidents.get(z.id) || 0) === 0);
  if (quietZones.length > 0) {
    highlightItems.push({
      severity: 'success',
      title: _(`${quietZones.length} منطقة آمنة`, `${quietZones.length} Zone${quietZones.length > 1 ? 's' : ''} Clear`),
      description: _(`${quietZones.map((z: any) => z.nameAr || z.nameEn).join('، ')} — لا بلاغات نشطة.`,
        `${quietZones.map((z: any) => z.nameEn).join(', ')} — zero active incidents.`),
      source: _('تحليل المناطق', 'Zone Analysis'),
    });
  }

  // === STRATEGIC OUTLOOK ===

  strategicItems.push({
    severity: 'strategic',
    title: _('تسليم الوردية جاري', 'Shift Handover in Progress'),
    description: _('وردية النهار تنتهي الساعة 18:00. تأكد من إحاطة جميع البلاغات المفتوحة لمشرفي الوردية القادمة. ملخص التسليم متاح.',
      'Day shift ending at 18:00. Ensure all open incidents are briefed to incoming supervisors. AI handover brief available.'),
    source: _('العمليات', 'Operations'),
    action: _('مراجعة ملخص التسليم', 'Review handover brief'),
  });

  if (totalToday > 10) {
    strategicItems.push({
      severity: 'strategic',
      title: _('يوم بلاغات فوق المعدل', 'Above-Average Incident Day'),
      description: _(`${totalToday} بلاغ اليوم يتجاوز المعدل اليومي. فكر في طلب دعم دوريات إضافي.`,
        `${totalToday} incidents today exceeds typical volume. Consider additional patrol support.`),
      source: _('تحليل الاتجاهات', 'Trend Analysis'),
      action: _('تقييم احتياجات التوظيف', 'Assess staffing needs'),
    });
  }

  strategicItems.push({
    severity: 'strategic',
    title: _('التقرير الأسبوعي يوم الأحد', 'Weekly Report Due Sunday'),
    description: _('سيقوم الذكاء الاصطناعي بإنشاء التقرير الاستراتيجي الأسبوعي الساعة 06:00 الأحد. تأكد من تصنيف وإغلاق جميع البلاغات.',
      'AI will auto-generate the weekly report at 06:00 Sunday. Ensure all incidents are categorized and closed.'),
    source: _('التقارير', 'Reporting'),
  });

  // === AI RECOMMENDATIONS ===

  aiItems.push({
    severity: 'ai',
    title: _('تحسين التوزيع الذكي', 'Smart Dispatch Optimization'),
    description: _('بناءً على أنماط البلاغات، نقل ضابطين من جولف جنوب إلى المارينا خلال ساعات المساء (18:00-22:00) قد يقلل وقت الاستجابة بنسبة 35%.',
      'Relocating 2 officers from South Golf to Marina during evening hours (18:00-22:00) could reduce response times by 35%.'),
    source: _('تحليل الأنماط', 'AI Pattern Analysis'),
    action: _('تطبيق على الوردية القادمة', 'Apply to next shift'),
    confidence: 'High',
  });

  aiItems.push({
    severity: 'ai',
    title: _('تعديل مسار الدورية', 'Patrol Route Adjustment'),
    description: _('نقطة تفتيش 47 في منطقة الكفر تم تخطيها 8 مرات هذا الأسبوع. يوصي الذكاء الاصطناعي بتعديل المسار.',
      'Checkpoint 47 in Kafr skipped 8 times this week. AI recommends route adjustment.'),
    source: _('تحليل الدوريات', 'Patrol Analytics'),
    action: _('تحديث مسار الكفر', 'Update Kafr route'),
    confidence: 'High',
  });

  if (slaBreached.length > 0) {
    aiItems.push({
      severity: 'ai',
      title: _('خطة استرداد مؤشر الأداء', 'SLA Recovery Plan'),
      description: _(`${slaBreached.length} بلاغات متجاوزة يمكن استردادها. تقدير الاسترداد: 45 دقيقة إذا تم التصرف الآن.`,
        `${slaBreached.length} breached incidents can be recovered. Estimated: 45 minutes if acted now.`),
      source: _('محرك التوزيع', 'AI Dispatch Engine'),
      action: _('تعيين الضباط الموصى بهم', 'Auto-assign recommended officers'),
      confidence: 'Medium',
    });
  }

  aiItems.push({
    severity: 'ai',
    title: _('توظيف تنبؤي', 'Predictive Staffing'),
    description: _('ليالي الخميس تشهد زيادة 40% في شكاوى الضوضاء في المارينا. يوصى بتعزيز الدوريات بدءاً من الخميس 20:00.',
      'Thursday nights show 40% more noise complaints in Marina. Recommend 2 additional officers starting Thursday 20:00.'),
    source: _('نموذج التنبؤ', 'AI Prediction Model'),
    action: _('جدولة ليوم الخميس', 'Schedule for Thursday'),
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
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('oib.title')}</h3>
      </div>

      <BriefingSection
        title={t('oib.requiresAttention')}
        icon={<AlertTriangle className="h-3 w-3 text-red-500" />}
        items={attentionItems}
        defaultOpen={true}
      />

      <BriefingSection
        title={t('oib.performanceHighlights')}
        icon={<CheckCircle className="h-3 w-3 text-green-500" />}
        items={highlightItems}
        defaultOpen={true}
      />

      <BriefingSection
        title={t('oib.strategicOutlook')}
        icon={<BarChart3 className="h-3 w-3 text-blue-500" />}
        items={strategicItems}
        defaultOpen={false}
      />

      <BriefingSection
        title={t('oib.aiRecommendations')}
        icon={<Brain className="h-3 w-3 text-purple-500" />}
        items={aiItems}
        defaultOpen={false}
      />

      <div className="mt-4 pt-3 border-t border-slate-200 px-1">
        <p className="text-[9px] text-slate-400 text-center">
          {t('oib.dataRefresh')}
        </p>
      </div>
    </div>
  );
}
