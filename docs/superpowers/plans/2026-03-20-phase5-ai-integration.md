# Phase 5: AI Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate local Ollama AI into every security operation — complaint triage, dispatch explanation, anomaly detection, report generation, pattern analysis, and natural language queries.

**Architecture:** Ollama service added to Docker Compose. AI service module wraps Ollama API calls with prompt templates. BullMQ workers process AI jobs asynchronously. Every AI feature has a non-AI fallback.

**Tech Stack:** Ollama (Qwen2.5:7B), BullMQ, Node.js workers, 16 prompt templates.

---

## Deferred
- Predictive intelligence (incident prediction, fatigue scoring, sentiment tracking) — needs 6+ months of data
- Situation assessment at 5-min intervals — start at 15-min to reduce token budget
- Performance metrics materialized view — build when needed for weekly reports

## File Structure

```
src/
├── ai/
│   ├── ollama.ts                         # Ollama API client (POST /api/chat)
│   ├── prompts/
│   │   ├── triage.ts                     # TRIAGE-01, TRIAGE-02 templates
│   │   ├── dispatch.ts                   # DISPATCH-01 template
│   │   ├── resolve.ts                    # RESOLVE-01 template
│   │   ├── duplicate.ts                  # DUPLICATE-01 template
│   │   ├── handover.ts                   # HANDOVER-01 template
│   │   ├── reports.ts                    # REPORT-DAILY, REPORT-WEEKLY, REPORT-MONTHLY
│   │   ├── patterns.ts                   # PATTERN-01, STAFFING-01
│   │   ├── anomaly.ts                    # ANOMALY-01
│   │   ├── situation.ts                  # SITUATION-01
│   │   └── nlq.ts                        # NLQ-CLASSIFY, NLQ-FORMAT
│   └── service.ts                        # AI service — high-level functions called by routes/workers
├── workers/
│   ├── setup.ts                          # BullMQ queue + worker setup
│   ├── sla-monitor.worker.ts             # SLA deadline checker (every 60s)
│   ├── anomaly.worker.ts                 # Anomaly detection (every 5min)
│   ├── pattern.worker.ts                 # Pattern detection (hourly)
│   ├── report.worker.ts                  # Daily/weekly/monthly report generation
│   └── staffing.worker.ts               # Weekly staffing recommendations
├── routes/
│   └── ai.routes.ts                      # AI API endpoints (/api/v1/ai/*)
```

---

## Task 1: Ollama in Docker + AI Client

**Files:**
- Modify: `docker-compose.yml` — add Ollama service
- Create: `src/ai/ollama.ts` — Ollama API wrapper

- [ ] **Step 1: Add Ollama to docker-compose.yml**

```yaml
  ollama:
    image: ollama/ollama
    ports:
      - '11434:11434'
    volumes:
      - ollama_data:/root/.ollama

volumes:
  pgdata:
  ollama_data:
```

- [ ] **Step 2: Start Ollama and pull model**

```bash
docker compose up -d ollama
docker exec -it sec-ops-os-ollama-1 ollama pull qwen2.5:7b
```

- [ ] **Step 3: Create Ollama API client (src/ai/ollama.ts)**

```typescript
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.AI_MODEL || 'qwen2.5:7b';

interface OllamaResponse {
  message: { content: string };
}

export async function chat(systemPrompt: string, userMessage: string): Promise<string> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        stream: false,
        options: { temperature: 0.3 }, // Low temp for consistent structured output
      }),
    });
    if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
    const data: OllamaResponse = await res.json();
    return data.message.content;
  } catch (err) {
    console.error('AI inference failed:', err);
    return ''; // Empty = AI unavailable, triggers fallback
  }
}

export async function chatJSON<T>(systemPrompt: string, userMessage: string): Promise<T | null> {
  const raw = await chat(systemPrompt, userMessage);
  if (!raw) return null;
  try {
    // Extract JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    return null;
  }
}

export async function isAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    return res.ok;
  } catch { return false; }
}
```

- [ ] **Step 4: Add OLLAMA_URL to .env**

