import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import {
  triageComplaint,
  categorizeIncident,
  explainDispatch,
  suggestResolution,
  classifyQuery,
  formatQueryAnswer,
  checkAiHealth,
} from '../ai/service.js';

// ─── RBAC Role Groups ────────────────────────────────────────────────────────

const AI_ACTION_ROLES = ['manager', 'assistant_manager', 'supervisor', 'operator'];
const AI_VIEW_ROLES = ['manager', 'assistant_manager', 'supervisor', 'operator'];
const AI_REPORT_ROLES = ['manager', 'assistant_manager', 'secretary'];
const AI_NLQ_ROLES = ['manager', 'assistant_manager'];

// ─── Validation Schemas ──────────────────────────────────────────────────────

const triageSchema = z.object({ message: z.string().min(1) });
const categorizeSchema = z.object({ description: z.string().min(1) });
const dispatchExplainSchema = z.object({
  officers: z.array(z.object({
    name: z.string(),
    badge: z.string(),
    score: z.number(),
    distance: z.number(),
    workload: z.number(),
  })),
  incident: z.object({
    title: z.string(),
    category: z.string(),
    zone: z.string(),
  }),
});
const resolveSuggestSchema = z.object({ incidentId: z.string().uuid() });
const querySchema = z.object({ question: z.string().min(1) });
const reportsQuerySchema = z.object({
  type: z.string().optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(20),
});
const reportParamsSchema = z.object({ id: z.string().uuid() });

// ─── Routes ──────────────────────────────────────────────────────────────────

