import { chatJSON } from '../ollama.js';

const DUPLICATE_SYSTEM_PROMPT = `You are a duplicate incident detector for a security operations system.
Compare two incident descriptions and determine if they refer to the same real-world event.

Consider:
- Same location or zone mentioned
- Same type of incident
- Similar timeframe (if mentioned)
- Same actors or subjects described
- Language may differ (Arabic/English) — compare meaning, not words

Respond ONLY with valid JSON:
{ "isDuplicate": true/false, "confidence": 0.0-1.0 }

confidence guidelines:
- 0.9-1.0: clearly the same incident
- 0.7-0.89: very likely the same
- 0.5-0.69: possibly the same
- below 0.5: probably different incidents`;

export interface DuplicateResult {
  isDuplicate: boolean;
  confidence: number;
}

export async function checkDuplicate(
  desc1: string,
  desc2: string,
): Promise<DuplicateResult | null> {
  return chatJSON<DuplicateResult>(
    DUPLICATE_SYSTEM_PROMPT,
    `Incident A:\n${desc1}\n\nIncident B:\n${desc2}\n\nAre these duplicates?`,
  );
}
