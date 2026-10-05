import { Controller, Get, Module } from '@nestjs/common';

const adminOverview = {
  sellers: 184,
  listings: 4260,
  revenue: 'KSh 8.4M',
  pendingApprovals: 26
};

class AdminService {
  getOverview() {
    return adminOverview;
  }
}

@Controller('admin')
class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  getOverview() {
    return this.adminService.getOverview();
  }
}

@Module({
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
