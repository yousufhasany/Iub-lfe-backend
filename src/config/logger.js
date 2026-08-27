import pino from 'pino';

const options = {
  level: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1' ? 'info' : 'debug',
};

if (process.env.LFE_PRETTY_LOGS === '1') {
  options.transport = {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'SYS:standard' },
  };
}

export const logger = pino(options);
