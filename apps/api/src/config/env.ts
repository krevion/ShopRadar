import dotenv from 'dotenv';
import { isAbsolute, resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../../../.env') });

export type MpesaEnvironment = 'sandbox' | 'production';

const getOptionalEnv = (key: string, fallback: string): string => process.env[key]?.trim() || fallback;

const nodeEnv = process.env.NODE_ENV?.trim() || 'development';
const isProduction = nodeEnv === 'production';
const defaultDatabaseUrl = 'postgresql://postgres:postgres@localhost:5432/shopradar';
const databaseUrl = process.env.DATABASE_URL?.trim();

if (isProduction && !databaseUrl) {
  throw new Error('DATABASE_URL must be configured in production.');
}
if (databaseUrl && !/^postgres(ql)?:\/\//i.test(databaseUrl)) {
  throw new Error('DATABASE_URL must use the PostgreSQL connection URL format.');
}

if (!databaseUrl && !isProduction) {
  process.env.DATABASE_URL = defaultDatabaseUrl;
}

const jwtSecret = process.env.JWT_SECRET?.trim();
if (isProduction && (!jwtSecret || jwtSecret.length < 32 || /replace-with|local-dev|changeme/i.test(jwtSecret))) {
  throw new Error('JWT_SECRET must be a unique secret with at least 32 characters in production.');
}
const jwtExpiresIn = process.env.JWT_EXPIRES_IN?.trim() || '7d';
if (!/^\d+(ms|s|m|h|d|w|y)$/.test(jwtExpiresIn)) {
  throw new Error('JWT_EXPIRES_IN must be a duration such as 15m or 7d.');
}

const configuredPort = Number(
  isProduction
    ? process.env.PORT ?? process.env.API_PORT ?? 4000
    : process.env.API_PORT ?? 4000
);
if (!Number.isInteger(configuredPort) || configuredPort < 1 || configuredPort > 65535) {
  throw new Error('API_PORT or PORT must be a valid TCP port.');
}

const webOrigins = (process.env.WEB_ORIGIN ?? 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
if (isProduction && (!process.env.WEB_ORIGIN || webOrigins.length === 0 || webOrigins.some((origin) => {
  try {
    const parsed = new URL(origin);
    return parsed.protocol !== 'https:' || parsed.origin !== origin;
  } catch {
    return true;
  }
}))) {
  throw new Error('WEB_ORIGIN must contain HTTPS origins in production.');
}

export const mpesaConfig = {
  consumerKey: getOptionalEnv('MPESA_CONSUMER_KEY', 'local-dev-consumer-key'),
  consumerSecret: getOptionalEnv('MPESA_CONSUMER_SECRET', 'local-dev-consumer-secret'),
  shortCode: getOptionalEnv('MPESA_SHORTCODE', '174379'),
  passKey: getOptionalEnv('MPESA_PASSKEY', 'local-dev-passkey'),
  environment: (process.env.MPESA_ENVIRONMENT ?? 'sandbox') as MpesaEnvironment,
  callbackUrl: process.env.MPESA_CALLBACK_URL ?? 'http://localhost:4000/api/payments/mpesa/callback'
};

if (mpesaConfig.environment !== 'sandbox' && mpesaConfig.environment !== 'production') {
  throw new Error('MPESA_ENVIRONMENT must be either sandbox or production.');
}

const paymentsEnabled = process.env.PAYMENTS_ENABLED === 'true';
if (isProduction && paymentsEnabled) {
  const missingCredentials = [
    process.env.MPESA_CONSUMER_KEY,
    process.env.MPESA_CONSUMER_SECRET,
    process.env.MPESA_SHORTCODE,
    process.env.MPESA_PASSKEY
  ].some((value) => !value?.trim() || /your-|local-dev|replace-me/i.test(value));
  let callbackIsHttps = false;
  try {
    callbackIsHttps = new URL(mpesaConfig.callbackUrl).protocol === 'https:';
  } catch {
    callbackIsHttps = false;
  }
  if (missingCredentials || !callbackIsHttps) {
    throw new Error('M-Pesa payments require real Safaricom credentials and a public HTTPS callback URL.');
  }
}

const publicUrl = getOptionalEnv('API_PUBLIC_URL', 'http://localhost:4000').replace(/\/$/, '');
if (isProduction) {
  let validPublicOrigin = false;
  try {
    const parsed = new URL(publicUrl);
    validPublicOrigin = parsed.protocol === 'https:' && parsed.origin === publicUrl;
  } catch {
    validPublicOrigin = false;
  }
  if (!validPublicOrigin) {
    throw new Error('API_PUBLIC_URL must be the public HTTPS origin of the API in production.');
  }
}

const configuredUploadsDirectory = process.env.UPLOADS_DIR?.trim();
if (isProduction && (!configuredUploadsDirectory || !isAbsolute(configuredUploadsDirectory))) {
  throw new Error('UPLOADS_DIR must be an absolute path on persistent storage in production.');
}

export const apiConfig = {
  port: configuredPort,
  nodeEnv,
  jwtSecret: jwtSecret || 'local-dev-secret',
  jwtExpiresIn,
  publicUrl,
  webOrigins,
  uploadsDirectory: resolve(configuredUploadsDirectory || resolve(__dirname, '../../../../uploads/videos')),
  databaseUrl: databaseUrl || defaultDatabaseUrl,
  paymentsEnabled
};
