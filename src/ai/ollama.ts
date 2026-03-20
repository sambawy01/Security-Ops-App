import { config } from '../config.js';

interface OllamaChatResponse {
  message: { role: string; content: string };
  done: boolean;
}

/**
 * Send a chat request to Ollama and return the raw text response.
 * Never throws — returns empty string on any failure.
 */
export async function chat(
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  try {
    const res = await fetch(`${config.OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.AI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 2048,
        },
      }),
    });

    if (!res.ok) {
      console.error(`[ollama] HTTP ${res.status}: ${res.statusText}`);
      return '';
    }

    const data = (await res.json()) as OllamaChatResponse;
    return data.message?.content?.trim() ?? '';
  } catch (err) {
    console.error('[ollama] chat error:', (err as Error).message);
    return '';
  }
}

/**
 * Send a chat request and parse the response as JSON.
 * Extracts JSON from markdown code fences if present.
 * Returns null on any failure (network, parse, etc.).
 */
export async function chatJSON<T>(
  systemPrompt: string,
  userMessage: string,
): Promise<T | null> {
  const raw = await chat(systemPrompt, userMessage);
  if (!raw) return null;

  try {
    // Strip markdown code fences if present
    const jsonStr = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    return JSON.parse(jsonStr) as T;
  } catch {
    // Try to find JSON object/array in the response
    const match = raw.match(/[\[{][\s\S]*[\]}]/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        console.error('[ollama] failed to parse JSON from response');
        return null;
      }
    }
    console.error('[ollama] no valid JSON found in response');
    return null;
  }
}

/**
 * Check whether Ollama is reachable and the configured model is available.
 */
export async function isAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${config.OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;

    const data = (await res.json()) as { models?: Array<{ name: string }> };
    const models = data.models ?? [];
    return models.some((m) => m.name.startsWith(config.AI_MODEL));
  } catch {
    return false;
  }
}
