import { chat } from '../ollama.js';

// ─── Daily Report (Arabic, 3-4 paragraphs) ─────────────────────────────────

const DAILY_REPORT_PROMPT = `أنت كاتب تقارير أمنية محترف. اكتب تقريراً يومياً باللغة العربية في 3-4 فقرات:

الفقرة 1: ملخص عام لليوم (عدد الحوادث، معدل الاستجابة، الحضور)
الفقرة 2: أبرز الحوادث وكيف تم التعامل معها
الفقرة 3: أداء الدوريات وتغطية المناطق
الفقرة 4 (اختياري): توصيات أو ملاحظات للإدارة

اكتب بأسلوب رسمي مناسب لتقارير الأمن. لا تستخدم JSON.`;

interface DailyStats {
  date: string;
  totalIncidents: number;
  resolvedIncidents: number;
  avgResponseMinutes: number;
  attendance: { present: number; absent: number; late: number };
  patrolsCompleted: number;
  patrolsScheduled: number;
  topCategories: Array<{ category: string; count: number }>;
  zoneBreakdown: Array<{ zone: string; incidents: number }>;
}

export async function generateDailyReport(stats: DailyStats): Promise<string> {
  const userMessage = `إحصائيات اليوم (${stats.date}):

الحوادث: ${stats.totalIncidents} إجمالي، ${stats.resolvedIncidents} تم حلها
متوسط وقت الاستجابة: ${stats.avgResponseMinutes} دقيقة
الحضور: ${stats.attendance.present} حاضر، ${stats.attendance.absent} غائب، ${stats.attendance.late} متأخر
الدوريات: ${stats.patrolsCompleted}/${stats.patrolsScheduled} مكتملة

أعلى التصنيفات:
${stats.topCategories.map((c) => `- ${c.category}: ${c.count}`).join('\n')}

توزيع المناطق:
${stats.zoneBreakdown.map((z) => `- ${z.zone}: ${z.incidents} حادثة`).join('\n')}

اكتب التقرير اليومي:`;

  const result = await chat(DAILY_REPORT_PROMPT, userMessage);
  return result || `التقرير اليومي — ${stats.date}\nإجمالي الحوادث: ${stats.totalIncidents}\nتم الحل: ${stats.resolvedIncidents}`;
}

// ─── Weekly Report (Arabic, ~1 page) ────────────────────────────────────────

const WEEKLY_REPORT_PROMPT = `أنت كاتب تقارير أمنية محترف. اكتب تقريراً أسبوعياً شاملاً باللغة العربية (صفحة واحدة تقريباً):

1. ملخص تنفيذي (فقرة واحدة)
2. إحصائيات الأسبوع (أرقام رئيسية)
3. تحليل الاتجاهات (مقارنة بالأسبوع السابق)
4. أبرز الحوادث
5. توصيات

اكتب بأسلوب رسمي. لا تستخدم JSON.`;

interface WeeklyStats {
  weekStart: string;
  weekEnd: string;
  totalIncidents: number;
  resolvedIncidents: number;
  avgResponseMinutes: number;
  previousWeekIncidents: number;
  patrolCompletionRate: number;
  topCategories: Array<{ category: string; count: number }>;
  zoneBreakdown: Array<{ zone: string; incidents: number }>;
  slaComplianceRate: number;
  notableIncidents: Array<{ title: string; resolution: string }>;
}

