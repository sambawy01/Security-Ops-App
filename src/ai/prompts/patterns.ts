import { chat } from '../ollama.js';

// ─── Pattern Narration (Arabic/English insight cards) ───────────────────────

const PATTERNS_SYSTEM_PROMPT = `You are a security analytics AI. Analyze the provided statistics and generate insight cards.

For each insight, produce a JSON array of objects:
[
  {
    "titleAr": "عنوان البطاقة",
    "titleEn": "Card Title",
    "bodyAr": "شرح مختصر بالعربية",
    "bodyEn": "Brief explanation in English",
    "severity": "info|warning|critical",
    "metric": "the key number"
  }
]

Generate 3-6 insight cards covering:
- Unusual spikes or drops in incidents
- Category distribution anomalies
- Zone hotspots
- Time-of-day patterns
- Response time trends

Respond ONLY with the JSON array.`;

interface PatternStats {
  incidentsByHour: Record<string, number>;
  incidentsByDay: Record<string, number>;
  categoryTrends: Array<{ category: string; thisWeek: number; lastWeek: number }>;
  zoneHotspots: Array<{ zone: string; count: number; avgCount: number }>;
  responseTimeTrend: Array<{ date: string; avgMinutes: number }>;
}

export async function narratePatterns(stats: PatternStats): Promise<string> {
  const userMessage = `Security pattern data:

Incidents by hour: ${JSON.stringify(stats.incidentsByHour)}
Incidents by day: ${JSON.stringify(stats.incidentsByDay)}

Category trends (this week vs last):
${stats.categoryTrends.map((c) => `- ${c.category}: ${c.thisWeek} (was ${c.lastWeek})`).join('\n')}

Zone hotspots:
${stats.zoneHotspots.map((z) => `- ${z.zone}: ${z.count} incidents (avg: ${z.avgCount})`).join('\n')}

Response time trend:
${stats.responseTimeTrend.map((r) => `- ${r.date}: ${r.avgMinutes}min`).join('\n')}

Generate insight cards:`;

  const result = await chat(PATTERNS_SYSTEM_PROMPT, userMessage);
  return result || '[]';
}

// ─── Staffing Recommendation (Arabic) ───────────────────────────────────────

const STAFFING_SYSTEM_PROMPT = `أنت مستشار أمني ذكي. بناءً على بيانات المناطق، اكتب توصيات لتوزيع الأفراد باللغة العربية.

لكل منطقة، حدد:
- هل التغطية كافية أم تحتاج تعزيز
- أوقات الذروة التي تحتاج أفراد إضافيين
- اقتراحات إعادة التوزيع

اكتب بأسلوب مهني مختصر. لا تستخدم JSON.`;

interface ZoneStaffingData {
  zone: string;
  currentOfficers: number;
  incidentsPerDay: number;
  peakHours: string[];
  avgResponseMinutes: number;
  patrolCoverage: number;
}

export async function recommendStaffing(zoneData: ZoneStaffingData[]): Promise<string> {
  const userMessage = `بيانات المناطق:

${zoneData.map((z) => `المنطقة: ${z.zone}
- الضباط الحاليون: ${z.currentOfficers}
- الحوادث يومياً: ${z.incidentsPerDay}
- ساعات الذروة: ${z.peakHours.join(', ')}
- متوسط الاستجابة: ${z.avgResponseMinutes} دقيقة
- تغطية الدوريات: ${z.patrolCoverage}%
`).join('\n')}

اكتب توصيات التوزيع:`;

  const result = await chat(STAFFING_SYSTEM_PROMPT, userMessage);
  return result || 'لم يتم توليد التوصيات. يرجى مراجعة البيانات يدوياً.';
}
