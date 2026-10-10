import { Controller, Get, Injectable, Module, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AdminAuthGuard } from '../auth/admin-auth.guard';

@Injectable()
class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    if (!this.prisma.databaseAvailable) throw new ServiceUnavailableException('Reports are unavailable while the database is offline.');
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [newUsers, newOrders, payments, approvedSellers] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
      this.prisma.order.count({ where: { createdAt: { gte: monthAgo } } }),
      this.prisma.payment.aggregate({ where: { status: 'SUCCESSFUL', createdAt: { gte: monthAgo } }, _sum: { amount: true } }),
      this.prisma.sellerProfile.count({ where: { status: 'APPROVED' } })
    ]);

    return [
      { id: 'new-users', title: 'New shoppers · 30 days', value: String(newUsers) },
      { id: 'orders', title: 'Orders · 30 days', value: String(newOrders) },
      { id: 'confirmed-payments', title: 'Confirmed payments · 30 days', value: formatKes(Number(payments._sum.amount ?? 0)) },
      { id: 'approved-sellers', title: 'Approved sellers', value: String(approvedSellers) }
    ];
  }
}

@Controller('reports')
@UseGuards(AdminAuthGuard)
class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  findAll() {
    return this.reportsService.findAll();
  }
}

function formatKes(amount: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount);
}

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, AdminAuthGuard]
})
export class ReportsModule {}
