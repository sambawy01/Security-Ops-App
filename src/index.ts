import 'dotenv/config';
import { config } from './config.js';
import { buildApp } from './server.js';
import { startWorkers } from './workers/index.js';

const app = buildApp();

app.listen({ port: config.PORT, host: '0.0.0.0' }, async (err, address) => {
  if (err) { app.log.error(err); process.exit(1); }
  app.log.info(`Security OS API running at ${address}`);

  // Start background workers and recurring jobs
  try {
    await startWorkers();
    app.log.info('Background workers started');
  } catch (workerErr) {
    app.log.error('Failed to start background workers:', workerErr);
    // Non-fatal: the API continues running without workers
  }
});
