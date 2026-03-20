import { chat } from '../ollama.js';

const SITUATION_SYSTEM_PROMPT = `أنت نظام تقييم وضع أمني. لكل منطقة، اكتب سطراً واحداً يصف الحالة الأمنية الحالية.

التنسيق لكل منطقة:
المنطقة: [حالة مختصرة بالعربية]

الحالات الممكنة:
- هادئة ✅ (لا حوادث نشطة، دوريات منتظمة)
- طبيعية (حوادث بسيطة قيد المعالجة)
- تحت المراقبة ⚠️ (حوادث متعددة أو استجابة بطيئة)
- حرجة 🔴 (حوادث خطيرة نشطة أو نقص في التغطية)

اكتب سطراً واحداً لكل منطقة. لا تستخدم JSON.`;

interface ZoneStatus {
  zone: string;
  activeIncidents: number;
  criticalIncidents: number;
  officersOnDuty: number;
  patrolActive: boolean;
  avgResponseMinutes: number;
}

export async function assessSituation(zoneStats: ZoneStatus[]): Promise<string> {
  const userMessage = `الوضع الحالي للمناطق:

${zoneStats.map((z) => `${z.zone}:
- حوادث نشطة: ${z.activeIncidents} (حرجة: ${z.criticalIncidents})
- ضباط في الخدمة: ${z.officersOnDuty}
- دورية نشطة: ${z.patrolActive ? 'نعم' : 'لا'}
- متوسط الاستجابة: ${z.avgResponseMinutes} دقيقة`).join('\n\n')}

قيّم الوضع لكل منطقة:`;

  const result = await chat(SITUATION_SYSTEM_PROMPT, userMessage);
  if (result) return result;

  // Fallback: generate basic status per zone
  return zoneStats.map((z) => {
    if (z.criticalIncidents > 0) return `${z.zone}: حرجة — ${z.criticalIncidents} حادثة حرجة نشطة`;
    if (z.activeIncidents > 2) return `${z.zone}: تحت المراقبة — ${z.activeIncidents} حادثة نشطة`;
    if (z.activeIncidents > 0) return `${z.zone}: طبيعية — ${z.activeIncidents} حادثة قيد المعالجة`;
    return `${z.zone}: هادئة`;
  }).join('\n');
}
