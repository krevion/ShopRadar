import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'shopradar-api',
      timestamp: new Date().toISOString()
    };
  }

  @Get('ready')
  getReady() {
    return {
      status: 'ready',
      service: 'shopradar-api',
      timestamp: new Date().toISOString()
    };
  }
}
