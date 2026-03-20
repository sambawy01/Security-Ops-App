# Security OS — AI Layer: Role in Every Security Operation

**Date:** 2026-03-20
**Status:** Approved

## Overview

The AI layer is not a standalone module — it is woven into every operational workflow. It acts as an always-on intelligence assistant that watches, analyzes, suggests, and reports. Every AI feature has a non-AI fallback, so the system works without it, but works *smarter* with it.

**Engine:** Ollama running Qwen2.5:7B locally on the server. Zero external API calls. All data stays on-premise.

**Design principle:** AI never makes final decisions. It suggests, ranks, classifies, and summarizes — humans confirm. Every AI action is logged and trackable (accept/reject) for accountability and model improvement.

---

## 1. Incident & Complaint Management

### 1.1 WhatsApp Complaint Triage

**When:** Resident sends a WhatsApp message to the security number.

**What AI does:**
- Reads the message text (Arabic or English)
- Classifies into one of 9 incident categories (Security Threat, Infrastructure, Noise, Traffic, Animal, Fire/Safety, Trespassing, Accidents, General)
- Assigns priority (Critical / High / Medium / Low)
- Identifies the zone based on location keywords or shared GPS
- Generates a suggested auto-reply in Arabic

**Example:**
```
Resident message: "في كلب ضال عند مدخل الكفر وبيهاجم الناس"
(There's a stray dog at Kafr entrance attacking people)

AI output:
  Category: Animal Control
  Priority: High (upgraded from default Low because "attacking")
  Zone: Kafr (from "مدخل الكفر")
  Suggested reply: "تم استلام بلاغك عن حيوان ضال عند مدخل الكفر. تم تعيين ضابط أمن. رقم البلاغ #4832"
```

**Fallback if AI fails:** Incident created as "General Complaint / Medium priority / Unclassified zone." Supervisor triages manually.

**Prompt approach:** System prompt defines the 9 categories with Arabic/English keywords and escalation rules. Message text injected as user prompt. Output is structured JSON parsed by the backend.

---

### 1.2 Incident Auto-Categorization (Officer-Created)

**When:** Officer submits a new incident from the mobile app with a text description or voice note transcription.

**What AI does:**
- Categorizes the incident (same 9 categories)
- Suggests priority based on description severity keywords
- Pre-fills the category and priority fields — officer can accept or change

**Why this matters:** Officers in the field want to tap 2 buttons and go. AI pre-filling the form saves 15-30 seconds per incident and ensures consistent categorization.

**Fallback:** Category picker defaults to "General." Officer selects manually.

---

### 1.3 Smart Dispatch — Officer Assignment

**When:** New incident is created (from any source).

**What AI does:**

The dispatch is a **two-layer system:**

**Layer 1 — Deterministic scoring algorithm (not LLM):**
```
Score = (0.4 × distance_score) + (0.3 × workload_score) + (0.2 × skill_score) + (0.1 × shift_time_score)
```

| Factor | Calculation |
|--------|------------|
| Distance (40%) | PostGIS ST_Distance from officer's last GPS position to incident location. Closer = higher score. |
| Workload (30%) | Count of active incidents assigned to officer. Fewer = higher score. |
| Skill match (20%) | Officer tags (e.g., "infrastructure", "k9", "first-aid", "traffic") matched against incident category. Match = higher score. |
| Shift time remaining (10%) | Officers with >2 hours remaining score higher. Prevents assigning incidents to officers about to check out. |

**Layer 2 — LLM explanation:**
- LLM receives the top 3 ranked officers with their scores and the incident details
- Generates a human-readable explanation in Arabic for the supervisor:

```
"يُنصح بتعيين الضابط أحمد محمود — الأقرب للموقع (350م)، ليس لديه بلاغات حالية، ولديه خبرة في حوادث البنية التحتية."
(Recommended: Officer Ahmed Mahmoud — closest to location (350m), no active incidents, has infrastructure incident experience.)
```

**Supervisor sees:** Top 3 candidates with scores + AI explanation. Confirms or picks different officer. If no action in 2 minutes, #1 auto-assigned.

