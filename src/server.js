import { loadEnv, env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDb } from './config/db.js';
import { createApp } from './app.js';
import { ensureBootstrapAdmin } from './services/authService.js';

loadEnv();

const app = createApp();

async function start() {
  await connectDb();
  await ensureBootstrapAdmin();
  app.listen(env.port, () => {
    logger.info(`LFE API listening on ${env.port}`);
  });
}

start().catch((err) => {
  logger.error(err, 'Failed to start server');
  process.exit(1);
});
