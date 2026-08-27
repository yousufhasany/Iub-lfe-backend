import dotenv from 'dotenv';

dotenv.config({ path: new URL('../../../.env', import.meta.url) });
dotenv.config({ path: new URL('../../.env', import.meta.url) });
dotenv.config();

const required = ['JWT_SECRET', 'MONGODB_URI'];
const productionClientOrigin = 'https://iub-lfe-web.web.app';

function originOnly(value) {
  try {
    return new URL(value).origin;
  } catch {
    return String(value || '').replace(/\/$/, '');
  }
}

function parseCloudinaryUrl(url) {
  if (!url) return {};
  try {
    const parsed = new URL(url);
    return {
      cloudName: parsed.hostname || undefined,
      apiKey: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      apiSecret: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    };
  } catch {
    return {};
  }
}

const cloudinaryFromUrl = parseCloudinaryUrl(process.env.CLOUDINARY_URL);

export function loadEnv() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd:
    process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production',
  port: Number(process.env.PORT) || 5000,
  clientUrl: originOnly(process.env.CLIENT_URL || productionClientOrigin),
  clientOrigins: [
    ...(process.env.CLIENT_URL || productionClientOrigin)
      .split(',')
      .map((value) => originOnly(value.trim()))
      .filter(Boolean),
    productionClientOrigin,
    'https://iub-lfe-web.firebaseapp.com',
  ].filter((origin, index, origins) => origins.indexOf(origin) === index),
  apiUrl: process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieName: process.env.COOKIE_NAME || 'lfe_token',
  adminEmail: process.env.ADMIN_EMAIL,
  adminPassword: process.env.ADMIN_PASSWORD,
  requireIubEmail: process.env.REQUIRE_IUB_EMAIL === 'true',
  autoApprovePosts: process.env.AUTO_APPROVE_POSTS !== 'false',
  imageProvider: process.env.IMAGE_STORAGE_PROVIDER || 'cloudinary',
  cloudinary: {
    cloudName:
      process.env.IMAGE_STORAGE_CLOUD_NAME || cloudinaryFromUrl.cloudName || 'p322twby',
    apiKey: process.env.IMAGE_STORAGE_API_KEY || cloudinaryFromUrl.apiKey,
    apiSecret: process.env.IMAGE_STORAGE_API_SECRET || cloudinaryFromUrl.apiSecret,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'LFE Platform <noreply@iub.edu.bd>',
  },
};
