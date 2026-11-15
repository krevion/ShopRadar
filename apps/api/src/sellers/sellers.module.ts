import { Body, ConflictException, Controller, Delete, ForbiddenException, Get, Injectable, Module, NotFoundException, Patch, Post, Req, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { IsBoolean, IsEnum, IsNumber, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { EmploymentType, SellerType } from '@prisma/client';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../common/prisma.service';
import { ResponseCache } from '../common/response-cache';

class RegisterSellerProfileDto {
  @IsOptional()
  @IsEnum(SellerType)
  providerType?: SellerType;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(120)
  shopName!: string;

  @ValidateIf((dto: RegisterSellerProfileDto) => dto.providerType === SellerType.SERVICE_PROVIDER)
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(80)
  serviceCategory?: string;

  @ValidateIf((dto: RegisterSellerProfileDto) => dto.providerType === SellerType.SERVICE_PROVIDER)
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(200)
  serviceArea?: string;

  @ValidateIf((dto: RegisterSellerProfileDto) => dto.providerType === SellerType.SERVICE_PROVIDER)
  @IsString()
  @Matches(/^(?:\+?254|0)?[17]\d{8}$/, { message: 'Enter a valid Kenyan mobile number, for example 0712345678.' })
  contactPhone?: string;

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

class CreateJobListingDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(120)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(5000)
  description!: string;

  @IsEnum(EmploymentType)
  employmentType!: EmploymentType;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  salaryRange?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  requirements?: string;
}

class UpdateJobListingStatusDto {
  @IsBoolean()
  isActive!: boolean;
}

@Injectable()
class SellersService {
  constructor(private readonly prisma: PrismaService, private readonly cache: ResponseCache) {}

  async findAll() {
    this.requireDatabase('Seller directory is unavailable while the database is offline.');
    return this.cache.getOrSet('public:sellers', 5_000, async () => {
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
        providerType: seller.providerType,
        serviceCategory: seller.serviceCategory,
        serviceArea: seller.serviceArea,
        locationLabel: seller.locationLabel,
        buildingName: seller.buildingName,
        roomNumber: seller.roomNumber,
        street: seller.street,
        contactPhone: seller.contactPhone,
        latitude: seller.latitude,
        longitude: seller.longitude,
        verified: seller.isVerified,
        status: seller.status
      }));
    });
  }

  async findOne(id: string) {
    this.requireDatabase('Seller profiles are unavailable while the database is offline.');
    return this.cache.getOrSet(`public:seller:${id}`, 5_000, async () => {
      const seller = await this.prisma.sellerProfile.findFirst({
        where: { id, status: 'APPROVED', isVerified: true },
        include: {
          shop: true,
          jobListings: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
          }
        }
      });
      if (!seller) throw new NotFoundException('Seller was not found.');
      return {
        id: seller.id,
        name: seller.shop?.name ?? seller.shopName,
        shopName: seller.shop?.name ?? seller.shopName,
        providerType: seller.providerType,
        serviceCategory: seller.serviceCategory,
        serviceArea: seller.serviceArea,
        contactPhone: seller.contactPhone,
        bio: seller.bio,
        locationLabel: seller.locationLabel,
        buildingName: seller.buildingName,
        roomNumber: seller.roomNumber,
        street: seller.street,
        latitude: seller.latitude,
        longitude: seller.longitude,
        verified: seller.isVerified,
        status: seller.status,
        jobs: seller.jobListings
      };
    });
  }

  async findMyJobs(user: AuthenticatedUser) {
    const profileId = await this.getSellerProfileId(user);
    return this.prisma.jobListing.findMany({
      where: { sellerProfileId: profileId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createJob(user: AuthenticatedUser, dto: CreateJobListingDto) {
    const profileId = await this.getSellerProfileId(user);
    return this.prisma.jobListing.create({
      data: {
        sellerProfileId: profileId,
        title: dto.title.trim(),
        description: dto.description.trim(),
        employmentType: dto.employmentType,
        location: dto.location?.trim() || null,
        salaryRange: dto.salaryRange?.trim() || null,
        requirements: dto.requirements?.trim() || null
      }
    });
  }

  async updateJobStatus(user: AuthenticatedUser, id: string, isActive: boolean) {
    const profileId = await this.getSellerProfileId(user);
    const result = await this.prisma.jobListing.updateMany({
      where: { id, sellerProfileId: profileId },
      data: { isActive }
    });
    if (result.count === 0) throw new NotFoundException('Job listing was not found in your business profile.');
    return this.prisma.jobListing.findUniqueOrThrow({ where: { id } });
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
    const providerType = dto.providerType ?? SellerType.SHOP;
    const serviceCategory = dto.serviceCategory?.trim() || null;
    const serviceArea = dto.serviceArea?.trim() || null;
    const contactPhone = dto.contactPhone ? normalizeKenyanPhone(dto.contactPhone) : null;
    const bio = dto.bio.trim();
    const locationLabel = dto.locationLabel?.trim() || null;
    const buildingName = dto.buildingName?.trim() || null;
    const roomNumber = dto.roomNumber?.trim() || null;
    const street = dto.street?.trim() || null;
    const profile = await this.prisma.sellerProfile.create({
      data: {
        userId: user.sub,
        shopName,
        providerType,
        serviceCategory,
        serviceArea,
        contactPhone,
        bio: bio || null,
        locationLabel,
        buildingName,
        roomNumber,
        street,
        latitude: dto.latitude,
        longitude: dto.longitude,
        status: 'PENDING',
        isVerified: false,
        shop: providerType === SellerType.SHOP ? {
          create: {
            name: shopName,
            slug: `${slugify(shopName).slice(0, 80) || 'shop'}-${randomUUID().slice(0, 8)}`,
            description: bio || null,
            address: formatShopAddress({ buildingName, roomNumber, street, locationLabel })
          }
        } : undefined
      },
      include: { shop: { select: { id: true, slug: true } } }
    });

    return {
      id: profile.id,
      shopName: profile.shopName,
      providerType: profile.providerType,
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

  private async getSellerProfileId(user: AuthenticatedUser) {
    if (user.role !== 'SELLER') throw new ForbiddenException('A seller account is required to manage job listings.');
    await this.requireActiveUser(user);
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId: user.sub },
      select: { id: true }
    });
    if (!profile) throw new NotFoundException('Register a seller profile before managing job listings.');
    return profile.id;
  }
}

function slugify(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function normalizeKenyanPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('254')) return `+${digits}`;
  if (digits.startsWith('0')) return `+254${digits.slice(1)}`;
  return `+254${digits}`;
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

  @Get('jobs/mine')
  @UseGuards(JwtAuthGuard)
  findMyJobs(@Req() request: Request & { user: AuthenticatedUser }) {
    return this.sellersService.findMyJobs(request.user);
  }

  @Post('jobs')
  @UseGuards(JwtAuthGuard)
  createJob(@Req() request: Request & { user: AuthenticatedUser }, @Body() dto: CreateJobListingDto) {
    return this.sellersService.createJob(request.user, dto);
  }

  @Patch('jobs/:id')
  @UseGuards(JwtAuthGuard)
  updateJobStatus(
    @Req() request: Request & { user: AuthenticatedUser; params: { id: string } },
    @Body() dto: UpdateJobListingStatusDto
  ) {
    return this.sellersService.updateJobStatus(request.user, request.params.id, dto.isActive);
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
