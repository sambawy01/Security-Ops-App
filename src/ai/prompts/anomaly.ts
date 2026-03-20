import { chat } from '../ollama.js';

const ANOMALY_SYSTEM_PROMPT = `أنت نظام تنبيه أمني ذكي. اكتب تنبيهاً مختصراً (جملة أو جملتين) باللغة العربية يصف الحالة غير الطبيعية المكتشفة.

أنواع التنبيهات:
- spike: ارتفاع مفاجئ في الحوادث
- gap: فجوة في تغطية الدوريات
- sla_breach: تجاوز وقت الاستجابة المحدد
- offline: ضابط أو جهاز غير متصل
- zone_overload: منطقة تحت ضغط مرتفع

اكتب التنبيه مباشرة بدون JSON أو تنسيق.`;

export async function narrateAnomaly(
  alertType: string,
  context: Record<string, unknown>,
): Promise<string> {
  const userMessage = `نوع التنبيه: ${alertType}
السياق: ${JSON.stringify(context, null, 2)}

اكتب نص التنبيه:`;

  const result = await chat(ANOMALY_SYSTEM_PROMPT, userMessage);
  if (result) return result;

  // Fallback messages per type
  const fallbacks: Record<string, string> = {
    spike: 'تم رصد ارتفاع غير طبيعي في عدد الحوادث.',
    gap: 'تم رصد فجوة في تغطية الدوريات.',
    sla_breach: 'تم تجاوز وقت الاستجابة المحدد لحادثة.',
    offline: 'تم رصد جهاز أو ضابط غير متصل.',
    zone_overload: 'منطقة تحت ضغط مرتفع — يلزم تعزيز.',
  };
  return fallbacks[alertType] ?? 'تم رصد حالة غير طبيعية تتطلب مراجعة.';
}
