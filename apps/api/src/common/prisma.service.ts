import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  databaseAvailable = false;

  async onModuleInit() {
    try {
      if (!process.env.DATABASE_URL) {
        console.warn('DATABASE_URL is not set. Running the API in local fallback mode without a live Prisma database.');
        return;
      }

      await this.$connect();
      this.databaseAvailable = true;
    } catch (error) {
      this.databaseAvailable = false;
      console.warn('Prisma database unavailable; continuing in local fallback mode.', error instanceof Error ? error.message : error);
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch (error) {
      console.warn('Prisma disconnect warning.', error instanceof Error ? error.message : error);
    }
  }
}
