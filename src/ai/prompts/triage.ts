import { chatJSON } from '../ollama.js';

const TRIAGE_SYSTEM_PROMPT = `You are a security operations triage AI for a resort community in Saudi Arabia.
Your job is to classify incoming messages (Arabic or English) into categories, assign priority, determine the zone, and suggest a reply.

CATEGORIES (9):
1. theft — سرقة: keywords: سرقة, مسروق, stolen, theft, missing items
2. trespassing — تسلل: keywords: تسلل, دخول غير مصرح, unauthorized, intruder, trespassing
3. noise_complaint — إزعاج: keywords: إزعاج, ضوضاء, صوت عالي, noise, loud, disturbance
4. property_damage — تلف ممتلكات: keywords: تلف, كسر, تخريب, damage, vandalism, broken
5. suspicious_activity — نشاط مشبوه: keywords: مشبوه, غريب, suspicious, strange, unusual
6. medical_emergency — طوارئ طبية: keywords: إسعاف, طوارئ, مريض, ambulance, medical, injury, hurt
7. fire — حريق: keywords: حريق, دخان, نار, fire, smoke, flames
8. traffic — مرور: keywords: حادث, مرور, سيارة, accident, traffic, parking, vehicle
9. general — عام: anything that does not fit above

ZONES (6):
1. north_gate — البوابة الشمالية
2. south_gate — البوابة الجنوبية
3. residential_a — السكنية أ
4. residential_b — السكنية ب
5. commercial — التجاري
6. beach — الشاطئ

PRIORITY RULES:
- critical: fire, medical_emergency, active threat
- high: theft in progress, trespassing, suspicious_activity at night
- medium: noise_complaint, property_damage, traffic
- low: general inquiries, minor requests

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "category": "<one of the 9 categories>",
  "priority": "critical|high|medium|low",
  "zone": "<zone_id or null if unclear>",
  "suggestedReply": "<brief Arabic reply to send back to the reporter>"
}`;

export interface TriageResult {
  category: string;
  priority: string;
  zone: string | null;
  suggestedReply: string;
}

export async function triageWhatsApp(message: string): Promise<TriageResult | null> {
  return chatJSON<TriageResult>(
    TRIAGE_SYSTEM_PROMPT,
    `Classify this WhatsApp message:\n\n${message}`,
  );
}

const INCIDENT_TRIAGE_PROMPT = `You are a security incident classifier. Given an incident description (Arabic or English), determine its category and priority.

CATEGORIES: theft, trespassing, noise_complaint, property_damage, suspicious_activity, medical_emergency, fire, traffic, general

PRIORITY: critical, high, medium, low
- critical: life-threatening or active threat
- high: ongoing crime or security breach
- medium: disturbance, damage, or traffic issue
- low: general or informational

Respond ONLY with valid JSON:
{ "category": "<category>", "priority": "critical|high|medium|low" }`;

export interface IncidentTriageResult {
  category: string;
  priority: string;
}

export async function triageIncident(description: string): Promise<IncidentTriageResult | null> {
  return chatJSON<IncidentTriageResult>(
    INCIDENT_TRIAGE_PROMPT,
    `Classify this incident:\n\n${description}`,
  );
}
