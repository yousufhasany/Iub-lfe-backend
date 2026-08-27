import { loadEnv, env } from '../src/config/env.js';
import mongoose from 'mongoose';

loadEnv();

const uri = env.mongoUri;
const host = uri.replace(/\/\/.*@/, '//***:***@');
console.log('Connecting to', host);

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db;
  const ping = await db.command({ ping: 1 });
  const cols = await db.listCollections().toArray();
  const collections = {};
  for (const col of cols) {
    collections[col.name] = await db.collection(col.name).countDocuments();
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        ping: ping.ok,
        database: db.databaseName,
        collections,
      },
      null,
      2,
    ),
  );
  await mongoose.disconnect();
} catch (err) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        name: err.name,
        code: err.code,
        codeName: err.codeName,
        message: err.message,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}
