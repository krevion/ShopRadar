import { Global, Module } from '@nestjs/common';
import { ResponseCache } from './response-cache';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService, ResponseCache],
  exports: [PrismaService, ResponseCache]
})
export class DatabaseModule {}
