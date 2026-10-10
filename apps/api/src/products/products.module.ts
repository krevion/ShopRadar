import { Body, Controller, Delete, ForbiddenException, Get, Injectable, Module, NotFoundException, Param, Patch, Post, Query, Req, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../common/prisma.service';

class ProductQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

class CreateProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  category!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price!: number;

  @IsInt()
  @Min(0)
  @Max(1000000)
  stock!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000000)
  stock?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

type ProductRequest = Request & { user: AuthenticatedUser };
const approvedShopFilter = { isActive: true, seller: { is: { status: 'APPROVED' as const, isVerified: true } } };

@Injectable()
class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: string, limit = 100) {
    this.requireDatabase();
    const q = query?.trim();
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        shop: { is: approvedShopFilter },
        ...(q ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { category: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { shop: { is: { name: { contains: q, mode: 'insensitive' } } } }
          ]
        } : {})
      },
      include: { shop: { select: { id: true, name: true, city: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    return products.map((product) => ({ ...product, price: Number(product.price), shop: product.shop.name, shopId: product.shop.id, city: product.shop.city }));
  }

  async getFeatured() {
    return this.findAll(undefined, 8);
  }

  async findMine(user: AuthenticatedUser) {
    const shopId = await this.getSellerShopId(user);
    const products = await this.prisma.product.findMany({
      where: { shopId },
      include: { shop: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
    return products.map((product) => ({ ...product, price: Number(product.price), shop: product.shop.name, shopId: product.shop.id }));
  }

  async create(user: AuthenticatedUser, dto: CreateProductDto) {
    const shopId = await this.getSellerShopId(user);
    const slugBase = slugify(dto.name).slice(0, 80) || 'product';
    const product = await this.prisma.product.create({
      data: {
        shopId,
        name: dto.name.trim(),
        slug: `${slugBase}-${randomUUID().slice(0, 8)}`,
        category: dto.category.trim(),
        price: dto.price,
        stock: dto.stock,
        description: dto.description?.trim() || null
      }
    });
    return { ...product, price: Number(product.price) };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateProductDto) {
    const shopId = await this.getSellerShopId(user);
    const product = await this.prisma.product.findFirst({ where: { id, shopId, isActive: true } });
    if (!product) throw new NotFoundException('Product was not found in your shop.');
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.category !== undefined ? { category: dto.category.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {})
      }
    });
    return { ...updated, price: Number(updated.price) };
  }

  async remove(user: AuthenticatedUser, id: string) {
    const shopId = await this.getSellerShopId(user);
    const result = await this.prisma.product.updateMany({ where: { id, shopId, isActive: true }, data: { isActive: false } });
    if (result.count === 0) throw new NotFoundException('Product was not found in your shop.');
    return { deleted: true };
  }

  private async getSellerShopId(user: AuthenticatedUser) {
    this.requireDatabase();
    if (user.role !== 'SELLER') throw new ForbiddenException('A seller account is required to manage products.');
    const account = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { active: true, sellerProfile: { select: { shop: { select: { id: true } } } } }
    });
    if (!account?.active) throw new ForbiddenException('This account is not active.');
    const shopId = account.sellerProfile?.shop?.id;
    if (!shopId) throw new ForbiddenException('Register a seller profile before managing products.');
    return shopId;
  }

  private requireDatabase() {
    if (!this.prisma.databaseAvailable) throw new ServiceUnavailableException('Product data is unavailable while the database is offline.');
  }
}

@Controller('products')
class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query.q);
  }

  @Get('featured')
  getFeatured() {
    return this.productsService.getFeatured();
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  findMine(@Req() request: ProductRequest) {
    return this.productsService.findMine(request.user);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() request: ProductRequest, @Body() dto: CreateProductDto) {
    return this.productsService.create(request.user, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Req() request: ProductRequest, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(request.user, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Req() request: ProductRequest, @Param('id') id: string) {
    return this.productsService.remove(request.user, id);
  }
}

function slugify(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

@Module({
  controllers: [ProductsController],
  providers: [ProductsService]
})
export class ProductsModule {}
