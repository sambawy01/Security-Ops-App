import { chat } from '../ollama.js';

const HANDOVER_SYSTEM_PROMPT = `أنت مساعد لعمليات الأمن. اكتب ملخص تسليم الوردية باللغة العربية في فقرتين:

الفقرة الأولى: ملخص الأحداث والحوادث الرئيسية خلال الوردية.
الفقرة الثانية: ملاحظات مهمة للوردية القادمة وأي أمور معلقة تحتاج متابعة.

اكتب بأسلوب رسمي مختصر مناسب لتقارير الأمن. لا تستخدم JSON.`;

interface ShiftData {
  incidents: Array<{ title: string; status: string; priority: string }>;
  patrols: Array<{ route: string; status: string }>;
  attendance: { present: number; absent: number; late: number };
  notable: string[];
}

export async function generateHandoverBrief(shiftData: ShiftData): Promise<string> {
  const incidentSummary = shiftData.incidents.length > 0
    ? shiftData.incidents.map((i) => `- ${i.title} (${i.priority}/${i.status})`).join('\n')
    : 'لا توجد حوادث';

  const patrolSummary = shiftData.patrols.length > 0
    ? shiftData.patrols.map((p) => `- ${p.route}: ${p.status}`).join('\n')
    : 'لا توجد دوريات';

  const userMessage = `بيانات الوردية:

الحوادث (${shiftData.incidents.length}):
${incidentSummary}

الدوريات (${shiftData.patrols.length}):
${patrolSummary}

الحضور: ${shiftData.attendance.present} حاضر، ${shiftData.attendance.absent} غائب، ${shiftData.attendance.late} متأخر

ملاحظات بارزة:
${shiftData.notable.length > 0 ? shiftData.notable.map((n) => `- ${n}`).join('\n') : 'لا توجد'}

اكتب ملخص التسليم:`;

  const result = await chat(HANDOVER_SYSTEM_PROMPT, userMessage);
  return result || 'لم يتم توليد ملخص التسليم. يرجى مراجعة البيانات يدوياً.';
}