export async function generateWeeklyReport(stats: WeeklyStats): Promise<string> {
  const trend = stats.totalIncidents > stats.previousWeekIncidents ? 'ارتفاع' : 'انخفاض';
  const trendPct = stats.previousWeekIncidents > 0
    ? Math.abs(Math.round(((stats.totalIncidents - stats.previousWeekIncidents) / stats.previousWeekIncidents) * 100))
    : 0;

  const userMessage = `إحصائيات الأسبوع (${stats.weekStart} — ${stats.weekEnd}):

الحوادث: ${stats.totalIncidents} (${trend} ${trendPct}% عن الأسبوع السابق: ${stats.previousWeekIncidents})
تم الحل: ${stats.resolvedIncidents}
متوسط الاستجابة: ${stats.avgResponseMinutes} دقيقة
نسبة إتمام الدوريات: ${stats.patrolCompletionRate}%
نسبة الالتزام بـ SLA: ${stats.slaComplianceRate}%

أعلى التصنيفات:
${stats.topCategories.map((c) => `- ${c.category}: ${c.count}`).join('\n')}

توزيع المناطق:
${stats.zoneBreakdown.map((z) => `- ${z.zone}: ${z.incidents}`).join('\n')}

حوادث بارزة:
${stats.notableIncidents.map((n) => `- ${n.title}: ${n.resolution}`).join('\n')}

اكتب التقرير الأسبوعي:`;

  const result = await chat(WEEKLY_REPORT_PROMPT, userMessage);
  return result || `التقرير الأسبوعي — ${stats.weekStart} إلى ${stats.weekEnd}\nإجمالي الحوادث: ${stats.totalIncidents}`;
}

// ─── Monthly Report (English, 2-3 pages) ────────────────────────────────────

const MONTHLY_REPORT_PROMPT = `You are a professional security report writer. Write a comprehensive monthly security operations report in English (2-3 pages).

Structure:
1. Executive Summary (1 paragraph)
2. Key Performance Indicators (bullet points with numbers)
3. Incident Analysis (categories, trends, comparisons)
4. Zone Analysis (performance per zone)
5. Patrol & Coverage Analysis
6. SLA Compliance
7. Resource Utilization
8. Recommendations & Action Items

Write in formal business English suitable for management review. Do NOT use JSON.`;

interface MonthlyStats {
  month: string;
  year: number;
  totalIncidents: number;
  resolvedIncidents: number;
  avgResponseMinutes: number;
  previousMonthIncidents: number;
  patrolCompletionRate: number;
  slaComplianceRate: number;
  topCategories: Array<{ category: string; count: number }>;
  zoneBreakdown: Array<{ zone: string; incidents: number; resolved: number; avgResponse: number }>;
  staffUtilization: number;
  overtimeHours: number;
  notableIncidents: Array<{ title: string; category: string; resolution: string }>;
}

export async function generateMonthlyReport(stats: MonthlyStats): Promise<string> {
  const trend = stats.totalIncidents > stats.previousMonthIncidents ? 'increase' : 'decrease';
  const trendPct = stats.previousMonthIncidents > 0
    ? Math.abs(Math.round(((stats.totalIncidents - stats.previousMonthIncidents) / stats.previousMonthIncidents) * 100))
    : 0;

  const userMessage = `Monthly Statistics — ${stats.month} ${stats.year}:

Incidents: ${stats.totalIncidents} total (${trend} of ${trendPct}% from previous month: ${stats.previousMonthIncidents})
Resolved: ${stats.resolvedIncidents} (${Math.round((stats.resolvedIncidents / Math.max(stats.totalIncidents, 1)) * 100)}% resolution rate)
Avg Response Time: ${stats.avgResponseMinutes} minutes
Patrol Completion: ${stats.patrolCompletionRate}%
SLA Compliance: ${stats.slaComplianceRate}%
Staff Utilization: ${stats.staffUtilization}%
Overtime Hours: ${stats.overtimeHours}

Top Categories:
${stats.topCategories.map((c) => `- ${c.category}: ${c.count}`).join('\n')}

Zone Breakdown:
${stats.zoneBreakdown.map((z) => `- ${z.zone}: ${z.incidents} incidents, ${z.resolved} resolved, ${z.avgResponse}min avg response`).join('\n')}

Notable Incidents:
${stats.notableIncidents.map((n) => `- ${n.title} (${n.category}): ${n.resolution}`).join('\n')}

Write the monthly report:`;

  const result = await chat(MONTHLY_REPORT_PROMPT, userMessage);
  return result || `Monthly Security Report — ${stats.month} ${stats.year}\nTotal Incidents: ${stats.totalIncidents}\nResolved: ${stats.resolvedIncidents}`;
}
