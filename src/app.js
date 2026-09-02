import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import path from 'path';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { globalLimiter } from './middleware/rateLimits.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import routes from './routes/index.js';
import { skipSanitizeForMultipart } from './middleware/restoreMultipart.js';

const sanitize = mongoSanitize();

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  );
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        const allowed = env.clientOrigins || [env.clientUrl];
        if (allowed.includes(origin)) return callback(null, true);
        callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    if (skipSanitizeForMultipart(req)) return next();
    return sanitize(req, res, next);
  });
  app.use(globalLimiter);
  app.use(
    pinoHttp({
      logger,
      autoLogging: env.isProd,
    }),
  );
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
  app.use('/api', routes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
