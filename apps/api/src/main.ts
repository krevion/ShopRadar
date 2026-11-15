import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import { mkdirSync } from 'fs';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { apiConfig } from './config/env';
import { ApiRequestLimiter } from './common/api-request-limiter';

const nonPublicSellerRoutes = new Set(['analytics', 'favorites', 'jobs', 'me', 'profile', 'location']);

async function bootstrap() {
  mkdirSync(apiConfig.uploadsDirectory, { recursive: true });
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(compression());
  app.setGlobalPrefix('api');
  app.set('trust proxy', apiConfig.trustProxyHops);
  const requestLimiter = new ApiRequestLimiter();
  app.use((request: Request, response: Response, next: NextFunction) => {
    requestLimiter.middleware(request, response, next);
  });
  app.enableCors({
    origin: (origin, callback) => callback(null, !origin || apiConfig.webOrigins.includes(origin)),
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600
  });
  app.disable('x-powered-by');
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (apiConfig.nodeEnv === 'production') {
      response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (!request.path.startsWith('/api/')) {
      next();
      return;
    }
    if (request.headers.authorization || request.method !== 'GET' || !isPublicCacheablePath(request.path)) {
      response.setHeader('Cache-Control', 'private, no-store');
    } else {
      response.setHeader('Cache-Control', 'public, max-age=5, stale-while-revalidate=10');
    }
    next();
  });
  app.useStaticAssets(apiConfig.uploadsDirectory, { prefix: '/uploads/videos/' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  const port = apiConfig.port;
  await app.listen(port);

  console.log(`ShopRadar API listening on port ${port}`);
}

function isPublicCacheablePath(path: string) {
  const isSellerProfile = /^\/api\/sellers\/[^/]+$/.test(path)
    && !nonPublicSellerRoutes.has(path.slice('/api/sellers/'.length));
  return path === '/api/products'
    || path === '/api/products/featured'
    || path === '/api/categories'
    || path === '/api/shops'
    || path === '/api/shops/nearby'
    || path === '/api/search'
    || path === '/api/sellers'
    || isSellerProfile
    || path === '/api/videos';
}

bootstrap().catch((error: unknown) => {
  console.error('ShopRadar API failed to start.', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
