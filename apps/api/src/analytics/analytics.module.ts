import { Body, Controller, HttpCode, HttpException, HttpStatus, Injectable, Module, Post, Req, ServiceUnavailableException } from '@nestjs/common';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import type { Request } from 'express';
import { PrismaService } from '../common/prisma.service';

class RecordPageViewDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  @Matches(/^\/[a-zA-Z0-9/_-]*$/)
  path!: string;
}

type RequestWithIp = Request & { ip?: string };

@Injectable()
class AnalyticsService {
  private readonly requests = new Map<string, { count: number; resetAt: number }>();
  private readonly limit = 120;
  private readonly windowMs = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  async recordPageView(path: string, ip: string) {
    if (path === '/admin' || path.startsWith('/admin/')) return { recorded: false };
    this.checkRateLimit(ip);
    if (!this.prisma.databaseAvailable) {
      throw new ServiceUnavailableException('Page analytics are unavailable while the database is offline.');
    }

    await this.prisma.sitePageView.create({ data: { path } });
    return { recorded: true };
  }

  private checkRateLimit(ip: string) {
    const now = Date.now();
    if (this.requests.size > 2_000) {
      for (const [key, bucket] of this.requests) {
        if (bucket.resetAt <= now) this.requests.delete(key);
      }
    }

    const bucket = this.requests.get(ip);
    if (!bucket || bucket.resetAt <= now) {
      this.requests.set(ip, { count: 1, resetAt: now + this.windowMs });
      return;
    }
    if (bucket.count >= this.limit) {
      throw new HttpException('Page analytics are receiving too many requests.', HttpStatus.TOO_MANY_REQUESTS);
    }
    bucket.count += 1;
  }
}

@Controller('analytics')
class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('page-view')
  @HttpCode(HttpStatus.ACCEPTED)
  recordPageView(@Body() dto: RecordPageViewDto, @Req() request: RequestWithIp) {
    return this.analyticsService.recordPageView(dto.path, request.ip ?? 'unknown');
  }
}

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService]
})
export class AnalyticsModule {}