```
OLLAMA_URL=http://localhost:11434
AI_MODEL=qwen2.5:7b
```

Update `src/config.ts` to include these.

- [ ] **Step 5: Verify Ollama responds**

```bash
curl http://localhost:11434/api/tags
curl -s http://localhost:11434/api/chat -d '{"model":"qwen2.5:7b","messages":[{"role":"user","content":"hello"}],"stream":false}' | head -c 200
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: Ollama Docker service + AI client wrapper"
```

---

## Task 2: Prompt Templates (All 16)

**Files:**
- Create: All files in `src/ai/prompts/`

Each prompt template is a function that builds the system prompt and user message, then calls `chatJSON` or `chat`.

- [ ] **Step 1: Create triage prompts (src/ai/prompts/triage.ts)**

TRIAGE-01 (WhatsApp complaint) and TRIAGE-02 (officer incident):

```typescript
import { chatJSON } from '../ollama.js';

interface TriageResult {
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  zone: string | null;
  suggestedReply: string;
}

const SYSTEM_PROMPT = `You are a security operations AI for El Gouna resort community in Egypt.
Classify incoming security complaints into one of these categories:
1. security_threat (تهديد أمني) — intrusion, suspicious person, theft, assault
2. fire_safety (حريق/سلامة) — fire, gas leak, hazardous material
3. accidents (حوادث) — injuries, vehicle accidents
4. trespassing (تعدي) — unauthorized access, boundary violation
5. infrastructure (بنية تحتية) — broken gate, lighting, water leak
6. traffic_parking (مرور/مواقف) — illegal parking, road blockage
7. noise_complaint (ضوضاء) — parties, construction, vehicles
8. animal_control (حيوانات) — stray dogs, wildlife
9. general_complaint (شكوى عامة) — anything else

Zones: Downtown (وسط البلد), Marina (المارينا), Kafr (الكفر), West Golf (جولف غرب), South Golf (جولف جنوب), Industrial (المنطقة الصناعية)

Priority rules:
- critical: life-threatening, active crime, fire
- high: property damage, injury, trespassing
- medium: infrastructure, traffic, non-urgent
- low: noise, animals, general complaints
- Upgrade priority if words indicate urgency (attacking, emergency, fire, injured, dangerous)

Respond ONLY with valid JSON: {"category":"...","priority":"...","zone":"...or null","suggestedReply":"Arabic reply acknowledging the complaint"}`;

export async function triageWhatsApp(message: string): Promise<TriageResult | null> {
  return chatJSON<TriageResult>(SYSTEM_PROMPT, message);
}

export async function triageIncident(description: string): Promise<{ category: string; priority: string } | null> {
  const prompt = SYSTEM_PROMPT.replace('suggestedReply', '').replace('Respond ONLY with valid JSON: {"category":"...","priority":"...","zone":"...or null","suggestedReply":"Arabic reply acknowledging the complaint"}', 'Respond ONLY with valid JSON: {"category":"...","priority":"..."}');
  return chatJSON(prompt, description);
}
```

- [ ] **Step 2: Create dispatch prompt (src/ai/prompts/dispatch.ts)**

DISPATCH-01: Takes top 3 officer candidates with scores + incident details, returns Arabic explanation.

- [ ] **Step 3: Create resolve prompt (src/ai/prompts/resolve.ts)**

RESOLVE-01: Takes current incident + 5 similar past incidents, returns Arabic resolution suggestion.

- [ ] **Step 4: Create duplicate prompt (src/ai/prompts/duplicate.ts)**

DUPLICATE-01: Takes two incident descriptions, returns `{is_duplicate: bool, confidence: float}`.

- [ ] **Step 5: Create handover prompt (src/ai/prompts/handover.ts)**

HANDOVER-01: Takes shift summary JSON, returns 2-paragraph Arabic narrative.

- [ ] **Step 6: Create report prompts (src/ai/prompts/reports.ts)**