**Fallback:** If scoring fails (e.g., no officers have GPS positions), incident appears in supervisor queue for manual assignment. If LLM fails, dispatch works without explanation text.

---

### 1.4 Resolution Suggestions

**When:** Officer opens an assigned incident and taps "AI Suggest."

**What AI does:**
- Searches for similar past incidents (same category, same zone, same keywords)
- Summarizes how they were resolved
- Suggests resolution steps

**Example:**
```
Incident: "Broken gate motor at Downtown checkpoint 7"

AI suggestion:
"3 similar incidents in last 6 months at this checkpoint:
- March 2: Motor replaced by maintenance team (2hr resolution)
- January 15: Temporary manual operation, motor repaired next day
- December 3: Motor reset fixed the issue (15min)

Suggested steps:
1. Try motor reset (power cycle)
2. If reset fails, switch to manual operation
3. Log maintenance request for motor replacement"
```

**Prompt approach:** SQL query finds top 5 similar resolved incidents (same category, keyword overlap in title/description, same zone preferred). Incident summaries passed to LLM with instruction to synthesize resolution advice.

**Fallback:** "No similar incidents found" or button hidden if Ollama is down.

---

### 1.5 Duplicate Detection

**When:** New incident is created.

**What AI does:**
- Checks for open incidents within 500m radius, same category, created in last 2 hours
- If potential duplicate found, alerts the supervisor:

```
"⚠️ Possible duplicate: Incident #4830 (Noise Complaint, Downtown, 12 min ago, 200m away) — same category and nearby location. Review and merge?"
```

**Implementation:** Primarily PostGIS spatial query + time window + category match (deterministic). LLM used only to compare descriptions for semantic similarity if the deterministic check returns multiple candidates.

**Fallback:** Deterministic check runs even without LLM. Only the semantic comparison is lost.

---

## 2. Personnel Management

### 2.1 Shift Optimization

**When:** Weekly cron job (Sunday 06:00).

**What AI does:**
- Analyzes incident density by zone and time slot over the past 4 weeks
- Compares against current staffing allocation
- Identifies mismatches and recommends adjustments

**Example output:**
```
Zone: Marina
Finding: 68% of incidents occur between 20:00-02:00 (nightlife hours),
but night shift only has 12 officers vs. 18 on day shift.

Recommendation: Move 4 officers from day to night shift in Marina zone.
Expected impact: Reduce average response time from 4.2min to 2.8min.
```

**Prompt approach:** SQL aggregates incident count by zone, hour-of-day, day-of-week for past 4 weeks. Current shift roster provided. LLM analyzes the data and produces recommendations in structured JSON + narrative.

**Who sees it:** Security Manager and Assistant Managers in the AI Insights panel. They approve or dismiss each recommendation.

---

### 2.2 Sick Leave Replacement Suggestion

**When:** Officer calls off sick or no-shows.

**What AI does:**
- Queries off-duty officers in the same zone
- Ranks by: rest hours since last shift (fatigue prevention), skill match for zone needs, overtime history (avoid overworking same officers)
- Suggests top 3 replacement candidates

**Implementation:** Deterministic ranking with LLM explanation (same pattern as smart dispatch).

**Fallback:** Supervisor sees list of off-duty officers sorted by zone, chooses manually.

---

### 2.3 Performance Anomaly Detection

**When:** Every 5 minutes (continuous monitoring).

**What AI monitors:**

| Anomaly | Detection Method | Alert |
|---------|-----------------|-------|
| Officer stationary >20 min during patrol | GPS location delta < 10m for 20+ min | Alert zone supervisor |
| Officer outside assigned zone | PostGIS point-in-polygon check | Alert zone supervisor |
| Checkpoint consistently skipped | >3 skips of same checkpoint across shifts | Flag for route review |
| Unusually high incident volume in zone | >2 standard deviations from zone's 4-week average for time slot | Alert ops room |
| Officer response time degrading | Rolling 7-day avg response time increasing | Flag for supervisor review |
| No-show pattern | Officer has 3+ no-shows in 30 days | Alert HR admin |

