import { chat, chatJSON } from '../ollama.js';

// ─── Query Classification ───────────────────────────────────────────────────

const CLASSIFY_SYSTEM_PROMPT = `You are a natural language query classifier for a security operations system.
Given a question in Arabic or English, determine which pre-built query template to use and extract parameters.

Available templates:
1. incidents_by_zone — "How many incidents in [zone]?" / "كم حادثة في [منطقة]؟"
   params: { zone: string, startDate?: string, endDate?: string }

2. incidents_by_category — "What are the top incident types?" / "ما أكثر أنواع الحوادث؟"
   params: { startDate?: string, endDate?: string, limit?: number }

3. officer_performance — "How is officer [name/badge] performing?" / "ما أداء الضابط [اسم]؟"
   params: { officerQuery: string, startDate?: string, endDate?: string }

4. response_time — "What is the average response time?" / "ما متوسط وقت الاستجابة؟"
   params: { zone?: string, category?: string, startDate?: string, endDate?: string }

5. patrol_coverage — "What is the patrol completion rate?" / "ما نسبة إتمام الدوريات؟"
   params: { zone?: string, startDate?: string, endDate?: string }

6. sla_compliance — "Are we meeting SLA targets?" / "هل نلتزم بمعايير SLA؟"
   params: { category?: string, startDate?: string, endDate?: string }

7. zone_comparison — "Compare zones" / "قارن بين المناطق"
   params: { metric?: string, startDate?: string, endDate?: string }

8. trend_analysis — "What are the trends?" / "ما الاتجاهات؟"
   params: { metric: string, period?: string }

If the question does not match any template, return null.

Respond ONLY with valid JSON:
{ "templateId": "<template_name>", "parameters": { ... } }
or null`;

export interface QueryClassification {
  templateId: string;
  parameters: Record<string, unknown>;
}

export async function classifyQuery(question: string): Promise<QueryClassification | null> {
  return chatJSON<QueryClassification>(
    CLASSIFY_SYSTEM_PROMPT,
    `Classify this question:\n\n${question}`,
  );
}

// ─── Answer Formatting ──────────────────────────────────────────────────────

const FORMAT_ANSWER_PROMPT = `You are a security operations assistant. Given query results and the original question, write a clear answer.

Rules:
- If the question is in Arabic, answer in Arabic
- If the question is in English, answer in English
- Use numbers and bullet points for clarity
- Keep the answer concise (2-5 sentences)
- If data is empty, say so politely

Do NOT use JSON. Write the answer directly.`;

export async function formatAnswer(
  results: unknown,
  question: string,
): Promise<string> {
  const userMessage = `Original question: ${question}

Query results:
${JSON.stringify(results, null, 2)}

Write the answer:`;

  const result = await chat(FORMAT_ANSWER_PROMPT, userMessage);
  return result || 'لم يتم العثور على نتائج. / No results found.';
}
