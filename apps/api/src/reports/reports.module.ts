import { Controller, Get, Module } from '@nestjs/common';

const reports = [
  { id: 'r1', title: 'Sales overview', value: 'KSh 128,400' },
  { id: 'r2', title: 'New shoppers', value: '1,240' },
  { id: 'r3', title: 'Conversion rate', value: '12.8%' }
];

class ReportsService {
  findAll() {
    return reports;
  }
}

@Controller('reports')
class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  findAll() {
    return this.reportsService.findAll();
  }
}

@Module({
  controllers: [ReportsController],
  providers: [ReportsService]
})
export class ReportsModule {}
