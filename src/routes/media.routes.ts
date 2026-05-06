import { FastifyPluginAsync } from 'fastify';
import multipart from '@fastify/multipart';
import { randomUUID } from 'crypto';
import { createWriteStream, createReadStream, existsSync, statSync } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';
import { prisma } from '../lib/prisma.js';

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'media');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const mediaRoutes: FastifyPluginAsync = async (app) => {
  app.register(multipart, { limits: { fileSize: MAX_FILE_SIZE } });

  // POST /api/v1/media/upload?incidentId=...&type=photo
  // When incidentId is provided, also create the IncidentMedia row so the
  // dashboard's incident detail picks the photo up automatically.
  app.post('/api/v1/media/upload', async (request, reply) => {
    const data = await request.file();
    if (!data) return reply.status(400).send({ error: 'No file uploaded' });

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(data.mimetype)) {
      return reply.status(400).send({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP' });
    }

    const ext = data.mimetype.split('/')[1] === 'jpeg' ? 'jpg' : data.mimetype.split('/')[1];
    const filename = `${randomUUID()}.${ext}`;
    const dir = path.join(UPLOAD_DIR, 'incidents');
    await mkdir(dir, { recursive: true });
    const filePath = path.join(dir, filename);

    await pipeline(data.file, createWriteStream(filePath));
    const fileSize = data.file.bytesRead;
    const publicPath = `/media/incidents/${filename}`;

    const query = request.query as Record<string, string | undefined>;
    const incidentId = query.incidentId?.trim();
    const mediaType = (query.type === 'voice_note' ? 'voice_note' : 'photo') as 'photo' | 'voice_note';

    if (incidentId) {
      try {
        await prisma.incidentMedia.create({
          data: {
            incidentId,
            type: mediaType,
            filePath: publicPath,
            fileSize,
          },
        });
      } catch (e) {
        // If the incident doesn't exist or RBAC layer rejected, the file is
        // still on disk — better to surface the issue than silently orphan.
        request.log.error({ err: e, incidentId }, 'Failed to link media to incident');
        return reply.status(400).send({ error: 'Could not attach media to incident' });
      }
    }

    return {
      filePath: publicPath,
      fileName: filename,
      fileSize,
      mimeType: data.mimetype,
      incidentId: incidentId ?? null,
    };
  });

  // GET /media/incidents/:filename — serve uploaded files. Public on purpose:
  // filenames are random UUIDs, so the URL itself is the capability. Auth-
  // gating these would force the dashboard to fetch each blob through JS
  // (auth header) instead of letting <img src> load directly, which is a
  // major UX regression for a demo. Revisit when we move to S3/R2.
  app.get('/media/incidents/:filename', async (request, reply) => {
    const { filename } = request.params as { filename: string };

    // Reject path traversal — only flat filenames live under incidents/
    if (!/^[a-f0-9-]+\.(jpe?g|png|webp)$/i.test(filename)) {
      return reply.status(400).send({ error: 'Invalid filename' });
    }

    const full = path.join(UPLOAD_DIR, 'incidents', filename);
    if (!existsSync(full)) return reply.status(404).send({ error: 'Not found' });

    const ext = filename.split('.').pop()!.toLowerCase();
    const stat = statSync(full);
    reply
      .header('Content-Type', MIME_BY_EXT[ext] ?? 'application/octet-stream')
      .header('Content-Length', stat.size.toString())
      .header('Cache-Control', 'public, max-age=86400');
    return reply.send(createReadStream(full));
  });
};

export default mediaRoutes;
