import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/server.js';
import { testPrisma, cleanTestData } from '../setup.js';
import { redis } from '../../src/lib/redis.js';
import { FastifyInstance } from 'fastify';

let app: FastifyInstance;
const testPhone = '+201234567890';

beforeAll(async () => {
  app = buildApp();
  await app.ready();

  // Pre-clean
  await testPrisma.$executeRawUnsafe(`DELETE FROM whatsapp_messages WHERE sender_phone = '${testPhone}'`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM incident_updates WHERE incident_id IN (SELECT id FROM incidents WHERE reporter_phone = '${testPhone}')`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM incidents WHERE reporter_phone = '${testPhone}'`);
});

afterAll(async () => {
  await testPrisma.$executeRawUnsafe(`DELETE FROM whatsapp_messages WHERE sender_phone = '${testPhone}'`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM incident_updates WHERE incident_id IN (SELECT id FROM incidents WHERE reporter_phone = '${testPhone}')`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM incidents WHERE reporter_phone = '${testPhone}'`);
  await cleanTestData();
  await testPrisma.$disconnect();
  await redis.quit();
  await app.close();
});

describe('Integration: WhatsApp Webhook', () => {
  // 1. GET with correct verify_token returns challenge
  it('GET webhook with correct verify_token returns challenge', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/whatsapp/webhook',
      query: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'webhook-verify-secret', // default from config
        'hub.challenge': 'test-challenge-123',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('test-challenge-123');
  });

  // 2. GET with wrong verify_token returns 403
  it('GET webhook with wrong verify_token returns 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/whatsapp/webhook',
      query: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-token',
        'hub.challenge': 'test-challenge-456',
      },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error).toContain('Verification failed');
  });

  // 3. POST with simulated message payload returns 200
  it('POST webhook with message payload returns 200', async () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { phone_number_id: '123456' },
                messages: [
                  {
                    id: 'wamid.test-msg-001',
                    from: testPhone,
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    type: 'text',
                    text: { body: 'There is a security issue at the main gate, someone trying to enter without ID' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/whatsapp/webhook',
      payload,
    });

    expect(res.statusCode).toBe(200);
  });

  // 4. Verify incident was created from WhatsApp message
  // processInboundMessage is fire-and-forget and involves AI triage; poll until done
  it('incident was created from WhatsApp message', async () => {
    let incident = null;
    // Poll for up to 15 seconds (AI triage can be slow)
    for (let i = 0; i < 30; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      incident = await testPrisma.incident.findFirst({
        where: {
          reporterPhone: testPhone,
          reporterType: 'whatsapp',
        },
        orderBy: { createdAt: 'desc' },
      });
      if (incident) break;
    }

    expect(incident).not.toBeNull();
    expect(incident!.title).toBeDefined();
    expect(incident!.description).toContain('security issue');
    expect(incident!.status).toBe('open');
    expect(incident!.reporterType).toBe('whatsapp');
  }, 20000); // 20s timeout for this test

  // 5. Verify whatsapp_message was stored
  it('whatsapp_message was stored', async () => {
    // The message should have been stored by now (previous test waited)
    const messages = await testPrisma.whatsappMessage.findMany({
      where: {
        senderPhone: testPhone,
        direction: 'inbound',
      },
    });

    expect(messages.length).toBeGreaterThanOrEqual(1);

    const inbound = messages.find((m) => m.waMessageId === 'wamid.test-msg-001');
    expect(inbound).toBeDefined();
    expect(inbound!.content).toContain('security issue');
    expect(inbound!.incidentId).not.toBeNull();
  });
});
