import { Body, ConflictException, Controller, ForbiddenException, Get, Module, NotFoundException, Post, Req, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type { Request } from 'express';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../common/prisma.service';

class RegisterSellerProfileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  shopName!: string;

  @IsString()
  @MaxLength(500)
  bio = '';
}

class CreateSellerMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  body!: string;
}

const defaultSellers = [
  {
    id: 'seller-1',
    name: 'Patricia Wanjiku',
    business: 'Fresh Harvest',
    verified: true,
    sales: 176,
    status: 'APPROVED',
    subscription: 'KSh 1,000/month',
    email: 'patricia@freshharvest.co.ke'
  },
  {
    id: 'seller-2',
    name: 'Owen Kariuki',
    business: 'Smart Home Kenya',
    verified: true,
    sales: 293,
    status: 'APPROVED',
    subscription: 'KSh 1,000/month',
    email: 'owen@smarthome.co.ke'
  },
  {
    id: 'seller-3',
    name: 'Miriam Achieng',
    business: 'Mia Essentials',
    verified: false,
    sales: 91,
    status: 'PENDING',
    subscription: 'Free first month',
    email: 'miriam@miaessentials.co.ke'
  }
];

class SellersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    try {
      const sellers = await this.prisma.sellerProfile.findMany({
        include: {
          user: { select: { email: true } },
          shop: true
        },
        orderBy: { createdAt: 'desc' }
      });

      if (sellers.length > 0) {
        return sellers.map((seller) => ({
          id: seller.id,
          name: seller.user.email.split('@')[0] || seller.shopName,
          business: seller.shop?.name ?? seller.shopName,
          verified: seller.isVerified,
          sales: 0,
          status: seller.status,
          subscription: 'KSh 1,000/month',
          email: seller.user.email
        }));
      }

