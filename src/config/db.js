import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

export async function connectDb() {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 2500 });
    logger.info('Connected to MongoDB');
    return;
  } catch (err) {
    if (env.isProd) throw err;
    logger.warn({ err: err.message }, 'MongoDB not reachable; starting a local in-memory instance for development');
  }

  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const memory = await MongoMemoryServer.create({
    instance: { port: 27017, dbName: 'lfe_platform' },
  });
  await mongoose.connect('mongodb://127.0.0.1:27017/lfe_platform');
  logger.warn('Connected to in-memory MongoDB on port 27017. Data is lost when this process exits. Use Atlas or Docker for persistence.');
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
