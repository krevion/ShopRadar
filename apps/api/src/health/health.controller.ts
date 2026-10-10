import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'shopradar-api',
      timestamp: new Date().toISOString()
    };
  }

  @Get('ready')
  async getReady() {
    if (!(await this.prisma.isReady())) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        service: 'shopradar-api',
        database: 'unavailable'
      });
    }

    return {
      status: 'ready',
      service: 'shopradar-api',
      database: 'available',
      timestamp: new Date().toISOString()
    };
  }
}
