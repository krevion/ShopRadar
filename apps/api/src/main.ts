import 'dotenv/config';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { apiConfig } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({ origin: apiConfig.webOrigin });
  app.useStaticAssets(join(process.cwd(), 'uploads', 'videos'), { prefix: '/uploads/videos/' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  const port = apiConfig.port;
  await app.listen(port);

  console.log(`ShopRadar API listening on http://localhost:${port}`);
}

bootstrap();
