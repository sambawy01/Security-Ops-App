import { chat } from '../ollama.js';

const RESOLVE_SYSTEM_PROMPT = `أنت مساعد أمني ذكي. بناءً على تفاصيل الحادثة وحوادث مشابهة سابقة، اقترح خطوات حل واضحة.

اكتب باللغة العربية على شكل نقاط (bullet points):
- كل نقطة تبدأ بفعل أمر
- 3-6 نقاط حسب تعقيد الحادثة
- اذكر إن كان يلزم تصعيد أو استدعاء جهة خارجية

لا تستخدم JSON. اكتب النقاط مباشرة.`;

interface IncidentForResolution {
  title: string;
  description: string;
  category: string;
}

interface SimilarIncident {
  title: string;
  resolution: string;
}

export async function suggestResolution(
  incident: IncidentForResolution,
  similarIncidents: SimilarIncident[],
): Promise<string> {
  const similarText = similarIncidents.length > 0
    ? `\nحوادث مشابهة سابقة:\n${similarIncidents.map((s, i) => `${i + 1}. ${s.title} — الحل: ${s.resolution}`).join('\n')}`
    : '\nلا توجد حوادث مشابهة سابقة.';

  const userMessage = `الحادثة: ${incident.title}
الوصف: ${incident.description}
التصنيف: ${incident.category}
${similarText}

اقترح خطوات الحل:`;

  const result = await chat(RESOLVE_SYSTEM_PROMPT, userMessage);
  return result || '- تحقق من موقع الحادثة\n- وثّق الملاحظات\n- أبلغ المشرف بالتطورات';
}
