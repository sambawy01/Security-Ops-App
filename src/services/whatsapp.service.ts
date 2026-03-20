import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';

// ─── Configuration Check ────────────────────────────────────────────────────

function isWhatsAppConfigured(): boolean {
  return !!(config.WHATSAPP_TOKEN && config.WHATSAPP_PHONE_ID);
}

// ─── Send a text message via WhatsApp Cloud API ─────────────────────────────

export async function sendWhatsAppMessage(to: string, message: string): Promise<boolean> {
  if (!isWhatsAppConfigured()) {
    console.warn('[WhatsApp] Not configured — skipping send to', to);
    return false;
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${config.WHATSAPP_PHONE_ID}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: message },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[WhatsApp] Send failed:', response.status, errorBody);
      return false;
    }

    const data = await response.json() as { messages?: Array<{ id: string }> };
    const waMessageId = data.messages?.[0]?.id ?? null;

    // Store outbound message
    await storeMessage({
      direction: 'outbound',
      senderPhone: to,
      content: message,
      waMessageId,
      status: 'sent',
    });

    return true;
  } catch (error) {
    console.error('[WhatsApp] Send error:', error);
    return false;
  }
}

// ─── Send a template message (for messages outside 24hr window) ─────────────

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  params: string[],
): Promise<boolean> {
  if (!isWhatsAppConfigured()) {
    console.warn('[WhatsApp] Not configured — skipping template send to', to);
    return false;
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${config.WHATSAPP_PHONE_ID}/messages`;

    const components: Array<Record<string, unknown>> = [];
    if (params.length > 0) {
      components.push({
        type: 'body',
        parameters: params.map((p) => ({ type: 'text', text: p })),
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'ar' },
          components,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[WhatsApp] Template send failed:', response.status, errorBody);
      return false;
    }

    const data = await response.json() as { messages?: Array<{ id: string }> };
    const waMessageId = data.messages?.[0]?.id ?? null;

    await storeMessage({
      direction: 'outbound',
      senderPhone: to,
      content: `[template:${templateName}] ${params.join(', ')}`,
      waMessageId,
      templateName,
      status: 'sent',
    });

    return true;
  } catch (error) {
    console.error('[WhatsApp] Template send error:', error);
    return false;
  }
}

// ─── Store message in database ──────────────────────────────────────────────

export async function storeMessage(data: {
  incidentId?: string;
  direction: string;
  senderPhone: string;
  content: string;
  mediaUrl?: string;
  waMessageId?: string | null;
  templateName?: string;
  status?: string;
}): Promise<void> {
  try {
    await prisma.whatsappMessage.create({
      data: {
        incidentId: data.incidentId ?? null,
        direction: data.direction,
        senderPhone: data.senderPhone,
        content: data.content,
        mediaUrl: data.mediaUrl ?? null,
        waMessageId: data.waMessageId ?? null,
        templateName: data.templateName ?? null,
        status: data.status ?? 'sent',
      },
    });
  } catch (error) {
    console.error('[WhatsApp] Failed to store message:', error);
  }
}

// ─── Send status update to WhatsApp reporter ────────────────────────────────

const STATUS_MESSAGES: Record<string, (ticketNum: string) => string> = {
  assigned: (t) => `تم تعيين ضابط أمن للتعامل مع بلاغك رقم #${t}`,
  in_progress: (t) => `جاري التعامل مع بلاغك رقم #${t}`,
  resolved: (t) => `تم حل المشكلة المبلغ عنها في بلاغ رقم #${t}. شكراً لبلاغك.`,
};

export async function notifyWhatsAppStatusChange(
  incidentId: string,
  newStatus: string,
  reporterPhone: string,
): Promise<void> {
  const messageFn = STATUS_MESSAGES[newStatus];
  if (!messageFn) return; // No message for this status (e.g. closed)

  // Use first 8 chars of UUID as short ticket number
  const ticketNum = incidentId.slice(0, 8).toUpperCase();
  const message = messageFn(ticketNum);

  const sent = await sendWhatsAppMessage(reporterPhone, message);
  if (sent) {
    // Link the outbound message to the incident
    await prisma.whatsappMessage.updateMany({
      where: {
        senderPhone: reporterPhone,
        direction: 'outbound',
        incidentId: null,
        content: message,
      },
      data: { incidentId },
    });
  }
}
