import pino from 'pino';

const onVercel = process.env.VERCEL === '1';
const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
const usePretty = !onVercel && !isProd && process.env.NODE_ENV !== 'test';

const options = {
  level: isProd || onVercel ? 'info' : 'debug',
};

if (usePretty) {
  options.transport = {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'SYS:standard' },
  };
}

export const logger = pino(options);
