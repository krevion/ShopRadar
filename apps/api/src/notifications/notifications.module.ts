import { Controller, ForbiddenException, Get, Injectable, Module, NotFoundException, Param, Patch, Req, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../common/prisma.service';

type NotificationRequest = Request & { user: AuthenticatedUser };

@Injectable()
class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthenticatedUser) {
    await this.requireActiveUser(user);
    const items = await this.prisma.notification.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    return { unread: items.filter((item) => item.readAt === null).length, items };
  }

  async markRead(user: AuthenticatedUser, id: string) {
    await this.requireActiveUser(user);
    const result = await this.prisma.notification.updateMany({
      where: { id, userId: user.sub, readAt: null },
      data: { readAt: new Date() }
    });
    if (result.count === 0) {
      const existing = await this.prisma.notification.findFirst({ where: { id, userId: user.sub }, select: { id: true } });
      if (!existing) throw new NotFoundException('Notification was not found.');
    }
    return this.prisma.notification.findFirst({ where: { id, userId: user.sub } });
  }

  private async requireActiveUser(user: AuthenticatedUser) {
    if (!this.prisma.databaseAvailable) throw new ServiceUnavailableException('Notifications are unavailable while the database is offline.');
    const account = await this.prisma.user.findUnique({ where: { id: user.sub }, select: { active: true } });
    if (!account?.active) throw new ForbiddenException('This account is not active.');
  }
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Req() request: NotificationRequest) {
    return this.notificationsService.findAll(request.user);
  }

  @Patch(':id/read')
  markRead(@Req() request: NotificationRequest, @Param('id') id: string) {
    return this.notificationsService.markRead(request.user, id);
  }
}

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, JwtAuthGuard]
})
export class NotificationsModule {}
