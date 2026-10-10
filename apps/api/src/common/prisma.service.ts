import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  databaseAvailable = false;

  async onModuleInit() {
    try {
      if (!process.env.DATABASE_URL) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('DATABASE_URL must be configured before starting the production API.');
        }
        console.warn('DATABASE_URL is not set. Database-backed API routes are unavailable.');
        return;
      }

      await this.$connect();
      this.databaseAvailable = true;
    } catch (error) {
      this.databaseAvailable = false;
      console.error('Prisma database connection failed.', error instanceof Error ? error.message : error);
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }
  }

  async isReady(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      this.databaseAvailable = true;
      return true;
    } catch {
      this.databaseAvailable = false;
      return false;
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