**Implementation:** All detection is **deterministic** (SQL queries + threshold checks). LLM is used only to generate the alert narrative:

```
"الضابط محمد حسن متوقف عن الحركة منذ 25 دقيقة بالقرب من نقطة تفتيش 47 أثناء دورية الكفر. آخر تحديث للموقع: 14:32."
(Officer Mohamed Hassan has been stationary for 25 min near checkpoint 47 during Kafr patrol. Last GPS update: 14:32.)
```

**Fallback:** Alerts fire with raw data (no narrative text) if LLM is down. Detection itself never depends on LLM.

---

### 2.4 Handover Brief Generation

**When:** T-30 minutes before shift change.

**What AI does:**
- Collects: open incidents, officer positions, patrol completion status, notable events from the shift
- Generates a 2-paragraph Arabic summary highlighting what the incoming shift needs to know

**Example:**
```
ملخص الوردية — وردية النهار 20 مارس 2026:

تم التعامل مع 14 بلاغ خلال الوردية، منها 2 بلاغ بأولوية عالية (حادث مروري في وسط البلد، بلاغ تعدي في المارينا). جميع البلاغات تم حلها ما عدا بلاغ #4856 (إصلاح بوابة الكفر — في انتظار فريق الصيانة، متوقع الانتهاء صباح الغد).

نقاط تحتاج متابعة: الضابط أحمد رضا لم يحضر اليوم (تم تسجيل غياب)، نقطة تفتيش 12 بها عطل في الإضاءة تم الإبلاغ عنه.
```

**Prompt approach:** SQL collects shift data into structured summary. LLM converts to natural Arabic narrative. Template ensures consistent format.

**Fallback:** Handover brief shows structured data (bullet points, tables) without narrative if LLM is down. All data is still available — just not narrated.

---

## 3. Command Dashboard Intelligence

### 3.1 Real-Time Situation Assessment

**When:** Continuous, refreshed every 5 minutes on the dashboard.

**What AI does:**
- Assesses the current security posture across all zones
- Produces a one-line status per zone:

```
Downtown: 🟢 Normal — 8 officers active, 1 open incident (Low priority)
Marina: 🟡 Elevated — 6 officers active, 3 open incidents (1 High), response time above average
Kafr: 🟢 Normal — 10 officers active, 0 open incidents
West Golf: 🔴 Attention — 4 officers active (2 below minimum), 2 open incidents unassigned
```

**Implementation:** Deterministic thresholds define the color status (green/yellow/red based on incident count, staffing level, SLA compliance). LLM generates the summary text.

**Fallback:** Zone status colors and numbers shown without text description.

---

### 3.2 Pattern Detection & Hotspot Analysis

**When:** Hourly cron job.

**What AI does:**

**Spatial patterns (PostGIS-driven, deterministic):**
- Incident density clustering by zone and sub-area (100m grid)
- Identifies emerging hotspots — areas with increasing incident frequency over 7/14/30 day windows

**Temporal patterns (SQL-driven, deterministic):**
- Incident frequency by hour-of-day and day-of-week
- Identifies time slots with statistically higher activity

**Cross-correlation (LLM-assisted):**
- Looks for patterns across categories, zones, and time:

```
"Pattern detected: Noise complaints in Marina zone spike 300% on Thursday
and Friday nights (22:00-02:00). This correlates with weekend restaurant/bar
activity. Consider increasing night patrol in Marina on Thu-Fri."
```

```
"Pattern detected: Infrastructure complaints in Kafr zone have increased
40% over the past month, concentrated around checkpoints 44-48. This may
indicate aging infrastructure in that area requiring a maintenance review."
```

**Prompt approach:** SQL produces aggregated statistics (counts by zone/category/time/trend). LLM interprets the statistics and generates human-readable insights. The LLM does not analyze raw data — it narrates pre-computed findings.

