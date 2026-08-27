import { loadEnv } from '../src/config/env.js';
import { createApp } from '../src/app.js';
import { connectDb } from '../src/config/db.js';
import { ensureBootstrapAdmin } from '../src/services/authService.js';
import { logger } from '../src/config/logger.js';

const app = createApp();

let bootPromise;

async function boot() {
  if (!bootPromise) {
    bootPromise = (async () => {
      loadEnv();
      await connectDb();
      await ensureBootstrapAdmin();
    })().catch((err) => {
      bootPromise = null;
      throw err;
    });
  }
  await bootPromise;
}

export default async function handler(req, res) {
  try {
    await boot();
  } catch (err) {
    logger.error({ err }, 'API boot failed');
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Service unavailable.', code: 'BOOT_FAILED' }));
    return;
  }

  if (typeof req.url === 'string' && !req.url.startsWith('/api')) {
    req.url = `/api${req.url === '/' ? '/health' : req.url}`;
  }

  return app(req, res);
}

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60,
};
