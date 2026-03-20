import { FastifyPluginAsync } from 'fastify';
import multipart from '@fastify/multipart';
import { randomUUID } from 'crypto';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'media');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const mediaRoutes: FastifyPluginAsync = async (app) => {
  app.register(multipart, { limits: { fileSize: MAX_FILE_SIZE } });

  app.post('/api/v1/media/upload', async (request, reply) => {
    const data = await request.file();
    if (!data) return reply.status(400).send({ error: 'No file uploaded' });

    // Validate file type
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

    return {
      filePath: `/media/incidents/${filename}`,
      fileName: filename,
      fileSize: data.file.bytesRead,
      mimeType: data.mimetype,
    };
  });
};

export default mediaRoutes;
