import { Controller, Get, Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    try {
      return await this.prisma.user.findMany({
        select: {
          id: true,
          email: true,
          role: true,
          active: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch {
      return [];
    }
  }
}

@Controller('users')
class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService]
})
export class UsersModule {}