**Who sees it:** Security Manager and Assistant Managers in the AI Insights panel. Displayed as cards with confidence scores and recommended actions.

---

### 3.3 Natural Language Query (Experimental)

**When:** Manager types a question in the AI Insights panel.

**What AI does:**
- Interprets the question and maps it to a pre-built query template
- Fetches data from PostgreSQL
- Formats the answer in natural language

**Pre-built query templates (MVP):**

| Template | Trigger phrases | SQL backing |
|----------|----------------|-------------|
| Zone incident summary | "ايه اللي حصل في [zone]" / "what happened in [zone]" | Incidents WHERE zone = X AND created_at > Y |
| Top complaints this period | "أكتر الشكاوى" / "top complaints" | Incidents GROUP BY category ORDER BY count DESC |
| Officer performance | "أداء الضابط [name]" / "officer [name] performance" | Performance_metrics WHERE officer_id = X |
| Response time analysis | "وقت الاستجابة" / "response time" | AVG(assigned_at - created_at) grouped by zone/period |
| Comparison | "قارن [zone A] مع [zone B]" / "compare [zone A] vs [zone B]" | Incidents + metrics for both zones, side-by-side |
| Trend query | "هل في زيادة في [category]" / "is [category] increasing" | Incident count trend over 4 weeks for category |

**How it works:**
1. LLM classifies the question into one of the template types
2. LLM extracts parameters (zone name, officer name, date range, category)
3. Backend runs the corresponding SQL query with extracted parameters
4. LLM formats the results as a natural language answer

**Example:**
```
Manager: "ايه أكتر الشكاوى الأسبوع ده في المارينا؟"
(What are the most common complaints this week in Marina?)

System:
1. Template: Top complaints
2. Parameters: zone=Marina, period=last 7 days
3. SQL: SELECT category, COUNT(*) FROM incidents WHERE zone='Marina' AND created_at > now()-7d GROUP BY category ORDER BY count DESC
4. Result: Noise(8), Traffic(5), Infrastructure(3), General(2)

AI answer: "أكتر الشكاوى في المارينا الأسبوع ده كانت شكاوى الضوضاء (8 بلاغات)، يليها المرور (5) والبنية التحتية (3). شكاوى الضوضاء زادت 60% مقارنة بالأسبوع اللي فات."
```

**Why experimental:** The LLM may misclassify questions or extract wrong parameters. MVP limits to the 6 pre-built templates above. Questions that don't match a template get: "عذراً، لم أفهم السؤال. جرب صياغة مختلفة." (Sorry, I didn't understand. Try rephrasing.)

**Fallback:** Natural language query panel disabled if Ollama is down. Dashboard data is still fully accessible via standard filters and reports.

---

## 4. Patrol Operations

### 4.1 Route Optimization (Future — Not MVP)

**When:** Patrol routes are created or reviewed.

**What AI will do (Tier 2):**
- Analyze historical incident locations along existing routes
- Suggest route modifications to increase coverage of high-incident areas
- Estimate optimal checkpoint dwell times based on historical incident frequency nearby

**MVP approach:** Routes are manually defined by supervisors. AI provides the data (hotspot maps) but doesn't generate routes.

---

### 4.2 Patrol Compliance Monitoring

**When:** Real-time during active patrols.

**What AI does:**
- Cross-references officer GPS trail with expected patrol route
- Detects: skipped checkpoints, significant route deviation (>500m), unusually fast completion (possible GPS spoofing), stationary periods

**Implementation:** Entirely deterministic (PostGIS calculations + time thresholds). LLM generates the alert text only.

---

## 5. Reporting & Analytics

### 5.1 Daily Shift Report

**When:** Nightly at 22:00 (day shift) and 07:00 (night shift).

**What AI does:**
- Collects all shift data: incidents created/resolved, response times, patrol completion, officer attendance, SLA compliance
- Generates a structured report with:
  - **Data section (SQL-driven):** Tables, counts, averages — always accurate
  - **Narrative section (LLM-generated):** 3-4 paragraph Arabic summary highlighting notable events, trends, and recommendations