const aiRoutes: FastifyPluginAsync = async (app) => {

  // 11. GET /api/v1/ai/status — Health check
  app.get('/api/v1/ai/status', {
    config: { allowedRoles: AI_VIEW_ROLES },
  }, async () => {
    const available = await checkAiHealth();
    return { available, model: config.AI_MODEL };
  });

  // 1. POST /api/v1/ai/triage
  app.post('/api/v1/ai/triage', {
    config: { allowedRoles: AI_ACTION_ROLES },
  }, async (request) => {
    const { message } = triageSchema.parse(request.body);
    const result = await triageComplaint(message);
    return { data: result };
  });

  // 2. POST /api/v1/ai/categorize
  app.post('/api/v1/ai/categorize', {
    config: { allowedRoles: AI_ACTION_ROLES },
  }, async (request) => {
    const { description } = categorizeSchema.parse(request.body);
    const result = await categorizeIncident(description);
    return { category: result.category, priority: result.priority };
  });

  // 3. POST /api/v1/ai/dispatch-explain
  app.post('/api/v1/ai/dispatch-explain', {
    config: { allowedRoles: AI_ACTION_ROLES },
  }, async (request) => {
    const { officers, incident } = dispatchExplainSchema.parse(request.body);
    const result = await explainDispatch(officers, incident);
    return { explanation: result.explanation };
  });

  // 4. POST /api/v1/ai/resolve-suggest
  app.post('/api/v1/ai/resolve-suggest', {
    config: { allowedRoles: AI_ACTION_ROLES },
  }, async (request) => {
    const { incidentId } = resolveSuggestSchema.parse(request.body);

    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: { category: { select: { nameEn: true } } },
    });

    if (!incident) {
      return { error: 'Incident not found' };
    }

    // Find 5 similar resolved incidents in the same category
    const similar = await prisma.incident.findMany({
      where: {
        categoryId: incident.categoryId,
        status: { in: ['resolved', 'closed'] },
        id: { not: incidentId },
      },
      select: { title: true, description: true },
      orderBy: { resolvedAt: 'desc' },
      take: 5,
    });

    const result = await suggestResolution(
      {
        title: incident.title,
        description: incident.description ?? '',
        category: incident.category?.nameEn ?? 'general',
      },
      similar.map((s) => ({
        title: s.title,
        resolution: s.description ?? '',
      })),
      incidentId,
    );

    return { data: result };
  });

  // 5. GET /api/v1/ai/patterns — Last 7 days pattern analyses
  app.get('/api/v1/ai/patterns', {
    config: { allowedRoles: AI_VIEW_ROLES },
  }, async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const analyses = await prisma.aiAnalysis.findMany({
      where: {
        type: 'pattern_detection',
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return { data: analyses };
  });

  // 6. GET /api/v1/ai/anomalies — Last 24h anomaly alerts
  app.get('/api/v1/ai/anomalies', {
    config: { allowedRoles: AI_VIEW_ROLES },
  }, async () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const anomalies = await prisma.aiAnalysis.findMany({
      where: {
        type: 'anomaly_alert',
        createdAt: { gte: oneDayAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { data: anomalies };
  });

  // 7. GET /api/v1/ai/staffing — Latest staffing recommendation
  app.get('/api/v1/ai/staffing', {
    config: { allowedRoles: AI_VIEW_ROLES },
  }, async () => {
    const latest = await prisma.aiAnalysis.findFirst({
      where: { type: 'staffing_recommendation' },
      orderBy: { createdAt: 'desc' },
    });
    return { data: latest };
  });

  // 8. GET /api/v1/ai/reports — List generated reports (filterable, paginated)
  app.get('/api/v1/ai/reports', {
    config: { allowedRoles: AI_REPORT_ROLES },
  }, async (request) => {
    const query = reportsQuerySchema.parse(request.query);
    const where: Record<string, unknown> = {};
    if (query.type) where.type = query.type;

    const [reports, total] = await Promise.all([
      prisma.generatedReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      prisma.generatedReport.count({ where }),
    ]);

    return { data: reports, total, skip: query.skip, take: query.take };
  });

  // 9. GET /api/v1/ai/reports/:id — Single report detail
  app.get('/api/v1/ai/reports/:id', {
    config: { allowedRoles: AI_REPORT_ROLES },
  }, async (request) => {
    const { id } = reportParamsSchema.parse((request as any).params);
    const report = await prisma.generatedReport.findUnique({ where: { id } });
    if (!report) {
      return { error: 'Report not found' };
    }
    return { data: report };
  });

  // 10. POST /api/v1/ai/query — Natural language query (EXPERIMENTAL)
  app.post('/api/v1/ai/query', {
    config: { allowedRoles: AI_NLQ_ROLES },
  }, async (request) => {
    const { question } = querySchema.parse(request.body);

    // Step 1: Classify the question
    const classification = await classifyQuery(question);
    if (!classification || !classification.templateId) {
      return {
        answer: 'Sorry, I could not understand that question. Please try rephrasing it.',
        classification: null,
      };
    }

    // Step 2: Execute query based on template
    let results: unknown = null;
    const params = classification.parameters as Record<string, unknown>;

    try {
      switch (classification.templateId) {
        case 'incidents_by_zone': {
          results = await prisma.incident.groupBy({
            by: ['priority', 'status'],
            where: {
              zone: params.zone ? { nameEn: { contains: params.zone as string, mode: 'insensitive' } } : undefined,
            },
            _count: true,
          });
          break;
        }
        case 'incidents_by_category': {
          results = await prisma.incident.groupBy({
            by: ['categoryId'],
            _count: true,
            orderBy: { _count: { id: 'desc' } },
            take: (params.limit as number) ?? 10,
          });
          break;
        }
        case 'response_time': {
          results = await prisma.$queryRaw`
            SELECT
              AVG(EXTRACT(EPOCH FROM (assigned_at - created_at)) / 60) as avg_response_minutes,
              COUNT(*) as total
            FROM incidents
            WHERE assigned_at IS NOT NULL
          `;
          break;
        }
        case 'sla_compliance': {
          results = await prisma.$queryRaw`
            SELECT
              COUNT(*) FILTER (WHERE resolved_at <= sla_resolution_deadline) as compliant,
              COUNT(*) FILTER (WHERE resolved_at > sla_resolution_deadline) as breached,
              COUNT(*) as total
            FROM incidents
            WHERE resolved_at IS NOT NULL AND sla_resolution_deadline IS NOT NULL
          `;
          break;
        }
        case 'zone_comparison': {
          results = await prisma.incident.groupBy({
            by: ['zoneId'],
            where: { status: { in: ['open', 'assigned', 'in_progress', 'escalated'] } },
            _count: true,
          });
          break;
        }
        default: {
          results = { message: 'Query template not implemented yet', templateId: classification.templateId };
        }
      }
    } catch (err) {
      results = { error: 'Query execution failed' };
    }

    // Step 3: Format the answer using AI
    const { answer } = await formatQueryAnswer(results, question);

    return { answer, classification, results };
  });
};

export default aiRoutes;
