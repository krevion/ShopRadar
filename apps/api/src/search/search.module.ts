import { Controller, Get, Injectable, Module, Query, ServiceUnavailableException } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PrismaService } from '../common/prisma.service';
import { ResponseCache } from '../common/response-cache';

class SearchQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

@Injectable()
class SearchService {
  constructor(private readonly prisma: PrismaService, private readonly cache: ResponseCache) {}

  async search(keyword?: string) {
    if (!this.prisma.databaseAvailable) throw new ServiceUnavailableException('Search is unavailable while the database is offline.');
    const q = keyword?.trim();
    if (!q) return [];

    return this.cache.getOrSet(`public:search:${q.toLowerCase()}`, 10_000, async () => {
      const [products, shops, sellers] = await Promise.all([
        this.prisma.product.findMany({
          where: {
            isActive: true,
            shop: { is: { isActive: true, seller: { is: { status: 'APPROVED', isVerified: true } } } },
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { category: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } }
            ]
          },
          select: {
            id: true,
            name: true,
            category: true,
            shop: {
              select: {
                name: true,
                seller: { select: { id: true, shopName: true } }
              }
            }
          },
          take: 12
        }),
        this.prisma.shop.findMany({
          where: {
            isActive: true,
            seller: { is: { status: 'APPROVED', isVerified: true } },
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { city: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } }
            ]
          },
          select: { id: true, name: true, city: true },
          take: 12
        }),
        this.prisma.sellerProfile.findMany({
          where: {
            status: 'APPROVED',
            isVerified: true,
            OR: [
              { shopName: { contains: q, mode: 'insensitive' } },
              { serviceCategory: { contains: q, mode: 'insensitive' } },
              { serviceArea: { contains: q, mode: 'insensitive' } }
            ]
          },
          select: { id: true, shopName: true, providerType: true, serviceCategory: true },
          take: 12
        })
      ]);

      return [
        ...products.map((product) => ({
          id: product.id,
          type: 'product',
          name: product.name,
          category: product.category,
          shop: product.shop.name,
          sellerId: product.shop.seller.id,
          sellerName: product.shop.seller.shopName
        })),
        ...shops.map((shop) => ({ id: shop.id, type: 'shop', name: shop.name, city: shop.city })),
        ...sellers.map((seller) => ({
          id: seller.id,
          type: seller.providerType === 'SERVICE_PROVIDER' ? 'service_provider' : 'seller',
          name: seller.shopName,
          category: seller.serviceCategory ?? undefined
        }))
      ].map((result) => ({ ...result, match: score(result.name, q) }))
        .sort((a, b) => b.match - a.match)
        .slice(0, 20);
    });
  }
}

@Controller('search')
class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@Query() query: SearchQueryDto) {
    return this.searchService.search(query.q);
  }
}

function score(name: string, query: string) {
  const normalizedName = name.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  if (normalizedName === normalizedQuery) return 100;
  if (normalizedName.startsWith(normalizedQuery)) return 90;
  return 75;
}

@Module({ controllers: [SearchController], providers: [SearchService] })
export class SearchModule {}
