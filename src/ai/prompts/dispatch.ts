import { chat } from '../ollama.js';

const DISPATCH_SYSTEM_PROMPT = `أنت مساعد ذكي لعمليات الأمن في مجتمع سكني. مهمتك شرح قرار تعيين ضابط لحادثة بناءً على البيانات المقدمة.

اكتب شرحاً مختصراً باللغة العربية (3-5 جمل) يوضح:
1. لماذا تم اختيار الضابط صاحب أعلى نتيجة
2. العوامل المؤثرة (المسافة، عبء العمل، المهارات)
3. لماذا لم يتم اختيار الضباط الآخرين

اكتب بأسلوب مهني واضح. لا تستخدم JSON.`;

interface OfficerCandidate {
  name: string;
  badge: string;
  score: number;
  distance: number;
  workload: number;
}

interface IncidentContext {
  title: string;
  category: string;
  zone: string;
}

export async function explainDispatch(
  officers: OfficerCandidate[],
  incident: IncidentContext,
): Promise<string> {
  const userMessage = `الحادثة: ${incident.title}
التصنيف: ${incident.category}
المنطقة: ${incident.zone}

المرشحون:
${officers.map((o, i) => `${i + 1}. ${o.name} (${o.badge}) — النتيجة: ${o.score}, المسافة: ${o.distance} م, عبء العمل: ${o.workload} حادثة`).join('\n')}

اشرح لماذا تم اختيار الضابط الأول.`;

  const result = await chat(DISPATCH_SYSTEM_PROMPT, userMessage);
  return result || `تم تعيين ${officers[0]?.name ?? 'الضابط'} بناءً على أقرب مسافة وأقل عبء عمل.`;
}
