import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { mkdirSync } from 'fs';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { apiConfig } from './config/env';

async function bootstrap() {
  mkdirSync(apiConfig.uploadsDirectory, { recursive: true });
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
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
    response.setHeader('Referrer-Policy', 'no-referrer');
    if (apiConfig.nodeEnv === 'production') {
      response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
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

bootstrap().catch((error: unknown) => {
  console.error('ShopRadar API failed to start.', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
