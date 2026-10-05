export type MpesaEnvironment = 'sandbox' | 'production';

const getRequiredEnv = (key: string): string => {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const getOptionalEnv = (key: string, fallback: string): string => process.env[key]?.trim() || fallback;

export const mpesaConfig = {
  consumerKey: getOptionalEnv('MPESA_CONSUMER_KEY', 'local-dev-consumer-key'),
  consumerSecret: getOptionalEnv('MPESA_CONSUMER_SECRET', 'local-dev-consumer-secret'),
  shortCode: getOptionalEnv('MPESA_SHORTCODE', '174379'),
  passKey: getOptionalEnv('MPESA_PASSKEY', 'local-dev-passkey'),
  environment: (process.env.MPESA_ENVIRONMENT ?? 'sandbox') as MpesaEnvironment,
  callbackUrl: process.env.MPESA_CALLBACK_URL ?? 'http://localhost:4000/api/payments/mpesa/callback'
};

const defaultDatabaseUrl = 'postgresql://postgres:postgres@localhost:5432/shopradar';
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = defaultDatabaseUrl;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
const jwtSecret = process.env.JWT_SECRET?.trim();
if (nodeEnv === 'production' && !jwtSecret) {
  throw new Error('JWT_SECRET must be configured in production.');
}

export const apiConfig = {
  port: Number(process.env.API_PORT ?? 4000),
  nodeEnv,
  jwtSecret: jwtSecret || 'local-dev-secret',
  publicUrl: getOptionalEnv('API_PUBLIC_URL', 'http://localhost:4000'),
  webOrigin: getOptionalEnv('WEB_ORIGIN', 'http://localhost:3000'),
  databaseUrl: getOptionalEnv('DATABASE_URL', defaultDatabaseUrl)
};
