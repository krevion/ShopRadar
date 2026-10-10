import { Body, ConflictException, Controller, ForbiddenException, Get, Module, NotFoundException, Patch, Post, Req, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { IsNumber, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { randomUUID } from 'crypto';
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

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  locationLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  buildingName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  roomNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  street?: string;
}

class UpdateSellerLocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  locationLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  buildingName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  roomNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  street?: string;
}

class CreateSellerMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  body!: string;
}

class SellersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    this.requireDatabase('Seller directory is unavailable while the database is offline.');
    const sellers = await this.prisma.sellerProfile.findMany({
      where: { status: 'APPROVED', isVerified: true },
      include: { shop: true },
      orderBy: { createdAt: 'desc' },
      take: 200
    });

    return sellers.map((seller) => ({
      id: seller.id,
      name: seller.shop?.name ?? seller.shopName,
      business: seller.shop?.name ?? seller.shopName,
      locationLabel: seller.locationLabel,
      buildingName: seller.buildingName,
      roomNumber: seller.roomNumber,
      street: seller.street,
      latitude: seller.latitude,
      longitude: seller.longitude,
      verified: seller.isVerified,
      status: seller.status
    }));
  }

  async findOne(id: string) {
    this.requireDatabase('Seller profiles are unavailable while the database is offline.');
    const seller = await this.prisma.sellerProfile.findFirst({
      where: { id, status: 'APPROVED', isVerified: true },
      include: { shop: true }
    });
    if (!seller) throw new NotFoundException('Seller was not found.');
    return {
      id: seller.id,
      name: seller.shop?.name ?? seller.shopName,
      shopName: seller.shop?.name ?? seller.shopName,
      bio: seller.bio,
      locationLabel: seller.locationLabel,
      buildingName: seller.buildingName,
      roomNumber: seller.roomNumber,
      street: seller.street,
      latitude: seller.latitude,
      longitude: seller.longitude,
      verified: seller.isVerified,
      status: seller.status
    };
  }

  async findCurrent(user: AuthenticatedUser) {
    if (user.role !== 'SELLER') throw new ForbiddenException('A seller account is required.');
    await this.requireActiveUser(user);
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId: user.sub },
      select: { shopName: true, bio: true, locationLabel: true, buildingName: true, roomNumber: true, street: true, latitude: true, longitude: true }
    });
    if (!seller) throw new NotFoundException('Register your seller profile before adding a shop location.');
    return seller;
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

    const shopName = dto.shopName.trim();
    const bio = dto.bio.trim();
    const locationLabel = dto.locationLabel?.trim() || null;
    const buildingName = dto.buildingName?.trim() || null;
    const roomNumber = dto.roomNumber?.trim() || null;
    const street = dto.street?.trim() || null;
    const profile = await this.prisma.sellerProfile.create({
      data: {
        userId: user.sub,
        shopName,
        bio: bio || null,
        locationLabel,
        buildingName,
        roomNumber,
        street,
        latitude: dto.latitude,
        longitude: dto.longitude,
        status: 'PENDING',
        isVerified: false,
        shop: {
          create: {
            name: shopName,
            slug: `${slugify(shopName).slice(0, 80) || 'shop'}-${randomUUID().slice(0, 8)}`,
            description: bio || null,
            address: formatShopAddress({ buildingName, roomNumber, street, locationLabel })
          }
        }
      },
      include: { shop: { select: { id: true, slug: true } } }
    });

    return {
      id: profile.id,
      shopName: profile.shopName,
      shopId: profile.shop?.id ?? null,
      status: profile.status,
      isVerified: profile.isVerified
    };
  }

  async updateLocation(user: AuthenticatedUser, dto: UpdateSellerLocationDto) {
    if (user.role !== 'SELLER') throw new ForbiddenException('A seller account is required.');
    await this.requireActiveUser(user);
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId: user.sub },
      select: { id: true, buildingName: true, roomNumber: true, street: true }
    });
    if (!profile) throw new NotFoundException('Register your seller profile before adding a shop location.');
    const locationLabel = dto.locationLabel?.trim() || null;
    const buildingName = dto.buildingName === undefined ? profile.buildingName : dto.buildingName?.trim() || null;
    const roomNumber = dto.roomNumber === undefined ? profile.roomNumber : dto.roomNumber?.trim() || null;
    const street = dto.street === undefined ? profile.street : dto.street?.trim() || null;
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.sellerProfile.update({
        where: { id: profile.id },
        data: { latitude: dto.latitude, longitude: dto.longitude, locationLabel, buildingName, roomNumber, street },
        select: { latitude: true, longitude: true, locationLabel: true, buildingName: true, roomNumber: true, street: true }
      });
      await transaction.shop.updateMany({
        where: { sellerId: profile.id },
        data: { address: formatShopAddress({ buildingName, roomNumber, street, locationLabel }) }
      });
      return updated;
    });
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
    const sender = await this.prisma.user.findUnique({ where: { id: user.sub }, select: { email: true } });
    const message = await this.prisma.$transaction(async (transaction) => {
      const createdMessage = await transaction.sellerMessage.create({
        data: { senderId: user.sub, sellerProfileId, body: body.trim() }
      });
      await transaction.notification.create({
        data: {
          userId: seller.userId,
          type: 'SELLER_MESSAGE',
          title: 'New shop message',
          body: `${sender?.email.split('@')[0] ?? 'A shopper'} sent you a message.`
        }
      });
      return createdMessage;
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

function slugify(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function formatShopAddress(location: {
  buildingName?: string | null;
  roomNumber?: string | null;
  street?: string | null;
  locationLabel?: string | null;
}) {
  return [
    location.buildingName,
    location.roomNumber ? `Room ${location.roomNumber}` : null,
    location.street,
    location.locationLabel
  ].map((part) => part?.trim()).filter(Boolean).join(', ') || null;
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

  @Patch('location')
  @UseGuards(JwtAuthGuard)
  updateLocation(@Req() request: Request & { user: AuthenticatedUser }, @Body() dto: UpdateSellerLocationDto) {
    return this.sellersService.updateLocation(request.user, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  findCurrent(@Req() request: Request & { user: AuthenticatedUser }) {
    return this.sellersService.findCurrent(request.user);
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

  @Get(':id')
  findOne(@Req() request: Request & { params: { id: string } }) {
    return this.sellersService.findOne(request.params.id);
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
  providers: [SellersService]
})
export class SellersModule {}