REPORT-DAILY, REPORT-WEEKLY (Arabic), REPORT-MONTHLY (English). Each takes pre-aggregated stats JSON, returns narrative text.

- [ ] **Step 7: Create pattern + staffing prompts (src/ai/prompts/patterns.ts)**

PATTERN-01: Takes aggregated incident stats, returns insight cards. STAFFING-01: Takes zone staffing vs incident density, returns recommendation.

- [ ] **Step 8: Create anomaly prompt (src/ai/prompts/anomaly.ts)**

ANOMALY-01: Takes alert type + context, returns 1-2 sentence Arabic alert text.

- [ ] **Step 9: Create situation prompt (src/ai/prompts/situation.ts)**

SITUATION-01: Takes zone stats, returns one-line status per zone.

- [ ] **Step 10: Create NLQ prompts (src/ai/prompts/nlq.ts)**

NLQ-CLASSIFY: Classifies user question into template type + extracts parameters.
NLQ-FORMAT: Takes query results, formats as Arabic/English answer.

- [ ] **Step 11: Commit**

```bash
git add -A && git commit -m "feat: 16 AI prompt templates — triage, dispatch, reports, patterns, NLQ"
```

---

## Task 3: AI Service Layer

**Files:**
- Create: `src/ai/service.ts` — high-level AI functions used by routes and workers

Functions:
- `triageComplaint(message: string)` → uses TRIAGE-01, falls back to defaults
- `categorizeIncident(description: string)` → uses TRIAGE-02
- `explainDispatch(officers, incident)` → uses DISPATCH-01
- `suggestResolution(incident, similarIncidents)` → uses RESOLVE-01
- `checkDuplicate(desc1, desc2)` → uses DUPLICATE-01
- `generateHandoverBrief(shiftData)` → uses HANDOVER-01
- `generateDailyReport(stats)` → uses REPORT-DAILY
- `generateWeeklyReport(stats)` → uses REPORT-WEEKLY
- `generateMonthlyReport(stats)` → uses REPORT-MONTHLY
- `detectPatterns(incidentStats)` → uses PATTERN-01
- `recommendStaffing(zoneData)` → uses STAFFING-01
- `generateAnomalyAlert(alertData)` → uses ANOMALY-01
- `assessSituation(zoneStats)` → uses SITUATION-01
- `classifyQuery(question)` → uses NLQ-CLASSIFY
- `formatQueryAnswer(results, question)` → uses NLQ-FORMAT

Each function: calls the prompt, parses result, stores in `ai_suggestions` or `ai_analyses` table, returns result. On failure: returns null (fallback behavior).

- [ ] **Step 1: Create service with all functions**
- [ ] **Step 2: Write tests for triage (mock Ollama responses)**
- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: AI service layer — all 16 functions with fallbacks"
```

---

## Task 4: BullMQ Workers Setup

**Files:**
- Create: `src/workers/setup.ts` — queue and worker configuration
- Modify: `src/index.ts` — start workers alongside API server

Install BullMQ:
```bash
npm install bullmq
```

- [ ] **Step 1: Create worker setup**

`src/workers/setup.ts`:
```typescript
import { Queue, Worker } from 'bullmq';
import { redis } from '../lib/redis.js';

const connection = { host: 'localhost', port: 6380 }; // Match .env REDIS_URL port

// Define queues
export const slaQueue = new Queue('sla-monitor', { connection });
export const anomalyQueue = new Queue('anomaly-detection', { connection });
export const patternQueue = new Queue('pattern-detection', { connection });
export const reportQueue = new Queue('report-generation', { connection });
export const staffingQueue = new Queue('staffing-recommendation', { connection });