**Report structure:**
```
تقرير وردية النهار — 20 مارس 2026

[الملخص التنفيذي — AI generated]
وردية هادئة نسبياً مع 14 بلاغ (أقل من المتوسط بـ 20%). تم حل 12 بلاغ
ضمن مؤشر الأداء، بلاغين معلقين في انتظار الصيانة...

[الإحصائيات — SQL generated]
| المؤشر | القيمة |
|--------|--------|
| إجمالي البلاغات | 14 |
| تم الحل | 12 (86%) |
| متوسط وقت الاستجابة | 3.2 دقيقة |
| الالتزام بالدوريات | 94% |
| حضور الضباط | 97% (1 غياب) |

[البلاغات البارزة — SQL + AI narrative]
...

[التوصيات — AI generated]
...
```

**Fallback:** Report generated with data tables only, no narrative sections.

---

### 5.2 Weekly Strategic Report

**When:** Sunday 06:00.

**What AI does:**
- Aggregates the week's daily reports
- Compares to previous weeks (trending)
- Produces zone-by-zone analysis
- Includes AI staffing recommendations (from 2.1)
- Highlights top 3 issues and top 3 improvements

**Audience:** Security Manager, Assistant Managers.

---

### 5.3 Monthly Management Report (English)

**When:** 1st of each month.

**What AI does:**
- Full month analysis in **English** for ODH management
- Executive summary, KPI dashboard, zone comparison, trend analysis
- Recommendations section with supporting data
- Exported as PDF

**Why English:** ODH management reports are in English. This is the report the Operations Director reads. It must justify the platform's value.

**Prompt approach:** All data pre-aggregated by SQL into structured JSON. LLM generates English narrative sections. Template ensures consistent branding and format.

---

## 6. Predictive Intelligence (Tier 2 — Not MVP)

These capabilities are planned for after MVP stabilization. Documented here to guide the data collection strategy in MVP.

### 6.1 Incident Prediction

**What it will do:** Predict likely incident types and locations for upcoming shifts based on:
- Historical patterns (day-of-week, time-of-day, season, events)
- Weather data (heat waves correlate with more complaints)
- Event calendar (public holidays, Ramadan, festivals)

**MVP data collection:** The incident logging in MVP captures all the data needed. After 6+ months of data, prediction models become viable.

### 6.2 Officer Fatigue Risk Scoring

**What it will do:** Flag officers at risk of fatigue-related errors based on:
- Consecutive shift days without break
- Overtime hours accumulated
- Night shift frequency
- Incident response time degradation trend

**MVP data collection:** Shift records and performance metrics from MVP feed this directly.

### 6.3 Resident Sentiment Tracking

**What it will do:** Analyze WhatsApp complaint tone and frequency per zone to produce a "resident satisfaction score" over time.

**MVP data collection:** WhatsApp message history stored in `whatsapp_messages` table.

---

## AI Architecture Summary

### What the LLM Does vs. Doesn't Do

| LLM Does | LLM Does NOT Do |
|----------|-----------------|
| Classify text (category, priority) | Make dispatch decisions (deterministic algorithm) |
| Generate Arabic/English narratives | Query the database directly |
| Explain recommendations | Override human decisions |
| Summarize data for reports | Access raw data — always pre-aggregated by SQL |
| Interpret natural language questions | Execute actions — only suggests |
| Detect semantic similarity (duplicates) | Replace deterministic anomaly detection |

### Prompt Template Inventory (MVP)

