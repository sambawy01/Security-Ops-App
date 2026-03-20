import { prisma } from '../lib/prisma.js';
import { isAvailable } from './ollama.js';
import { triageWhatsApp, triageIncident } from './prompts/triage.js';
import { explainDispatch as explainDispatchPrompt } from './prompts/dispatch.js';
import { suggestResolution as suggestResolutionPrompt } from './prompts/resolve.js';
import { checkDuplicate as checkDuplicatePrompt } from './prompts/duplicate.js';
import { generateHandoverBrief as generateHandoverBriefPrompt } from './prompts/handover.js';
import {
  generateDailyReport as generateDailyReportPrompt,
  generateWeeklyReport as generateWeeklyReportPrompt,
  generateMonthlyReport as generateMonthlyReportPrompt,
} from './prompts/reports.js';
import { narratePatterns, recommendStaffing as recommendStaffingPrompt } from './prompts/patterns.js';
import { narrateAnomaly } from './prompts/anomaly.js';
import { assessSituation as assessSituationPrompt } from './prompts/situation.js';
import { classifyQuery as classifyQueryPrompt, formatAnswer as formatAnswerPrompt } from './prompts/nlq.js';

// ─── Helper: store AI suggestion tied to an incident ────────────────────────

async function storeSuggestion(
  type: string,
  text: string,
  incidentId?: string,
): Promise<string> {
  const record = await prisma.aiSuggestion.create({
    data: {
      type,
      suggestionText: text,
      incidentId: incidentId ?? null,
    },
  });
  return record.id;
}

// ─── Helper: store AI analysis ──────────────────────────────────────────────

async function storeAnalysis(
  type: string,
  scope: string,
  content: unknown,
  confidence: number = 0,
  zoneId?: string,
): Promise<string> {
  const record = await prisma.aiAnalysis.create({
    data: {
      type,
      scope,
      content: content as any,
      confidence,
      zoneId: zoneId ?? null,
    },
  });
  return record.id;
}

// ─── 1. Triage Complaint (WhatsApp) ─────────────────────────────────────────

export async function triageComplaint(message: string, incidentId?: string) {
  const result = await triageWhatsApp(message);

  if (!result) {
    return {
      category: 'general',
      priority: 'medium',
      zone: null,
      suggestedReply: 'تم استلام بلاغك وسيتم مراجعته.',
      aiSuggestionId: null,
    };
  }

  const suggestionId = await storeSuggestion(
    'triage',
    JSON.stringify(result),
    incidentId,
  );

  return { ...result, aiSuggestionId: suggestionId };
}

// ─── 2. Categorize Incident ─────────────────────────────────────────────────

export async function categorizeIncident(description: string, incidentId?: string) {
  const result = await triageIncident(description);

  if (!result) {
    return {
      category: 'general',
      priority: 'medium',
      aiSuggestionId: null,
    };
  }

  const suggestionId = await storeSuggestion(
    'categorization',
    JSON.stringify(result),
    incidentId,
  );

  return { ...result, aiSuggestionId: suggestionId };
}

// ─── 3. Explain Dispatch ────────────────────────────────────────────────────

export async function explainDispatch(
  officers: Array<{ name: string; badge: string; score: number; distance: number; workload: number }>,
  incident: { title: string; category: string; zone: string },
  incidentId?: string,
) {
  const explanation = await explainDispatchPrompt(officers, incident);

  const suggestionId = await storeSuggestion(
    'dispatch_explanation',
    explanation,
    incidentId,
  );

  return { explanation, aiSuggestionId: suggestionId };
}

// ─── 4. Suggest Resolution ──────────────────────────────────────────────────

export async function suggestResolution(
  incident: { title: string; description: string; category: string },
  similarIncidents: Array<{ title: string; resolution: string }>,
  incidentId?: string,
) {
  const suggestion = await suggestResolutionPrompt(incident, similarIncidents);

  const suggestionId = await storeSuggestion(
    'resolution',
    suggestion,
    incidentId,
  );

  return { suggestion, aiSuggestionId: suggestionId };
}

// ─── 5. Check Duplicate ─────────────────────────────────────────────────────

export async function checkDuplicate(
  desc1: string,
  desc2: string,
  incidentId?: string,
) {
  const result = await checkDuplicatePrompt(desc1, desc2);

  if (!result) {
    return { isDuplicate: false, confidence: 0, aiAnalysisId: null };
  }

  const analysisId = await storeAnalysis(
    'duplicate_check',
    'incident',
    result,
    result.confidence,
  );

  return { ...result, aiAnalysisId: analysisId };
}

// ─── 6. Generate Handover Brief ─────────────────────────────────────────────

export async function generateHandoverBrief(shiftData: {
  incidents: Array<{ title: string; status: string; priority: string }>;
  patrols: Array<{ route: string; status: string }>;
  attendance: { present: number; absent: number; late: number };
  notable: string[];
}) {
  const brief = await generateHandoverBriefPrompt(shiftData);

  const analysisId = await storeAnalysis(
    'handover_brief',
    'shift',
    { brief, generatedAt: new Date().toISOString() },
    1.0,
  );

  return { brief, aiAnalysisId: analysisId };
}

