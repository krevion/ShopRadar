import { Body, Controller, ForbiddenException, Get, Header, HttpException, HttpStatus, Injectable, Module, NotFoundException, Param, Patch, Post, Req, ServiceUnavailableException, UnauthorizedException, UseGuards } from '@nestjs/common';
import { IsBoolean, IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { SellerStatus } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { verifyPassword } from '@shopradar/auth';
import { apiConfig } from '../config/env';
import { PrismaService } from '../common/prisma.service';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { AuthenticatedUser } from '../auth/jwt-auth.guard';
import { ADMIN_TOKEN_AUDIENCE, ADMIN_TOKEN_ISSUER, ADMIN_TOKEN_TTL } from '../auth/token-claims';
import { FailedLoginLimiter } from '../common/failed-login-limiter';
import type { Request } from 'express';

class SetSellerStatusDto {
  @IsEnum(SellerStatus)
  status!: SellerStatus;
}

class SetSellerComplimentaryAccessDto {
  @IsBoolean()
  enabled!: boolean;
}

class SetUserActiveDto {
  @IsBoolean()
  active!: boolean;
}

type AdminRequest = Request & { user: AuthenticatedUser };
type AdminLoginRequest = Request & { ip?: string };

class AdminLoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  password!: string;
}

const ADMIN_SUBJECT = 'shopradar-configured-admin';
@Injectable()
class AdminAuthService {
  private readonly loginLimiter = new FailedLoginLimiter(5, 15 * 60 * 1000);

  constructor(private readonly jwtService: JwtService) {}

  async login(password: string, ip: string) {
    if (!apiConfig.adminPasswordHash) {
      throw new ServiceUnavailableException('Admin sign-in is not configured on this server.');
    }
    this.loginLimiter.assertAllowed(ip);
    const matches = await verifyPassword(password, apiConfig.adminPasswordHash);
    if (!matches) {
      this.loginLimiter.recordFailure(ip);
      throw new UnauthorizedException('The admin password is incorrect.');
    }

    this.loginLimiter.clear(ip);
    const accessToken = await this.jwtService.signAsync(
      { sub: ADMIN_SUBJECT, email: 'site-owner@shopradar.local', role: 'ADMIN' },
      {
        algorithm: 'HS256',
        issuer: ADMIN_TOKEN_ISSUER,
        audience: ADMIN_TOKEN_AUDIENCE,
        expiresIn: ADMIN_TOKEN_TTL
      }
    );
    return { accessToken, tokenType: 'Bearer', expiresIn: ADMIN_TOKEN_TTL };
  }
}

@Controller('admin/auth')
class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  login(@Body() dto: AdminLoginDto, @Req() request: AdminLoginRequest) {
    return this.adminAuthService.login(dto.password, request.ip ?? 'unknown');
  }
}