// Schedule recurring jobs
export async function setupRecurringJobs() {
  await slaQueue.add('check-sla', {}, { repeat: { every: 60000 } }); // Every 60s
  await anomalyQueue.add('check-anomalies', {}, { repeat: { every: 300000 } }); // Every 5min
  await patternQueue.add('detect-patterns', {}, { repeat: { every: 3600000 } }); // Every hour
  await reportQueue.add('daily-report', {}, { repeat: { pattern: '0 22 * * *' } }); // 22:00 daily
  await reportQueue.add('weekly-report', {}, { repeat: { pattern: '0 6 * * 0' } }); // Sunday 06:00
  await reportQueue.add('monthly-report', {}, { repeat: { pattern: '0 6 1 * *' } }); // 1st of month
  await staffingQueue.add('weekly-staffing', {}, { repeat: { pattern: '0 6 * * 0' } }); // Sunday 06:00
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: BullMQ worker setup with recurring job schedules"
```

---

## Task 5: SLA Monitor Worker

**Files:**
- Create: `src/workers/sla-monitor.worker.ts`

Runs every 60 seconds. Checks all open incidents against SLA deadlines:

- Finds incidents where `sla_response_deadline < NOW()` and status is still 'assigned' → escalate
- Finds incidents where `sla_resolution_deadline < NOW()` and status is still open/assigned/in_progress → escalate
- Creates IncidentUpdate records for escalation
- Updates incident status to 'escalated' if not already

This is deterministic — no AI needed.

- [ ] **Step 1: Create SLA monitor worker**
- [ ] **Step 2: Write tests**
- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: SLA monitor worker — auto-escalation on deadline breach"
```

---

## Task 6: Anomaly Detection Worker

**Files:**
- Create: `src/workers/anomaly.worker.ts`

Runs every 5 minutes. Deterministic checks with AI-generated alert text:

1. **Officer stationary >20min during patrol:** Check officer_locations for officers on active patrol where latest 4+ locations (20min) have <10m spread
2. **Officer outside zone:** PostGIS point-in-polygon check for active officers
3. **Incident volume spike:** Count incidents per zone in last hour vs 4-week average for same hour
4. **Missed checkpoints:** Patrol logs where started_at > 60min ago and confirmed count < expected

Each detected anomaly: generate alert text via ANOMALY-01 prompt, store in `ai_analyses` table.

- [ ] **Step 1: Create anomaly worker with all 4 checks**
- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: anomaly detection worker — stationary, zone, volume, checkpoint checks"
```

---

## Task 7: Pattern Detection + Staffing Workers

**Files:**
- Create: `src/workers/pattern.worker.ts`, `src/workers/staffing.worker.ts`

### Pattern Worker (hourly)
- SQL: aggregate incidents by zone, category, hour-of-day, day-of-week for last 7/14/30 days
- SQL: identify spatial clusters using PostGIS density
- Pass aggregated stats to PATTERN-01 prompt
- Store results in `ai_analyses` table

### Staffing Worker (weekly)
- SQL: incident density per zone per time slot vs current shift officer count
- Pass to STAFFING-01 prompt
- Store recommendation in `ai_analyses` table

- [ ] **Step 1: Create pattern worker**
- [ ] **Step 2: Create staffing worker**
- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: pattern detection + staffing recommendation workers"
```

---

## Task 8: Report Generation Worker

**Files:**
- Create: `src/workers/report.worker.ts`

Handles daily, weekly, and monthly reports:

**Daily report (22:00):**
- SQL: aggregate day's incidents, response times, patrol completion, attendance
- Pass stats to REPORT-DAILY prompt → Arabic narrative
- Store in `generated_reports` table with type='daily'

**Weekly report (Sunday 06:00):**
- SQL: aggregate week's data, compare to previous week
- Pass to REPORT-WEEKLY prompt
- Store with type='weekly'

**Monthly report (1st of month, 06:00):**
- SQL: full month aggregation, zone comparison, trend analysis
- Pass to REPORT-MONTHLY prompt → **English** narrative
- Store with type='monthly'

All reports: data section (JSON) always generated even if LLM fails. Narrative section is best-effort.

- [ ] **Step 1: Create report worker with all 3 types**
- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: report generation worker — daily, weekly, monthly"
```

---

## Task 9: AI API Routes

**Files:**
- Create: `src/routes/ai.routes.ts`
- Modify: `src/server.ts` — register AI routes

Endpoints:

1. `POST /api/v1/ai/triage` — triage a message (used by WhatsApp webhook)
2. `POST /api/v1/ai/categorize` — categorize incident description
3. `POST /api/v1/ai/dispatch-explain` — explain a dispatch recommendation
4. `POST /api/v1/ai/resolve-suggest` — suggest resolution for an incident
5. `GET /api/v1/ai/patterns` — latest pattern analyses
6. `GET /api/v1/ai/anomalies` — latest anomaly alerts
7. `GET /api/v1/ai/staffing` — latest staffing recommendations
8. `GET /api/v1/ai/reports` — list generated reports
9. `GET /api/v1/ai/reports/:id` — report detail
10. `POST /api/v1/ai/query` — natural language query (experimental)
11. `GET /api/v1/ai/status` — Ollama health check

RBAC: manager + assistant_manager for all. supervisor for patterns/anomalies in their zone. operator for triage/dispatch.

- [ ] **Step 1: Create AI routes**
- [ ] **Step 2: Register in server.ts**
- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: AI API routes — triage, patterns, reports, NLQ"
```

---

## Task 10: Wire AI into Existing Workflows

**Files:**
- Modify: `src/routes/incidents.routes.ts` — add AI triage on incident create
- Modify: `src/routes/incidents.routes.ts` — add dispatch explanation on assign

Key integrations:

1. **On incident create:** If description provided, call `categorizeIncident()` to suggest category/priority. Store suggestion in `ai_suggestions`. If no category was provided by user, use AI suggestion.

2. **On incident assign:** Call `explainDispatch()` with the assigned officer + alternatives. Store explanation in `ai_suggestions`.

3. **On WhatsApp message (future):** Call `triageComplaint()`. Create incident with AI-suggested category/priority/zone.

All integrations are fire-and-forget (async, don't block the response). If AI fails, the workflow continues normally.

- [ ] **Step 1: Add AI categorization to incident create**
- [ ] **Step 2: Add dispatch explanation to incident assign**
- [ ] **Step 3: Run all backend tests**
- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: wire AI into incident create + dispatch workflows"
```

---

## Task 11: Dashboard AI Panel

**Files:**
- Create: `dashboard/src/components/ai/AiInsightsPanel.tsx`
- Create: `dashboard/src/components/ai/PatternCard.tsx`
- Create: `dashboard/src/components/ai/AnomalyAlert.tsx`
- Create: `dashboard/src/hooks/useAi.ts`
- Modify: `dashboard/src/pages/DashboardPage.tsx` — add AI panel
- Create: `dashboard/src/pages/ReportsPage.tsx` — report viewer

### AI Insights Panel (sidebar or tab on dashboard)
- Latest pattern insights (cards with confidence scores)
- Active anomaly alerts (red/yellow)
- Staffing recommendations
- Natural language query input (experimental)

### Reports Page
- List of generated reports (daily/weekly/monthly)
- Click to view report with data tables + narrative
- Export as PDF (window.print() for now)

- [ ] **Step 1: Create AI data hooks**
- [ ] **Step 2: Create AI panel components**
- [ ] **Step 3: Create Reports page**
- [ ] **Step 4: Add to dashboard navigation**
- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: dashboard AI panel — patterns, anomalies, reports, NLQ"
```

---

## Task 12: Start Workers + Verification

- [ ] **Step 1: Wire workers into index.ts**

Start workers alongside the API server:
```typescript
import { setupRecurringJobs } from './workers/setup.js';
// ... after app.listen:
await setupRecurringJobs();
console.log('Background workers started');
```

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

- [ ] **Step 3: Manual verification**

- Start API with Ollama running
- Create an incident → verify AI suggests category
- Check `/api/v1/ai/status` → Ollama health
- Wait for anomaly worker to run → check `/api/v1/ai/anomalies`
- Trigger daily report manually → check `/api/v1/ai/reports`

- [ ] **Step 4: Commit and push**

```bash
git add -A && git commit -m "feat: AI integration complete — workers, prompts, routes, dashboard panel"
git push origin main
```