| Template ID | Feature | Input | Output Format |
|-------------|---------|-------|---------------|
| TRIAGE-01 | WhatsApp complaint triage | Message text | JSON: {category, priority, zone, reply} |
| TRIAGE-02 | Officer incident categorization | Description text | JSON: {category, priority} |
| DISPATCH-01 | Dispatch explanation | Top 3 officers + scores + incident | Arabic text (2-3 sentences) |
| RESOLVE-01 | Resolution suggestion | Current incident + 5 similar past incidents | Arabic text (bullet points) |
| DUPLICATE-01 | Duplicate description comparison | Two incident descriptions | JSON: {is_duplicate: bool, confidence: float} |
| HANDOVER-01 | Shift handover brief | Shift summary JSON | Arabic narrative (2 paragraphs) |
| REPORT-DAILY | Daily shift report narrative | Shift stats JSON | Arabic narrative (3-4 paragraphs) |
| REPORT-WEEKLY | Weekly strategic report | Week stats JSON | Arabic narrative (1 page) |
| REPORT-MONTHLY | Monthly management report | Month stats JSON | English narrative (2-3 pages) |
| PATTERN-01 | Hotspot/trend narration | Aggregated incident stats | Arabic/English insight cards |
| STAFFING-01 | Staffing recommendation | Zone staffing vs incident density | Arabic recommendation text |
| ANOMALY-01 | Anomaly alert narrative | Alert type + context data | Arabic alert text (1-2 sentences) |
| SITUATION-01 | Zone status summary | Zone real-time stats | One-line status per zone |
| NLQ-CLASSIFY | Natural language query classification | User question text | JSON: {template_id, parameters} |
| NLQ-FORMAT | Natural language query answer | Query results | Arabic/English answer text |
| REPLACE-01 | Sick leave replacement explanation | Top 3 candidates + scores | Arabic text (2-3 sentences) |

**Total: 16 prompt templates for MVP**

### Token Budget Per Feature

| Feature | Data Context | Max Prompt | Frequency | Daily Token Est. |
|---------|-------------|-----------|-----------|-----------------|
| Triage | ~200 tokens | ~1K | ~50/day | ~50K |
| Dispatch explanation | ~500 tokens | ~1.5K | ~50/day | ~75K |
| Anomaly alerts | ~300 tokens | ~1K | ~100/day | ~100K |
| Handover brief | ~2K tokens | ~3K | 2/day | ~6K |
| Daily report | ~3K tokens | ~4K | 2/day | ~8K |
| Pattern detection | ~3K tokens | ~4K | 24/day | ~96K |
| Situation assessment | ~1K tokens | ~2K | 288/day (every 5 min) | ~576K |
| NL queries | ~500 tokens | ~1.5K | ~10/day | ~15K |
| Resolution suggestions | ~1K tokens | ~2K | ~20/day | ~40K |
| **Total** | | | | **~966K tokens/day** |

At Qwen2.5:7B on CPU (~20 tokens/sec), this is ~13.4 hours of inference time per day. Fits within 24 hours but is tight. **Optimization options:**
- Reduce situation assessment frequency from 5 min to 15 min (saves ~384K tokens/day)
- Cache pattern detection results (run only if new incidents since last run)
- GPU upgrade doubles throughput to ~40 tokens/sec, giving comfortable headroom

---

## Fallback Matrix

Every AI feature has a defined non-AI path. If Ollama is down, the system operates in "manual mode" — all data and workflows function, just without AI assistance.

| Feature | AI Available | AI Unavailable |
|---------|-------------|----------------|
| Complaint triage | Auto-categorized + priority | Created as "General / Medium" — supervisor triages |
| Incident categorization | Pre-filled form | Officer selects manually |
| Smart dispatch | Ranked officers + explanation | Supervisor sees officer list sorted by distance |
| Resolution suggestions | Similar incident analysis | Button hidden |
| Duplicate detection | Spatial + semantic check | Spatial check only (PostGIS) |
| Handover brief | Structured data + narrative | Structured data only (tables) |
| Daily/weekly/monthly reports | Data + narrative | Data only (tables/charts, no narrative) |
| Pattern detection | Insight cards with trends | Raw charts on dashboard |
| Anomaly alerts | Alert with narrative text | Alert with raw data only |
| Situation assessment | Zone status with text summary | Zone status colors + numbers only |
| Natural language query | Query panel active | Panel disabled, use filters instead |
| Staffing recommendations | Weekly recommendation cards | Not available — manual analysis |
| Sick leave replacement | Ranked candidates + explanation | Off-duty officer list sorted by zone |
