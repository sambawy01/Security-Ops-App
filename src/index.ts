import 'dotenv/config';
import { config } from './config.js';
import { buildApp } from './server.js';
import { startWorkers, stopWorkers } from './workers/index.js';
import { prisma } from './lib/prisma.js';
import { redis } from './lib/redis.js';

const app = buildApp();

app.listen({ port: config.PORT, host: '0.0.0.0' }, async (err, address) => {
  if (err) { app.log.error(err); process.exit(1); }
  app.log.info(`Security OS API running at ${address}`);

  // Start background workers and recurring jobs
  try {
    await startWorkers();
    app.log.info('Background workers started');
  } catch (workerErr) {
    app.log.error(`Failed to start background workers: ${workerErr}`);
    // Non-fatal: the API continues running without workers
  }
});

// Graceful shutdown — drain workers, close DB/Redis, then close the server.
let shuttingDown = false;
async function gracefulShutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info(`${signal} received — shutting down gracefully`);

  try {
    await stopWorkers();
    app.log.info('Workers stopped');
  } catch (e) {
    app.log.error(`Worker shutdown error: ${e}`);
  }

  await app.close();
  app.log.info('HTTP server closed');

  try {
    await prisma.$disconnect();
    await redis.quit();
  } catch {
    // Best-effort cleanup
  }

  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
