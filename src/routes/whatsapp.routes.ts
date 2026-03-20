import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import { triageComplaint } from '../ai/service.js';
import {
  sendWhatsAppMessage,
  storeMessage,
} from '../services/whatsapp.service.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

interface WhatsAppWebhookEntry {
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: { phone_number_id: string };
      messages?: Array<{
        id: string;
        from: string;
        timestamp: string;
        type: string;
        text?: { body: string };
        location?: { latitude: number; longitude: number; name?: string; address?: string };
        image?: { id: string; mime_type: string; caption?: string };
        document?: { id: string; mime_type: string; filename?: string; caption?: string };
        audio?: { id: string; mime_type: string };
        video?: { id: string; mime_type: string; caption?: string };
      }>;
      statuses?: Array<{
        id: string;
        status: string;
        timestamp: string;
        recipient_id: string;
      }>;
    };
  }>;
}

interface WhatsAppWebhookBody {
  object: string;
  entry: WhatsAppWebhookEntry[];
}

function extractMessageText(msg: NonNullable<WhatsAppWebhookEntry['changes'][0]['value']['messages']>[0]): string {
  if (msg.type === 'text' && msg.text?.body) {
    return msg.text.body;
  }
  if (msg.type === 'location' && msg.location) {
    const loc = msg.location;
    return `[Location: ${loc.latitude}, ${loc.longitude}]${loc.name ? ` ${loc.name}` : ''}${loc.address ? ` - ${loc.address}` : ''}`;
  }
  if (msg.type === 'image' && msg.image?.caption) {
    return msg.image.caption;
  }
  if (msg.type === 'video' && msg.video?.caption) {
    return msg.video.caption;
  }
  if (msg.type === 'document' && msg.document?.caption) {
    return msg.document.caption;
  }
  // For media without captions, return a placeholder
  if (['image', 'audio', 'video', 'document'].includes(msg.type)) {
    return `[${msg.type} received]`;
  }
  return '';
}

function extractLocation(msg: NonNullable<WhatsAppWebhookEntry['changes'][0]['value']['messages']>[0]): { lat: number; lng: number } | null {
  if (msg.type === 'location' && msg.location) {
    return { lat: msg.location.latitude, lng: msg.location.longitude };
  }
  return null;
}

// ─── Process a single inbound message (runs async) ──────────────────────────

async function processInboundMessage(
  senderPhone: string,
  messageText: string,
  waMessageId: string,
  location: { lat: number; lng: number } | null,
): Promise<void> {
  try {
    // 1. AI triage
    const triage = await triageComplaint(messageText);

    // 2. Resolve category ID from AI triage result
    let categoryId: string | null = null;
    if (triage.category && triage.category !== 'general') {
      const category = await prisma.category.findFirst({
        where: {
          OR: [
            { nameEn: { equals: triage.category, mode: 'insensitive' } },
            { id: triage.category },
          ],
        },
        select: { id: true },
      });
      if (category) categoryId = category.id;
    }

    // 3. Map priority string to valid enum value
    const validPriorities = ['critical', 'high', 'medium', 'low'];
    const priority = validPriorities.includes(triage.priority) ? triage.priority : 'medium';

    // 4. Create incident
    const incident = await prisma.incident.create({
      data: {
        title: messageText.slice(0, 100),
        description: messageText,
        categoryId,
        priority: priority as any,
        status: 'open',
        reporterType: 'whatsapp',
        reporterPhone: senderPhone,
        zoneId: triage.zone ?? null,
      },
    });

    // 5. If location was shared, set it via PostGIS
    if (location) {
      await prisma.$executeRaw`
        UPDATE incidents SET location = ST_SetSRID(ST_MakePoint(${location.lng}, ${location.lat}), 4326)
        WHERE id = ${incident.id}::uuid
      `;
    }

    // 6. Store inbound message linked to the incident
    await storeMessage({
      incidentId: incident.id,
      direction: 'inbound',
      senderPhone,
      content: messageText,
      waMessageId,
      status: 'received',
    });

    // 7. Send auto-reply with ticket number
    const ticketNum = incident.id.slice(0, 8).toUpperCase();
    const replyText = `تم استلام شكواك. رقم البلاغ #${ticketNum}`;
    await sendWhatsAppMessage(senderPhone, replyText);

    // Link reply message to incident
    await prisma.whatsappMessage.updateMany({
      where: {
        senderPhone,
        direction: 'outbound',
        incidentId: null,
        content: replyText,
      },
      data: { incidentId: incident.id },
    });
  } catch (error) {
    console.error('[WhatsApp] Failed to process inbound message:', error);
  }
}

// ─── Routes ─────────────────────────────────────────────────────────────────

const whatsappRoutes: FastifyPluginAsync = async (app) => {

  // GET /api/v1/whatsapp/webhook — Meta verification endpoint
  app.get('/api/v1/whatsapp/webhook', async (request, reply) => {
    const query = request.query as Record<string, string>;

    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === config.WHATSAPP_VERIFY_TOKEN) {
      app.log.info('[WhatsApp] Webhook verified');
      return reply.status(200).send(challenge);
    }

    app.log.warn('[WhatsApp] Webhook verification failed');
    return reply.status(403).send({ error: 'Verification failed' });
  });

  // POST /api/v1/whatsapp/webhook — Receives inbound messages from Meta
  app.post('/api/v1/whatsapp/webhook', async (request, reply) => {
    // Must respond to Meta within 5 seconds — always return 200 immediately
    // and process async
    const body = request.body as WhatsAppWebhookBody;

    if (body?.object !== 'whatsapp_business_account') {
      return reply.status(200).send('OK');
    }

    // Process messages asynchronously (fire-and-forget)
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const messages = change.value?.messages ?? [];
        for (const msg of messages) {
          const senderPhone = msg.from;
          const messageText = extractMessageText(msg);
          const location = extractLocation(msg);
          const waMessageId = msg.id;

          if (messageText) {
            // Fire-and-forget: do not await — Meta requires fast response
            processInboundMessage(senderPhone, messageText, waMessageId, location).catch((err) => {
              app.log.error('[WhatsApp] Async processing error:', err);
            });
          }
        }

        // Handle delivery status updates (optional — update stored message status)
        const statuses = change.value?.statuses ?? [];
        for (const status of statuses) {
          prisma.whatsappMessage.updateMany({
            where: { waMessageId: status.id },
            data: { status: status.status },
          }).catch(() => {}); // Best-effort status tracking
        }
      }
    }

    return reply.status(200).send('OK');
  });

  // POST /api/v1/whatsapp/send — Send outbound message (internal use, requires auth)
  app.post('/api/v1/whatsapp/send', {
    config: { allowedRoles: ['operator', 'supervisor', 'manager', 'assistant_manager'] },
  }, async (request, reply) => {
    const body = request.body as { to: string; message: string; templateName?: string };

    if (!body?.to || (!body.message && !body.templateName)) {
      return reply.status(400).send({ error: 'Missing required fields: to, message or templateName' });
    }

    let success: boolean;
    if (body.templateName) {
      const { sendWhatsAppTemplate } = await import('../services/whatsapp.service.js');
      // Use message as comma-separated template params
      const params = body.message ? body.message.split(',').map((s) => s.trim()) : [];
      success = await sendWhatsAppTemplate(body.to, body.templateName, params);
    } else {
      success = await sendWhatsAppMessage(body.to, body.message);
    }

    if (success) {
      return reply.status(200).send({ data: { sent: true } });
    }

    return reply.status(502).send({ error: 'Failed to send WhatsApp message' });
  });
};

export default whatsappRoutes;
