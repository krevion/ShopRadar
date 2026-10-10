import { Controller, Get, Injectable, Module, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AdminAuthGuard } from '../auth/admin-auth.guard';

@Injectable()
class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    if (!this.prisma.databaseAvailable) {
      throw new ServiceUnavailableException('User records are unavailable while the database is offline.');
    }
    return this.prisma.user.findMany({
      select: { id: true, email: true, role: true, active: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
  }
}

@Controller('users')
@UseGuards(AdminAuthGuard)
class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}

@Module({
  controllers: [UsersController],
  providers: [UsersService, AdminAuthGuard]
})
export class UsersModule {}