@Injectable()
class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    if (!this.prisma.databaseAvailable) {
      throw new ServiceUnavailableException('Site analytics are unavailable while the database is offline.');
    }

    const now = new Date();
    const since30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const chartStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29));
    const [
      users,
      customers,
      sellerAccounts,
      activeUsers,
      sellers,
      approvedSellers,
      pendingSellers,
      shops,
      products,
      orders,
      completedOrders,
      payments,
      totalVideoViews,
      videoLikes,
      videoComments,
      sellerFavorites,
      sellerMessages,
      pageViews,
      pageViews30d,
      newUsers30d,
      newCustomers30d,
      newSellers30d,
      newShops30d,
      newProducts30d,
      newOrders30d,
      likes30d,
      comments30d,
      favorites30d,
      messages30d,
      recentCustomers,
      recentSellerProfiles,
      pageViewDays,
      topPageGroups
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.user.count({ where: { role: 'SELLER' } }),
      this.prisma.user.count({ where: { active: true } }),
      this.prisma.sellerProfile.count(),
      this.prisma.sellerProfile.count({ where: { status: 'APPROVED', isVerified: true } }),
      this.prisma.sellerProfile.count({ where: { status: 'PENDING' } }),
      this.prisma.shop.count({ where: { isActive: true, seller: { is: { status: 'APPROVED', isVerified: true } } } }),
      this.prisma.product.count({ where: { isActive: true, shop: { is: { isActive: true, seller: { is: { status: 'APPROVED', isVerified: true } } } } } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'COMPLETED' } }),
      this.prisma.payment.aggregate({ where: { status: 'SUCCESSFUL' }, _sum: { amount: true } }),
      this.prisma.video.aggregate({ _sum: { views: true } }),
      this.prisma.videoLike.count(),
      this.prisma.videoComment.count(),
      this.prisma.sellerFavorite.count(),
      this.prisma.sellerMessage.count(),
      this.prisma.sitePageView.count(),
      this.prisma.sitePageView.count({ where: { createdAt: { gte: since30Days } } }),
      this.prisma.user.count({ where: { createdAt: { gte: since30Days } } }),
      this.prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: since30Days } } }),
      this.prisma.sellerProfile.count({ where: { createdAt: { gte: since30Days } } }),
      this.prisma.shop.count({ where: { createdAt: { gte: since30Days } } }),
      this.prisma.product.count({ where: { createdAt: { gte: since30Days } } }),
      this.prisma.order.count({ where: { createdAt: { gte: since30Days } } }),
      this.prisma.videoLike.count({ where: { createdAt: { gte: since30Days } } }),
      this.prisma.videoComment.count({ where: { createdAt: { gte: since30Days } } }),
      this.prisma.sellerFavorite.count({ where: { createdAt: { gte: since30Days } } }),
      this.prisma.sellerMessage.count({ where: { createdAt: { gte: since30Days } } }),
      this.prisma.user.findMany({ where: { role: 'CUSTOMER', createdAt: { gte: chartStart } }, select: { createdAt: true } }),
      this.prisma.sellerProfile.findMany({ where: { createdAt: { gte: chartStart } }, select: { createdAt: true } }),
      this.prisma.$queryRaw<Array<{ day: string; views: bigint }>>`
        SELECT TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS "day", COUNT(*) AS "views"
        FROM "SitePageView"
        WHERE "createdAt" >= ${chartStart}
        GROUP BY TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      `,
      this.prisma.sitePageView.groupBy({
        by: ['path'],
        where: { createdAt: { gte: since30Days } },
        _count: { _all: true },
        orderBy: { _count: { path: 'desc' } },
        take: 8
      })
    ]);

    const dailyGrowth = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(chartStart.getTime() + index * 24 * 60 * 60 * 1000);
      return { date: date.toISOString().slice(0, 10), pageViews: 0, customers: 0, sellers: 0 };
    });
    const dailyByDate = new Map(dailyGrowth.map((day) => [day.date, day]));
    for (const row of recentCustomers) {
      const day = dailyByDate.get(row.createdAt.toISOString().slice(0, 10));
      if (day) day.customers += 1;
    }
    for (const row of recentSellerProfiles) {
      const day = dailyByDate.get(row.createdAt.toISOString().slice(0, 10));
      if (day) day.sellers += 1;
    }
    for (const row of pageViewDays) {
      const day = dailyByDate.get(row.day);
      if (day) day.pageViews = Number(row.views);
    }

    return {
      generatedAt: now.toISOString(),
      users,
      customers,
      sellerAccounts,
      activeUsers,
      sellers,
      approvedSellers,
      pendingSellers,
      shops,
      products,
      orders,
      completedOrders,
      confirmedRevenue: Number(payments._sum.amount ?? 0),
      pageViews,
      pageViews30d,
      newUsers30d,
      newCustomers30d,
      newSellers30d,
      newShops30d,
      newProducts30d,
      newOrders30d,
      videoViews: totalVideoViews._sum.views ?? 0,
      videoLikes,
      videoComments,
      sellerFavorites,
      sellerMessages,
      likes30d,
      comments30d,
      favorites30d,
      messages30d,
      dailyGrowth,
      topPages: topPageGroups.map((group) => ({ path: group.path, views: group._count._all }))
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
      providerType: seller.providerType,
      serviceCategory: seller.serviceCategory,
      serviceArea: seller.serviceArea,
      contactPhone: seller.contactPhone,
      locationLabel: seller.locationLabel,
      buildingName: seller.buildingName,
      roomNumber: seller.roomNumber,
      street: seller.street,
      status: seller.status,
      verified: seller.isVerified,
      hasComplimentaryAccess: seller.hasComplimentaryAccess,
      complimentaryAccessGrantedAt: seller.complimentaryAccessGrantedAt,
      createdAt: seller.createdAt
    }));
  }

  async setSellerStatus(id: string, status: SellerStatus) {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const profile = await transaction.sellerProfile.update({
          where: { id },
          data: { status, isVerified: status === 'APPROVED' },
          select: { id: true, status: true, isVerified: true, userId: true, shopName: true, providerType: true }
        });
        const approved = status === 'APPROVED';
        const profileType = profile.providerType === 'SERVICE_PROVIDER' ? 'service provider' : 'shop';
        await transaction.notification.create({
          data: {
            userId: profile.userId,
            type: approved ? 'SELLER_APPROVED' : status === 'REJECTED' ? 'SELLER_REJECTED' : 'SELLER_REVIEW',
            title: approved ? `${profileType} profile approved` : status === 'REJECTED' ? `${profileType} profile needs updates` : `${profileType} profile is under review`,
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

  async setSellerComplimentaryAccess(id: string, enabled: boolean) {
    if (!this.prisma.databaseAvailable) {
      throw new ServiceUnavailableException('Seller access cannot be updated while the database is offline.');
    }
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const profile = await transaction.sellerProfile.update({
          where: { id },
          data: {
            hasComplimentaryAccess: enabled,
            complimentaryAccessGrantedAt: enabled ? new Date() : null
          },
          select: { id: true, userId: true, shopName: true, hasComplimentaryAccess: true, complimentaryAccessGrantedAt: true }
        });
        await transaction.notification.create({
          data: {
            userId: profile.userId,
            type: enabled ? 'SELLER_COMPLIMENTARY_ACCESS_GRANTED' : 'SELLER_COMPLIMENTARY_ACCESS_REVOKED',
            title: enabled ? 'Complimentary seller access granted' : 'Complimentary seller access revoked',
            body: enabled
              ? `Your ${profile.shopName} seller account can publish videos without a paid subscription.`
              : `Complimentary subscription access for ${profile.shopName} has been removed. Your free trial or confirmed payments still apply.`
          }
        });
        return {
          id: profile.id,
          hasComplimentaryAccess: profile.hasComplimentaryAccess,
          complimentaryAccessGrantedAt: profile.complimentaryAccessGrantedAt
        };
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

  @Patch('sellers/:id/complimentary-access')
  setSellerComplimentaryAccess(
    @Param('id') id: string,
    @Body() dto: SetSellerComplimentaryAccessDto
  ) {
    return this.adminService.setSellerComplimentaryAccess(id, dto.enabled);
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
  controllers: [AdminController, AdminAuthController],
  providers: [AdminService, AdminAuthService, AdminAuthGuard]
})
export class AdminModule {}
