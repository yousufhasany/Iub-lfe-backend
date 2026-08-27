let app;

function sendCrash(res, err) {
  console.error('API handler failed:', err);
  if (res.headersSent) return;
  res.statusCode = 500;
  res.setHeader('content-type', 'application/json');
  res.end(
    JSON.stringify({
      success: false,
      message: 'Service unavailable.',
      code: 'FUNCTION_CRASH',
      error: err?.message || String(err),
    }),
  );
}

async function getApp() {
  if (app) return app;
  const { loadEnv } = await import('../src/config/env.js');
  const { createApp } = await import('../src/app.js');
  const { connectDb } = await import('../src/config/db.js');
  const { ensureBootstrapAdmin } = await import('../src/services/authService.js');
  loadEnv();
  await connectDb();
  await ensureBootstrapAdmin();
  app = createApp();
  return app;
}

export default async function handler(req, res) {
  try {
    const expressApp = await getApp();
    if (typeof req.url === 'string' && !req.url.startsWith('/api')) {
      req.url = `/api${req.url === '/' || req.url === '' ? '/health' : req.url}`;
    }
    return expressApp(req, res);
  } catch (err) {
    sendCrash(res, err);
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60,
};