// ─── 7. Generate Daily Report ───────────────────────────────────────────────

export async function generateDailyReport(stats: Parameters<typeof generateDailyReportPrompt>[0]) {
  const narrative = await generateDailyReportPrompt(stats);

  const analysisId = await storeAnalysis(
    'daily_report',
    'organization',
    { narrative, stats, generatedAt: new Date().toISOString() },
    1.0,
  );

  return { narrative, aiAnalysisId: analysisId };
}

// ─── 8. Generate Weekly Report ──────────────────────────────────────────────

export async function generateWeeklyReport(stats: Parameters<typeof generateWeeklyReportPrompt>[0]) {
  const narrative = await generateWeeklyReportPrompt(stats);

  const analysisId = await storeAnalysis(
    'weekly_report',
    'organization',
    { narrative, stats, generatedAt: new Date().toISOString() },
    1.0,
  );

  return { narrative, aiAnalysisId: analysisId };
}

// ─── 9. Generate Monthly Report ─────────────────────────────────────────────

export async function generateMonthlyReport(stats: Parameters<typeof generateMonthlyReportPrompt>[0]) {
  const narrative = await generateMonthlyReportPrompt(stats);

  const analysisId = await storeAnalysis(
    'monthly_report',
    'organization',
    { narrative, stats, generatedAt: new Date().toISOString() },
    1.0,
  );

  return { narrative, aiAnalysisId: analysisId };
}

// ─── 10. Detect Patterns ────────────────────────────────────────────────────

export async function detectPatterns(stats: Parameters<typeof narratePatterns>[0]) {
  const raw = await narratePatterns(stats);

  let insights: unknown[];
  try {
    insights = JSON.parse(raw);
  } catch {
    insights = [{ titleEn: 'Analysis unavailable', titleAr: 'التحليل غير متوفر', bodyEn: raw, bodyAr: raw, severity: 'info', metric: '' }];
  }

  const analysisId = await storeAnalysis(
    'pattern_detection',
    'organization',
    { insights, generatedAt: new Date().toISOString() },
    0.8,
  );

  return { insights, aiAnalysisId: analysisId };
}

// ─── 11. Recommend Staffing ─────────────────────────────────────────────────

export async function recommendStaffing(
  zoneData: Array<{
    zone: string;
    currentOfficers: number;
    incidentsPerDay: number;
    peakHours: string[];
    avgResponseMinutes: number;
    patrolCoverage: number;
  }>,
) {
  const recommendation = await recommendStaffingPrompt(zoneData);

  const analysisId = await storeAnalysis(
    'staffing_recommendation',
    'organization',
    { recommendation, generatedAt: new Date().toISOString() },
    0.7,
  );

  return { recommendation, aiAnalysisId: analysisId };
}

// ─── 12. Generate Anomaly Alert ─────────────────────────────────────────────

export async function generateAnomalyAlert(
  alertType: string,
  context: Record<string, unknown>,
  zoneId?: string,
) {
  const alertText = await narrateAnomaly(alertType, context);

  const analysisId = await storeAnalysis(
    'anomaly_alert',
    'zone',
    { alertType, alertText, context, generatedAt: new Date().toISOString() },
    0.75,
    zoneId,
  );

  return { alertText, aiAnalysisId: analysisId };
}

// ─── 13. Assess Situation ───────────────────────────────────────────────────

export async function assessSituation(
  zoneStats: Array<{
    zone: string;
    activeIncidents: number;
    criticalIncidents: number;
    officersOnDuty: number;
    patrolActive: boolean;
    avgResponseMinutes: number;
  }>,
) {
  const assessment = await assessSituationPrompt(zoneStats);

  const analysisId = await storeAnalysis(
    'situation_assessment',
    'organization',
    { assessment, generatedAt: new Date().toISOString() },
    0.85,
  );

  return { assessment, aiAnalysisId: analysisId };
}

// ─── 14. Classify Query (NLQ) ───────────────────────────────────────────────

export async function classifyQuery(question: string) {
  const classification = await classifyQueryPrompt(question);

  if (!classification) {
    return { templateId: null, parameters: {}, aiAnalysisId: null };
  }

  const analysisId = await storeAnalysis(
    'query_classification',
    'nlq',
    { question, classification, generatedAt: new Date().toISOString() },
    0.8,
  );

  return { ...classification, aiAnalysisId: analysisId };
}

// ─── 15. Format Query Answer (NLQ) ─────────────────────────────────────────

export async function formatQueryAnswer(results: unknown, question: string) {
  const answer = await formatAnswerPrompt(results, question);

  const analysisId = await storeAnalysis(
    'query_answer',
    'nlq',
    { question, answer, generatedAt: new Date().toISOString() },
    0.8,
  );

  return { answer, aiAnalysisId: analysisId };
}

// ─── Health Check ───────────────────────────────────────────────────────────

export { isAvailable as checkAiHealth };