      return defaultSellers;
    } catch {
      return defaultSellers;
    }
  }

  async register(user: AuthenticatedUser, dto: RegisterSellerProfileDto) {
    if (user.role !== 'SELLER') {
      throw new ForbiddenException('A seller account is required.');
    }
    await this.requireActiveUser(user);

    const existing = await this.prisma.sellerProfile.findUnique({ where: { userId: user.sub } });
    if (existing) {
      throw new ConflictException('A seller profile is already registered for this account.');
    }

    const profile = await this.prisma.sellerProfile.create({
      data: {
        userId: user.sub,
        shopName: dto.shopName.trim(),
        bio: dto.bio.trim() || null,
        status: 'PENDING',
        isVerified: false
      }
    });

    return {
      id: profile.id,
      shopName: profile.shopName,
      status: profile.status,
      isVerified: profile.isVerified
    };
  }

  async analytics(user: AuthenticatedUser) {
    if (user.role !== 'SELLER') {
      throw new ForbiddenException('A seller account is required to view seller analytics.');
    }
    await this.requireActiveUser(user, 'Seller analytics are unavailable because the database is offline.');

    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId: user.sub },
      select: {
        videos: {
          select: { id: true, title: true, category: true, views: true, likes: true, comments: true, createdAt: true },
          orderBy: { createdAt: 'desc' }
        },
        messages: {
          select: {
            id: true,
            body: true,
            createdAt: true,
            sender: { select: { email: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });
    if (!profile) {
      throw new NotFoundException('Register a seller profile to see video analytics.');
    }

    return {
      videoCount: profile.videos.length,
      totalViews: profile.videos.reduce((total, video) => total + video.views, 0),
      totalLikes: profile.videos.reduce((total, video) => total + video.likes, 0),
      totalComments: profile.videos.reduce((total, video) => total + video.comments, 0),
      videos: profile.videos,
      messages: profile.messages.map((message) => ({
        id: message.id,
        body: message.body,
        sender: message.sender.email.split('@')[0],
        createdAt: message.createdAt
      }))
    };
  }

  async toggleFavorite(user: AuthenticatedUser, sellerProfileId: string) {
    this.requireDatabase();
    const account = await this.prisma.user.findUnique({ where: { id: user.sub }, select: { active: true } });
    if (!account?.active) throw new ForbiddenException('This account is not active.');

    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerProfileId },
      select: { id: true, userId: true }
    });
    if (!seller) throw new NotFoundException('Seller was not found.');
    if (seller.userId === user.sub) throw new ForbiddenException('You cannot favourite your own seller profile.');

    const composite = { userId_sellerProfileId: { userId: user.sub, sellerProfileId } };
    const existing = await this.prisma.sellerFavorite.findUnique({ where: composite });
    if (existing) {
      await this.prisma.sellerFavorite.delete({ where: { id: existing.id } });
      return { favorited: false };
    }
    await this.prisma.sellerFavorite.create({ data: { userId: user.sub, sellerProfileId } });
    return { favorited: true };
  }

  async findFavorites(user: AuthenticatedUser) {
    this.requireDatabase();
    const account = await this.prisma.user.findUnique({ where: { id: user.sub }, select: { active: true } });
    if (!account?.active) throw new ForbiddenException('This account is not active.');
    const favorites = await this.prisma.sellerFavorite.findMany({
      where: { userId: user.sub },
      select: { sellerProfile: { select: { shopName: true } } }
    });
    return favorites.map((favorite) => favorite.sellerProfile.shopName);
  }

  async sendMessage(user: AuthenticatedUser, sellerProfileId: string, body: string) {
    this.requireDatabase();
    const account = await this.prisma.user.findUnique({ where: { id: user.sub }, select: { active: true } });
    if (!account?.active) throw new ForbiddenException('This account is not active.');
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerProfileId },
      select: { id: true, userId: true }
    });
    if (!seller) throw new NotFoundException('Seller was not found.');
    if (seller.userId === user.sub) throw new ForbiddenException('You cannot message your own seller profile.');
    const message = await this.prisma.sellerMessage.create({
      data: { senderId: user.sub, sellerProfileId, body: body.trim() }
    });
    return { id: message.id, body: message.body, createdAt: message.createdAt };
  }

  async getMessages(user: AuthenticatedUser, sellerProfileId: string) {
    await this.requireActiveUser(user);
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerProfileId },
      select: { userId: true }
    });
    if (!seller) throw new NotFoundException('Seller was not found.');
    const messages = await this.prisma.sellerMessage.findMany({
      where: {
        sellerProfileId,
        ...(seller.userId === user.sub ? {} : { senderId: user.sub })
      },
      include: { sender: { select: { email: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100
    });
    return messages.map((message) => ({
      id: message.id,
      body: message.body,
      sender: message.sender.email.split('@')[0],
      createdAt: message.createdAt
    }));
  }

  private requireDatabase(message = 'Seller interaction is unavailable while the database is offline.') {
    if (!this.prisma.databaseAvailable) {
      throw new ServiceUnavailableException(message);
    }
  }

  private async requireActiveUser(user: AuthenticatedUser, unavailableMessage?: string) {
    this.requireDatabase(unavailableMessage);
    const account = await this.prisma.user.findUnique({ where: { id: user.sub }, select: { active: true } });
    if (!account?.active) throw new ForbiddenException('This account is not active.');
  }
}

@Controller('sellers')
class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  @Get()
  findAll() {
    return this.sellersService.findAll();
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  analytics(@Req() request: Request & { user: AuthenticatedUser }) {
    return this.sellersService.analytics(request.user);
  }

  @Post('profile')
  @UseGuards(JwtAuthGuard)
  register(@Req() request: Request & { user: AuthenticatedUser }, @Body() dto: RegisterSellerProfileDto) {
    return this.sellersService.register(request.user, dto);
  }

  @Post(':id/favorite')
  @UseGuards(JwtAuthGuard)
  favorite(@Req() request: Request & { user: AuthenticatedUser; params: { id: string } }) {
    return this.sellersService.toggleFavorite(request.user, request.params.id);
  }

  @Get('favorites')
  @UseGuards(JwtAuthGuard)
  favorites(@Req() request: Request & { user: AuthenticatedUser }) {
    return this.sellersService.findFavorites(request.user);
  }

  @Post(':id/messages')
  @UseGuards(JwtAuthGuard)
  message(
    @Req() request: Request & { user: AuthenticatedUser; params: { id: string } },
    @Body() dto: CreateSellerMessageDto
  ) {
    return this.sellersService.sendMessage(request.user, request.params.id, dto.body);
  }

  @Get(':id/messages')
  @UseGuards(JwtAuthGuard)
  messages(@Req() request: Request & { user: AuthenticatedUser; params: { id: string } }) {
    return this.sellersService.getMessages(request.user, request.params.id);
  }
}

@Module({
  controllers: [SellersController],
  providers: [SellersService, PrismaService]
})
export class SellersModule {}
