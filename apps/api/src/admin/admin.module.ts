import { Body, Controller, ForbiddenException, Get, Injectable, Module, NotFoundException, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { IsBoolean, IsEnum } from 'class-validator';
import { SellerStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { AuthenticatedUser } from '../auth/jwt-auth.guard';
import type { Request } from 'express';

class SetSellerStatusDto {
  @IsEnum(SellerStatus)
  status!: SellerStatus;
}

class SetUserActiveDto {
  @IsBoolean()
  active!: boolean;
}

type AdminRequest = Request & { user: AuthenticatedUser };

@Injectable()
class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [users, sellers, approvedSellers, pendingSellers, shops, products, payments] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.sellerProfile.count(),
      this.prisma.sellerProfile.count({ where: { status: 'APPROVED', isVerified: true } }),
      this.prisma.sellerProfile.count({ where: { status: 'PENDING' } }),
      this.prisma.shop.count({ where: { isActive: true, seller: { is: { status: 'APPROVED', isVerified: true } } } }),
      this.prisma.product.count({ where: { isActive: true, shop: { is: { isActive: true, seller: { is: { status: 'APPROVED', isVerified: true } } } } } }),
      this.prisma.payment.aggregate({ where: { status: 'SUCCESSFUL' }, _sum: { amount: true } })
    ]);

    return {
      users,
      sellers,
      approvedSellers,
      pendingSellers,
      shops,
      products,
      confirmedRevenue: Number(payments._sum.amount ?? 0)
    };
  }

  async getSellers() {
    const sellers = await this.prisma.sellerProfile.findMany({
      include: { user: { select: { email: true } }, shop: true },
      orderBy: { createdAt: 'desc' },
      take: 200
    });

    return sellers.map((seller) => ({
      id: seller.id,
      email: seller.user.email,
      business: seller.shop?.name ?? seller.shopName,
      locationLabel: seller.locationLabel,
      buildingName: seller.buildingName,
      roomNumber: seller.roomNumber,
      street: seller.street,
      status: seller.status,
      verified: seller.isVerified,
      createdAt: seller.createdAt
    }));
  }

  async setSellerStatus(id: string, status: SellerStatus) {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const profile = await transaction.sellerProfile.update({
          where: { id },
          data: { status, isVerified: status === 'APPROVED' },
          select: { id: true, status: true, isVerified: true, userId: true, shopName: true }
        });
        const approved = status === 'APPROVED';
        await transaction.notification.create({
          data: {
            userId: profile.userId,
            type: approved ? 'SELLER_APPROVED' : status === 'REJECTED' ? 'SELLER_REJECTED' : 'SELLER_REVIEW',
            title: approved ? 'Shop profile approved' : status === 'REJECTED' ? 'Shop profile needs updates' : 'Shop profile is under review',
            body: approved
              ? `${profile.shopName} is now visible in ShopRadar.`
              : status === 'REJECTED'
                ? `The ${profile.shopName} profile needs updates before it can be listed.`
                : `The ${profile.shopName} profile is being reviewed.`
          }
        });
        return { id: profile.id, status: profile.status, isVerified: profile.isVerified };
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        throw new NotFoundException('Seller profile was not found.');
      }
      throw error;
    }
  }

  async setUserActive(id: string, active: boolean, adminUserId: string) {
    if (id === adminUserId && !active) {
      throw new ForbiddenException('You cannot deactivate the admin account currently in use.');
    }
    try {
      return await this.prisma.user.update({
        where: { id },
        data: { active },
        select: { id: true, email: true, role: true, active: true }
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        throw new NotFoundException('User was not found.');
      }
      throw error;
    }
  }
}

@Controller('admin')
@UseGuards(AdminAuthGuard)
class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get('sellers')
  getSellers() {
    return this.adminService.getSellers();
  }

  @Patch('sellers/:id/status')
  setSellerStatus(@Param('id') id: string, @Body() dto: SetSellerStatusDto) {
    return this.adminService.setSellerStatus(id, dto.status);
  }

  @Patch('users/:id/active')
  setUserActive(
    @Param('id') id: string,
    @Body() dto: SetUserActiveDto,
    @Req() request: AdminRequest
  ) {
    return this.adminService.setUserActive(id, dto.active, request.user.sub);
  }
}

@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminAuthGuard]
})
export class AdminModule {}
